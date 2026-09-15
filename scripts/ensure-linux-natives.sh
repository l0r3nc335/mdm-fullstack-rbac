#!/usr/bin/env bash
# Repair napi / optional native addons on Linux CI when the lockfile was
# generated on Windows (npm optional-deps bug: npm/cli#4828).
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Skipping Linux native repair (not Linux)."
  exit 0
fi

echo "Reinstalling workspace packages so Linux optional natives resolve..."
rm -rf node_modules backend/node_modules frontend/node_modules
npm install --include=optional --no-fund --no-audit

echo "Installing explicit Linux native packages..."
npm install --workspace backend \
  @img/sharp-linux-x64@0.35.4 \
  @img/sharp-libvips-linux-x64@1.3.3 \
  sharp

npm install --workspace frontend \
  @oxlint/binding-linux-x64-gnu@1.83.0 \
  @rolldown/binding-linux-x64-gnu@1.2.8 \
  @tailwindcss/oxide-linux-x64-gnu@4.3.3 \
  lightningcss-linux-x64-gnu@1.33.0 \
  oxlint

# Nested copy under @tailwindcss/node (uses lightningcss@1.32.0)
NESTED_LC="frontend/node_modules/@tailwindcss/node/node_modules"
if [[ -d "frontend/node_modules/@tailwindcss/node" ]]; then
  echo "Installing nested lightningcss Linux binding for Tailwind..."
  mkdir -p "${NESTED_LC}"
  npm install --prefix "frontend/node_modules/@tailwindcss/node" \
    --no-save --no-package-lock \
    lightningcss-linux-x64-gnu@1.32.0
fi

echo "Linux native repair complete."
