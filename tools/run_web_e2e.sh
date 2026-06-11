#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
WEB_DIR="$ROOT_DIR/web"
FUNCTION_LOG="${TMPDIR:-/tmp}/finance-web-e2e-functions.log"

export SUPABASE_DISABLE_TELEMETRY=1

cd "$ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI nao encontrado no PATH." >&2
  exit 1
fi

STATUS_OUTPUT=$(supabase status 2>&1 || true)
if ! printf '%s' "$STATUS_OUTPUT" | grep -q "supabase local development setup is running."; then
  echo "Supabase local nao esta em execucao. Rode 'supabase start' antes dos testes e2e." >&2
  exit 1
fi

rm -f "$FUNCTION_LOG"
SUPABASE_DISABLE_TELEMETRY=1 supabase functions serve --no-verify-jwt >"$FUNCTION_LOG" 2>&1 &
SERVE_PID=$!

cleanup() {
  if kill -0 "$SERVE_PID" >/dev/null 2>&1; then
    kill "$SERVE_PID" >/dev/null 2>&1 || true
    wait "$SERVE_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

sleep 5

if ! kill -0 "$SERVE_PID" >/dev/null 2>&1; then
  cat "$FUNCTION_LOG" >&2 || true
  echo "Falha ao subir supabase functions serve para os testes e2e." >&2
  exit 1
fi

cd "$WEB_DIR"
npx playwright test "$@"
