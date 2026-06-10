#!/bin/sh

set -eu

PROJECT_URL="http://127.0.0.1:54321"
FUNCTIONS_URL="$PROJECT_URL/functions/v1"
AUTH_URL="$PROJECT_URL/auth/v1/signup"
REST_URL="$PROJECT_URL/rest/v1"
PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
CSV_PATH="${1:-/Users/leonakao/Downloads/Nubank_2025-12-09.csv}"
SKIP_FUNCTIONS_SERVE="${SKIP_FUNCTIONS_SERVE:-0}"
FUNCTION_LOG="${TMPDIR:-/tmp}/finance-nubank-import-test-functions.log"
SIGNUP_RESPONSE="${TMPDIR:-/tmp}/finance-nubank-import-test-signup.json"
IMPORT_RESPONSE_1="${TMPDIR:-/tmp}/finance-nubank-import-test-import-1.json"
IMPORT_RESPONSE_2="${TMPDIR:-/tmp}/finance-nubank-import-test-import-2.json"
TRANSACTIONS_RESPONSE="${TMPDIR:-/tmp}/finance-nubank-import-test-transactions.json"

if [ ! -f "$CSV_PATH" ]; then
  echo "Arquivo CSV nao encontrado: $CSV_PATH" >&2
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

EMAIL="nubank-import-test-$(date +%s)-$$@example.com"
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

CSV_TEXT=$(cat "$CSV_PATH")
PAYLOAD=$(jq -nc --arg filename "$(basename "$CSV_PATH")" --arg csvText "$CSV_TEXT" '{filename: $filename, kind: "card", csvText: $csvText}')
BASE_COUNT=$(awk 'END { print NR - 1 }' "$CSV_PATH")

curl -sSf "$FUNCTIONS_URL/import-nubank-csv" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" >"$IMPORT_RESPONSE_1"

curl -sSf "$FUNCTIONS_URL/import-nubank-csv" \
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

if [ "$IMPORTED_1" -le "$BASE_COUNT" ]; then
  cat "$IMPORT_RESPONSE_1" >&2
  echo "Falha: o import do Nubank deveria expandir compras parceladas e produzir mais de $BASE_COUNT transacoes, mas enviou $IMPORTED_1." >&2
  exit 1
fi

if [ "$IMPORTED_2" -ne "$IMPORTED_1" ]; then
  cat "$IMPORT_RESPONSE_2" >&2
  echo "Falha: a reimportacao deveria reenviar o mesmo total da primeira importacao ($IMPORTED_1), mas enviou $IMPORTED_2." >&2
  exit 1
fi

if [ "$ROW_COUNT" -ne "$IMPORTED_1" ]; then
  echo "Falha: a contagem final no banco deveria permanecer $IMPORTED_1 apos a reimportacao, mas ficou em $ROW_COUNT." >&2
  exit 1
fi

CARLOS_COUNT=$(jq '[.[] | select(.description == "Pg *Carlos Levir F de")] | length' "$TRANSACTIONS_RESPONSE")
if [ "$CARLOS_COUNT" -lt 12 ]; then
  echo "Falha: a compra parcelada de Carlos Levir deveria gerar pelo menos 12 parcelas, mas gerou $CARLOS_COUNT." >&2
  exit 1
fi

SERIES_HAS_FIRST=$(jq '[.[] | select(.description == "Pg *Carlos Levir F de" and .installment == "01/12")] | length > 0' "$TRANSACTIONS_RESPONSE")
SERIES_HAS_LAST=$(jq '[.[] | select(.description == "Pg *Carlos Levir F de" and .installment == "12/12")] | length > 0' "$TRANSACTIONS_RESPONSE")

if [ "$SERIES_HAS_FIRST" != "true" ] || [ "$SERIES_HAS_LAST" != "true" ]; then
  echo "Falha: a serie parcelada do Nubank nao contem os extremos 01/12 e 12/12 para Pg *Carlos Levir F de." >&2
  jq '.[] | select(.description == "Pg *Carlos Levir F de")' "$TRANSACTIONS_RESPONSE" >&2
  exit 1
fi

echo "Teste OK."
echo "Usuario local: $EMAIL"
echo "Primeira importacao: $IMPORTED_1 transacoes enviadas"
echo "Reimportacao: $IMPORTED_2 transacoes reenviadas"
echo "Linhas persistidas apos deduplicacao: $ROW_COUNT"
