#!/bin/sh

set -eu

if [ "$#" -ne 2 ]; then
  echo "Uso: sh tools/use_web_env.sh <source-env-file> <target-env-file>" >&2
  exit 1
fi

SOURCE_FILE=$1
TARGET_FILE=$2

if [ ! -f "$SOURCE_FILE" ]; then
  echo "Arquivo de origem nao encontrado: $SOURCE_FILE" >&2
  exit 1
fi

cp "$SOURCE_FILE" "$TARGET_FILE"
echo "Ambiente aplicado em $TARGET_FILE a partir de $SOURCE_FILE"
