#!/bin/bash
set -e

THISDIR="$(dirname "$0")"
INPUT_BIN_DIR="$(realpath "$THISDIR/../../bin")"
OUTPUT_BIN_DIR="$(realpath "$THISDIR/../../node_modules/.bin")"

for file in "$INPUT_BIN_DIR"/*; do
  if [ -f "$file" ]; then
    bn="$(basename "$file")"
    echo "creating node_modules binfile symlink for '$bn'"
    ln -s "$file" "$OUTPUT_BIN_DIR/$bn" || true
  fi
done