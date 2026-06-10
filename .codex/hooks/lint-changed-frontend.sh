#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  exit 0
fi

if [ ! -f "web/package.json" ]; then
  exit 0
fi

tracked_files=$(git diff --name-only --diff-filter=ACMR -- web || true)
untracked_files=$(git ls-files --others --exclude-standard -- web || true)

candidate_files=$(printf '%s\n%s\n' "$tracked_files" "$untracked_files" | awk 'NF' | sort -u)

if [ -z "$candidate_files" ]; then
  exit 0
fi

lint_targets=$(
  printf '%s\n' "$candidate_files" \
    | awk '
        /^web\/eslint\.config\.js$/ { print; next }
        /^web\/src\/.*\.(ts|tsx)$/ { print; next }
        /^web\/e2e\/.*\.ts$/ { print; next }
        /^web\/(vite|playwright)\.config\.ts$/ { print }
      '
)

typecheck_targets=$(
  printf '%s\n' "$candidate_files" \
    | awk '
        /^web\/src\/.*\.(ts|tsx)$/ { print; next }
        /^web\/e2e\/.*\.ts$/ { print; next }
        /^web\/(vite|playwright)\.config\.ts$/ { print; next }
        /^web\/tsconfig\.json$/ { print; next }
        /^web\/package\.json$/ { print; next }
        /^web\/eslint\.config\.js$/ { print }
      '
)

if [ -n "$lint_targets" ]; then
  set -- $lint_targets
  npm --prefix web exec eslint -- "$@"
fi

if [ -n "$typecheck_targets" ]; then
  npm --prefix web run typecheck
fi
