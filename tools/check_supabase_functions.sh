#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
LOG_FILE="${TMPDIR:-/tmp}/finance-supabase-functions-check.log"

cd "$ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI nao encontrado no PATH." >&2
  exit 1
fi

if ! supabase status >/dev/null 2>&1; then
  echo "Supabase local nao esta em execucao. Rode 'supabase start' antes do check das functions." >&2
  exit 1
fi

rm -f "$LOG_FILE"
supabase functions serve --no-verify-jwt >"$LOG_FILE" 2>&1 &
SERVE_PID=$!

cleanup() {
  if kill -0 "$SERVE_PID" >/dev/null 2>&1; then
    kill "$SERVE_PID" >/dev/null 2>&1 || true
    wait "$SERVE_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

sleep 5

if kill -0 "$SERVE_PID" >/dev/null 2>&1; then
  echo "Supabase functions check OK."
  exit 0
fi

wait "$SERVE_PID" || true
cat "$LOG_FILE" >&2
echo "Supabase functions check falhou durante o startup." >&2
exit 1
