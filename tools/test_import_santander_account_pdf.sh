#!/bin/sh

set -eu

PROJECT_URL="http://127.0.0.1:54321"
FUNCTIONS_URL="$PROJECT_URL/functions/v1"
AUTH_URL="$PROJECT_URL/auth/v1/signup"
REST_URL="$PROJECT_URL/rest/v1"
PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
PDF_PATH="${1:?Informe o caminho do PDF do extrato Santander.}"
SKIP_FUNCTIONS_SERVE="${SKIP_FUNCTIONS_SERVE:-0}"
FUNCTION_LOG="${TMPDIR:-/tmp}/finance-santander-account-import-test-functions.log"
SIGNUP_RESPONSE="${TMPDIR:-/tmp}/finance-santander-account-import-test-signup.json"
IMPORT_RESPONSE_1="${TMPDIR:-/tmp}/finance-santander-account-import-test-import-1.json"
IMPORT_RESPONSE_2="${TMPDIR:-/tmp}/finance-santander-account-import-test-import-2.json"
TRANSACTIONS_RESPONSE="${TMPDIR:-/tmp}/finance-santander-account-import-test-transactions.json"

if [ ! -f "$PDF_PATH" ]; then
  echo "Arquivo PDF nao encontrado: $PDF_PATH" >&2
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI nao encontrado no PATH." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq nao encontrado no PATH." >&2
  exit 1
fi

rm -f "$FUNCTION_LOG" "$SIGNUP_RESPONSE" "$IMPORT_RESPONSE_1" "$IMPORT_RESPONSE_2" "$TRANSACTIONS_RESPONSE"

cleanup() {
  if [ "${SERVE_PID:-}" ] && kill -0 "$SERVE_PID" >/dev/null 2>&1; then
    kill "$SERVE_PID" >/dev/null 2>&1 || true
    wait "$SERVE_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

if [ "$SKIP_FUNCTIONS_SERVE" != "1" ]; then
  SUPABASE_DISABLE_TELEMETRY=1 supabase functions serve --no-verify-jwt >"$FUNCTION_LOG" 2>&1 &
  SERVE_PID=$!

  sleep 5

  if ! kill -0 "$SERVE_PID" >/dev/null 2>&1; then
    cat "$FUNCTION_LOG" >&2 || true
    echo "Falha ao subir supabase functions serve." >&2
    exit 1
  fi
fi

EMAIL="import-test-$(date +%s)-$$@example.com"
PASSWORD="Test123456!"

curl -sSf "$AUTH_URL" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" >"$SIGNUP_RESPONSE"

ACCESS_TOKEN=$(jq -r '.access_token // .session.access_token // empty' "$SIGNUP_RESPONSE")
USER_ID=$(jq -r '.user.id // empty' "$SIGNUP_RESPONSE")

if [ -z "$ACCESS_TOKEN" ] || [ -z "$USER_ID" ]; then
  cat "$SIGNUP_RESPONSE" >&2
  echo "Nao foi possivel criar usuario de teste local." >&2
  exit 1
fi

PDF_BASE64=$(base64 < "$PDF_PATH" | tr -d '\n')
PAYLOAD=$(jq -nc --arg filename "$(basename "$PDF_PATH")" --arg pdfBase64 "$PDF_BASE64" '{filename: $filename, pdfBase64: $pdfBase64}')

curl -sSf "$FUNCTIONS_URL/import-santander-account-pdf" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" >"$IMPORT_RESPONSE_1"

curl -sSf "$FUNCTIONS_URL/import-santander-account-pdf" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" >"$IMPORT_RESPONSE_2"

curl -sSf "$REST_URL/transactions?select=date,description,amount,type,category,external_id&user_id=eq.$USER_ID&order=date.asc" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" >"$TRANSACTIONS_RESPONSE"

IMPORTED_1=$(jq -r '.imported // 0' "$IMPORT_RESPONSE_1")
IMPORTED_2=$(jq -r '.imported // 0' "$IMPORT_RESPONSE_2")
INSERTED_1=$(jq -r '.inserted // 0' "$IMPORT_RESPONSE_1")
INSERTED_2=$(jq -r '.inserted // 0' "$IMPORT_RESPONSE_2")
IGNORED_1=$(jq -r '.ignored // 0' "$IMPORT_RESPONSE_1")
IGNORED_2=$(jq -r '.ignored // 0' "$IMPORT_RESPONSE_2")
ROW_COUNT=$(jq 'length' "$TRANSACTIONS_RESPONSE")

if [ "$IMPORTED_1" -le 0 ]; then
  cat "$IMPORT_RESPONSE_1" >&2
  echo "Falha: o parser nao identificou nenhuma linha no extrato." >&2
  exit 1
fi

if [ "$IMPORTED_2" -ne "$IMPORTED_1" ]; then
  cat "$IMPORT_RESPONSE_2" >&2
  echo "Falha: a reimportacao deveria identificar o mesmo total da primeira importacao ($IMPORTED_1), mas identificou $IMPORTED_2." >&2
  exit 1
fi

if [ "$INSERTED_1" -ne "$ROW_COUNT" ]; then
  cat "$IMPORT_RESPONSE_1" >&2
  echo "Falha: a primeira importacao deveria inserir $ROW_COUNT transacoes, mas inseriu $INSERTED_1." >&2
  exit 1
fi

if [ "$INSERTED_2" -ne 0 ]; then
  cat "$IMPORT_RESPONSE_2" >&2
  echo "Falha: a reimportacao nao deveria inserir novas transacoes, mas inseriu $INSERTED_2." >&2
  exit 1
fi

if [ "$IGNORED_1" -ne 0 ]; then
  cat "$IMPORT_RESPONSE_1" >&2
  echo "Falha: a primeira importacao nao deveria ignorar transacoes, mas ignorou $IGNORED_1." >&2
  exit 1
fi

if [ "$IGNORED_2" -ne "$IMPORTED_2" ]; then
  cat "$IMPORT_RESPONSE_2" >&2
  echo "Falha: a reimportacao deveria ignorar todas as $IMPORTED_2 transacoes identificadas, mas ignorou $IGNORED_2." >&2
  exit 1
fi

echo "Teste OK."
echo "Usuario local: $EMAIL"
echo "Primeira importacao: $IMPORTED_1 identificadas, $INSERTED_1 inseridas, $IGNORED_1 ignoradas"
echo "Reimportacao: $IMPORTED_2 identificadas, $INSERTED_2 inseridas, $IGNORED_2 ignoradas"
echo "Linhas persistidas apos deduplicacao: $ROW_COUNT"
echo "Amostra:"
jq '.[0:5]' "$TRANSACTIONS_RESPONSE"
