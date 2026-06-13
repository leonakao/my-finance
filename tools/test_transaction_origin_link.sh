#!/bin/sh

set -eu

PROJECT_URL="http://127.0.0.1:54321"
AUTH_URL="$PROJECT_URL/auth/v1/signup"
REST_URL="$PROJECT_URL/rest/v1/transactions"
PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
TMP_DIR="${TMPDIR:-/tmp}/finance-transaction-origin-link-$$"

mkdir -p "$TMP_DIR"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT INT TERM

signup() {
  email=$1
  output=$2
  status=$(curl -sS -o "$output" -w '%{http_code}' "$AUTH_URL" \
    -X POST \
    -H "apikey: $PUBLISHABLE_KEY" \
    -H "Content-Type: application/json" \
    --data-raw "{\"email\":\"$email\",\"password\":\"Test123456!\"}")

  if [ "$status" != "200" ]; then
    cat "$output" >&2
    echo "Falha ao criar usuario local de teste ($status)." >&2
    exit 1
  fi
}

request() {
  method=$1
  url=$2
  token=$3
  body=$4
  output=$5

  if [ -n "$body" ]; then
    curl -sS -o "$output" -w '%{http_code}' "$url" \
      -X "$method" \
      -H "apikey: $PUBLISHABLE_KEY" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      --data-raw "$body"
    return
  fi

  curl -sS -o "$output" -w '%{http_code}' "$url" \
    -X "$method" \
    -H "apikey: $PUBLISHABLE_KEY" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json"
}

USER_1="$TMP_DIR/user-1.json"
USER_2="$TMP_DIR/user-2.json"
signup "transaction-origin-1-$(date +%s)-$$@example.com" "$USER_1"
signup "transaction-origin-2-$(date +%s)-$$@example.com" "$USER_2"

TOKEN_1=$(jq -r '.access_token // .session.access_token // empty' "$USER_1")
TOKEN_2=$(jq -r '.access_token // .session.access_token // empty' "$USER_2")
USER_ID_1=$(jq -r '.user.id // empty' "$USER_1")
USER_ID_2=$(jq -r '.user.id // empty' "$USER_2")

if [ -z "$TOKEN_1" ] || [ -z "$TOKEN_2" ] || [ -z "$USER_ID_1" ] || [ -z "$USER_ID_2" ]; then
  echo "Falha ao criar usuarios locais de teste." >&2
  exit 1
fi

ANCHOR_PAYLOAD=$(jq -nc \
  --arg userId "$USER_ID_1" \
  '{
    user_id: $userId,
    date: "2026-06-12",
    description: "Emprestimo mae",
    amount: 200,
    type: "Despesa",
    category: "Outros",
    source: "Manual",
    source_kind: "manual"
  }')

STATUS=$(request POST "$REST_URL" "$TOKEN_1" "$ANCHOR_PAYLOAD" "$TMP_DIR/create-anchor.json")
if [ "$STATUS" != "201" ]; then
  cat "$TMP_DIR/create-anchor.json" >&2
  echo "Falha: usuario proprietario nao conseguiu criar transacao principal ($STATUS)." >&2
  exit 1
fi

ANCHOR_ID=$(jq -r '.[0].id // empty' "$TMP_DIR/create-anchor.json")
ANCHOR_IGNORED=$(jq -r '.[0].is_ignored // empty' "$TMP_DIR/create-anchor.json")
ANCHOR_KIND=$(jq -r '.[0].source_kind // empty' "$TMP_DIR/create-anchor.json")

if [ -z "$ANCHOR_ID" ] || [ "$ANCHOR_IGNORED" != "false" ] || [ "$ANCHOR_KIND" != "manual" ]; then
  cat "$TMP_DIR/create-anchor.json" >&2
  echo "Falha: defaults ou retorno da transacao principal vieram incorretos." >&2
  exit 1
fi

CHILD_PAYLOAD=$(jq -nc \
  --arg userId "$USER_ID_1" \
  --arg anchorId "$ANCHOR_ID" \
  '{
    user_id: $userId,
    date: "2026-07-12",
    description: "Emprestimo mae",
    amount: 200,
    type: "Despesa",
    category: "Outros",
    source: "Manual",
    source_kind: "manual_recurring",
    origin_transaction_id: $anchorId
  }')

STATUS=$(request POST "$REST_URL" "$TOKEN_1" "$CHILD_PAYLOAD" "$TMP_DIR/create-child.json")
if [ "$STATUS" != "201" ]; then
  cat "$TMP_DIR/create-child.json" >&2
  echo "Falha: usuario proprietario nao conseguiu criar transacao filha ($STATUS)." >&2
  exit 1
fi

CHILD_ID=$(jq -r '.[0].id // empty' "$TMP_DIR/create-child.json")
CHILD_ORIGIN=$(jq -r '.[0].origin_transaction_id // empty' "$TMP_DIR/create-child.json")

if [ -z "$CHILD_ID" ] || [ "$CHILD_ORIGIN" != "$ANCHOR_ID" ]; then
  cat "$TMP_DIR/create-child.json" >&2
  echo "Falha: transacao filha nao ficou vinculada corretamente." >&2
  exit 1
fi

SELF_REF_PAYLOAD=$(jq -nc \
  --arg userId "$USER_ID_1" \
  --arg txId "11111111-1111-1111-1111-111111111111" \
  '{
    id: $txId,
    user_id: $userId,
    date: "2026-08-12",
    description: "Auto referencia",
    amount: 10,
    type: "Despesa",
    category: "Outros",
    source: "Manual",
    source_kind: "manual_recurring",
    origin_transaction_id: $txId
  }')

STATUS=$(request POST "$REST_URL" "$TOKEN_1" "$SELF_REF_PAYLOAD" "$TMP_DIR/self-ref.json")
if [ "$STATUS" != "400" ]; then
  cat "$TMP_DIR/self-ref.json" >&2
  echo "Falha: auto-referencia deveria ser rejeitada, recebeu $STATUS." >&2
  exit 1
fi

CROSS_USER_PAYLOAD=$(jq -nc \
  --arg userId "$USER_ID_2" \
  --arg anchorId "$ANCHOR_ID" \
  '{
    user_id: $userId,
    date: "2026-07-12",
    description: "Tentativa cruzada",
    amount: 200,
    type: "Despesa",
    category: "Outros",
    source: "Manual",
    source_kind: "manual_recurring",
    origin_transaction_id: $anchorId
  }')

STATUS=$(request POST "$REST_URL" "$TOKEN_2" "$CROSS_USER_PAYLOAD" "$TMP_DIR/cross-user.json")
if [ "$STATUS" != "400" ]; then
  cat "$TMP_DIR/cross-user.json" >&2
  echo "Falha: origin_transaction_id cruzando usuarios deveria ser rejeitado, recebeu $STATUS." >&2
  exit 1
fi

INVALID_SOURCE_KIND=$(printf '%s' "$ANCHOR_PAYLOAD" | jq '.source_kind = "future_magic"')
STATUS=$(request POST "$REST_URL" "$TOKEN_1" "$INVALID_SOURCE_KIND" "$TMP_DIR/invalid-source-kind.json")
if [ "$STATUS" != "400" ]; then
  cat "$TMP_DIR/invalid-source-kind.json" >&2
  echo "Falha: source_kind invalido deveria ser rejeitado, recebeu $STATUS." >&2
  exit 1
fi

STATUS=$(request GET "$REST_URL?id=eq.$ANCHOR_ID" "$TOKEN_2" "" "$TMP_DIR/other-user-read.json")
if [ "$STATUS" != "200" ] || [ "$(jq 'length' "$TMP_DIR/other-user-read.json")" -ne 0 ]; then
  cat "$TMP_DIR/other-user-read.json" >&2
  echo "Falha: RLS permitiu leitura entre usuarios." >&2
  exit 1
fi

STATUS=$(request DELETE "$REST_URL?id=eq.$ANCHOR_ID" "$TOKEN_1" "" "$TMP_DIR/delete-anchor.json")
if [ "$STATUS" != "204" ]; then
  cat "$TMP_DIR/delete-anchor.json" >&2
  echo "Falha: proprietario nao conseguiu excluir a transacao principal, recebeu $STATUS." >&2
  exit 1
fi

STATUS=$(request GET "$REST_URL?id=eq.$CHILD_ID" "$TOKEN_1" "" "$TMP_DIR/child-after-cascade.json")
if [ "$STATUS" != "200" ] || [ "$(jq 'length' "$TMP_DIR/child-after-cascade.json")" -ne 0 ]; then
  cat "$TMP_DIR/child-after-cascade.json" >&2
  echo "Falha: exclusao da principal nao removeu a filha por cascata." >&2
  exit 1
fi

echo "Teste OK."
echo "Constraints, defaults, cascade e RLS de transaction origin link validados."
