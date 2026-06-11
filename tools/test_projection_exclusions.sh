#!/bin/sh

set -eu

PROJECT_URL="http://127.0.0.1:54321"
AUTH_URL="$PROJECT_URL/auth/v1/signup"
REST_URL="$PROJECT_URL/rest/v1/projection_exclusions"
PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
TMP_DIR="${TMPDIR:-/tmp}/finance-projection-exclusions-$$"

mkdir -p "$TMP_DIR"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT INT TERM

signup() {
  email=$1
  output=$2
  curl -sSf "$AUTH_URL" \
    -H "apikey: $PUBLISHABLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Test123456!\"}" >"$output"
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
      -d "$body"
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
signup "projection-exclusions-1-$(date +%s)-$$@example.com" "$USER_1"
signup "projection-exclusions-2-$(date +%s)-$$@example.com" "$USER_2"

TOKEN_1=$(jq -r '.access_token // .session.access_token // empty' "$USER_1")
TOKEN_2=$(jq -r '.access_token // .session.access_token // empty' "$USER_2")
USER_ID_1=$(jq -r '.user.id // empty' "$USER_1")

if [ -z "$TOKEN_1" ] || [ -z "$TOKEN_2" ] || [ -z "$USER_ID_1" ]; then
  echo "Falha ao criar usuarios locais de teste." >&2
  exit 1
fi

VALID_PAYLOAD=$(jq -nc \
  --arg userId "$USER_ID_1" \
  '{
    user_id: $userId,
    type: "Despesa",
    description: "Internet casa",
    normalized_description: "internet casa",
    scope: "month",
    month_start: "2026-06-01"
  }')

STATUS=$(request POST "$REST_URL" "$TOKEN_1" "$VALID_PAYLOAD" "$TMP_DIR/create.json")
if [ "$STATUS" != "201" ]; then
  cat "$TMP_DIR/create.json" >&2
  echo "Falha: usuario proprietario nao conseguiu criar exclusao ($STATUS)." >&2
  exit 1
fi

EXCLUSION_ID=$(jq -r '.[0].id // empty' "$TMP_DIR/create.json")
if [ -z "$EXCLUSION_ID" ]; then
  cat "$TMP_DIR/create.json" >&2
  echo "Falha: insert nao retornou o id da exclusao." >&2
  exit 1
fi

STATUS=$(request POST "$REST_URL" "$TOKEN_1" "$VALID_PAYLOAD" "$TMP_DIR/duplicate.json")
if [ "$STATUS" != "409" ]; then
  cat "$TMP_DIR/duplicate.json" >&2
  echo "Falha: exclusao equivalente duplicada deveria retornar 409, recebeu $STATUS." >&2
  exit 1
fi

INVALID_TYPE=$(printf '%s' "$VALID_PAYLOAD" | jq '.type = "Transferência" | .normalized_description = "transferencia"')
STATUS=$(request POST "$REST_URL" "$TOKEN_1" "$INVALID_TYPE" "$TMP_DIR/invalid-type.json")
if [ "$STATUS" != "400" ]; then
  echo "Falha: tipo Transferência deveria ser rejeitado, recebeu $STATUS." >&2
  exit 1
fi

INVALID_MONTH=$(printf '%s' "$VALID_PAYLOAD" | jq '.month_start = "2026-06-15"')
STATUS=$(request POST "$REST_URL" "$TOKEN_1" "$INVALID_MONTH" "$TMP_DIR/invalid-month.json")
if [ "$STATUS" != "400" ]; then
  echo "Falha: month_start fora do primeiro dia deveria ser rejeitado, recebeu $STATUS." >&2
  exit 1
fi

STATUS=$(request GET "$REST_URL?id=eq.$EXCLUSION_ID" "$TOKEN_2" "" "$TMP_DIR/other-user-read.json")
if [ "$STATUS" != "200" ] || [ "$(jq 'length' "$TMP_DIR/other-user-read.json")" -ne 0 ]; then
  cat "$TMP_DIR/other-user-read.json" >&2
  echo "Falha: RLS permitiu leitura entre usuarios." >&2
  exit 1
fi

STATUS=$(request DELETE "$REST_URL?id=eq.$EXCLUSION_ID" "$TOKEN_2" "" "$TMP_DIR/other-user-delete.json")
if [ "$STATUS" != "204" ]; then
  echo "Falha: delete sem linha visivel deveria retornar 204, recebeu $STATUS." >&2
  exit 1
fi

STATUS=$(request GET "$REST_URL?id=eq.$EXCLUSION_ID" "$TOKEN_1" "" "$TMP_DIR/owner-read.json")
if [ "$STATUS" != "200" ] || [ "$(jq 'length' "$TMP_DIR/owner-read.json")" -ne 1 ]; then
  cat "$TMP_DIR/owner-read.json" >&2
  echo "Falha: tentativa de outro usuario alterou a exclusao." >&2
  exit 1
fi

STATUS=$(request DELETE "$REST_URL?id=eq.$EXCLUSION_ID" "$TOKEN_1" "" "$TMP_DIR/owner-delete.json")
if [ "$STATUS" != "204" ]; then
  echo "Falha: proprietario nao conseguiu remover exclusao, recebeu $STATUS." >&2
  exit 1
fi

echo "Teste OK."
echo "Constraints, unicidade e RLS de projection_exclusions validados."
