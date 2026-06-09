#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PROJECT_URL="http://127.0.0.1:54321"
FUNCTIONS_URL="$PROJECT_URL/functions/v1"
AUTH_URL="$PROJECT_URL/auth/v1/signup"
REST_URL="$PROJECT_URL/rest/v1"
PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
PDF_PATH="${1:-/Users/leonakao/projects/personal/finance/inbox/santander-2026-06.pdf}"
EXPECTED_JSON_PATH="${PDF_PATH%.pdf}.json"
SKIP_FUNCTIONS_SERVE="${SKIP_FUNCTIONS_SERVE:-0}"
FUNCTION_LOG="${TMPDIR:-/tmp}/finance-santander-import-test-functions.log"
SIGNUP_RESPONSE="${TMPDIR:-/tmp}/finance-santander-import-test-signup.json"
IMPORT_RESPONSE_1="${TMPDIR:-/tmp}/finance-santander-import-test-import-1.json"
IMPORT_RESPONSE_2="${TMPDIR:-/tmp}/finance-santander-import-test-import-2.json"
TRANSACTIONS_RESPONSE="${TMPDIR:-/tmp}/finance-santander-import-test-transactions.json"

if [ ! -f "$PDF_PATH" ]; then
  echo "Arquivo PDF nao encontrado: $PDF_PATH" >&2
  exit 1
fi

if [ ! -f "$EXPECTED_JSON_PATH" ]; then
  echo "Arquivo JSON esperado nao encontrado ao lado do PDF: $EXPECTED_JSON_PATH" >&2
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
PAYLOAD=$(jq -nc --arg filename "$(basename "$PDF_PATH")" --arg pdfBase64 "$PDF_BASE64" '{filename: $filename, kind: "card", pdfBase64: $pdfBase64}')
BASE_COUNT=$(jq '.transaction_count' "$EXPECTED_JSON_PATH")
INSTALLMENT_SOURCE_COUNT=$(jq '[.transactions[] | select(.installment | test("^[0-9]{2}/[0-9]{2}$"))] | length' "$EXPECTED_JSON_PATH")

curl -sSf "$FUNCTIONS_URL/import-santander-pdf" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" >"$IMPORT_RESPONSE_1"

curl -sSf "$FUNCTIONS_URL/import-santander-pdf" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" >"$IMPORT_RESPONSE_2"

curl -sSf "$REST_URL/transactions?select=date,description,installment,external_id&user_id=eq.$USER_ID&order=date.asc" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" >"$TRANSACTIONS_RESPONSE"

IMPORTED_1=$(jq -r '.imported // 0' "$IMPORT_RESPONSE_1")
IMPORTED_2=$(jq -r '.imported // 0' "$IMPORT_RESPONSE_2")
ROW_COUNT=$(jq 'length' "$TRANSACTIONS_RESPONSE")

if [ "$INSTALLMENT_SOURCE_COUNT" -gt 0 ] && [ "$IMPORTED_1" -le "$BASE_COUNT" ]; then
  cat "$IMPORT_RESPONSE_1" >&2
  echo "Falha: o import deveria expandir compras parceladas e produzir mais de $BASE_COUNT transacoes, mas enviou $IMPORTED_1." >&2
  exit 1
fi

if [ "$IMPORTED_2" -ne "$IMPORTED_1" ]; then
  cat "$IMPORT_RESPONSE_2" >&2
  echo "Falha: a reimportacao deveria reenviar o mesmo total da primeira importacao ($IMPORTED_1), mas enviou $IMPORTED_2." >&2
  exit 1
fi

if [ "$ROW_COUNT" -ne "$IMPORTED_1" ]; then
  jq 'length' "$TRANSACTIONS_RESPONSE" >&2
  echo "Falha: a contagem final no banco deveria permanecer $IMPORTED_1 apos a reimportacao, mas ficou em $ROW_COUNT." >&2
  exit 1
fi

KABUM_COUNT=$(jq '[.[] | select(.description == "MLP*KABUM KABUM")] | length' "$TRANSACTIONS_RESPONSE")
CASASBAHIA_COUNT=$(jq '[.[] | select(.description == "WWW-CASASBAHIA-COM-BR")] | length' "$TRANSACTIONS_RESPONSE")

if [ "$KABUM_COUNT" -ne 10 ]; then
  echo "Falha: compra parcelada MLP*KABUM KABUM deveria gerar 10 parcelas, mas gerou $KABUM_COUNT." >&2
  exit 1
fi

if [ "$CASASBAHIA_COUNT" -ne 10 ]; then
  echo "Falha: compra parcelada WWW-CASASBAHIA-COM-BR deveria gerar 10 parcelas, mas gerou $CASASBAHIA_COUNT." >&2
  exit 1
fi

KABUM_SERIES_OK=$(jq '
  [
    .[]
    | select(.description == "MLP*KABUM KABUM")
    | .installment
  ] == ["01/10","02/10","03/10","04/10","05/10","06/10","07/10","08/10","09/10","10/10"]
' "$TRANSACTIONS_RESPONSE")

CASASBAHIA_SERIES_OK=$(jq '
  [
    .[]
    | select(.description == "WWW-CASASBAHIA-COM-BR")
    | .installment
  ] == ["01/10","02/10","03/10","04/10","05/10","06/10","07/10","08/10","09/10","10/10"]
' "$TRANSACTIONS_RESPONSE")

KABUM_DATES_OK=$(jq '
  [
    .[]
    | select(.description == "MLP*KABUM KABUM")
    | .date
  ] == ["2025-10-21","2025-11-21","2025-12-21","2026-01-21","2026-02-21","2026-03-21","2026-04-21","2026-05-21","2026-06-21","2026-07-21"]
' "$TRANSACTIONS_RESPONSE")

CASASBAHIA_DATES_OK=$(jq '
  [
    .[]
    | select(.description == "WWW-CASASBAHIA-COM-BR")
    | .date
  ] == ["2025-10-06","2025-11-06","2025-12-06","2026-01-06","2026-02-06","2026-03-06","2026-04-06","2026-05-06","2026-06-06","2026-07-06"]
' "$TRANSACTIONS_RESPONSE")

if [ "$KABUM_SERIES_OK" != "true" ] || [ "$CASASBAHIA_SERIES_OK" != "true" ] || [ "$KABUM_DATES_OK" != "true" ] || [ "$CASASBAHIA_DATES_OK" != "true" ]; then
  echo "Falha: serie de parcelas ou datas nao bateu para as compras 08/10 do PDF de junho." >&2
  jq '
    .[]
    | select(.description == "MLP*KABUM KABUM" or .description == "WWW-CASASBAHIA-COM-BR")
  ' "$TRANSACTIONS_RESPONSE" >&2
  exit 1
fi

echo "Teste OK."
echo "Usuario local: $EMAIL"
echo "Primeira importacao: $IMPORTED_1 transacoes enviadas"
echo "Reimportacao: $IMPORTED_2 transacoes reenviadas"
echo "Linhas persistidas apos deduplicacao: $ROW_COUNT"
