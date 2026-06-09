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
        /^web\/src\/.*\.(js|jsx)$/ { print }
      '
)

if [ -z "$lint_targets" ]; then
  exit 0
fi

set -- $lint_targets
npm --prefix web exec eslint -- "$@"
