#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

rm -rf dist
npm install --prefix web
npm --prefix web run build
cp -R web/dist ./dist
