#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 22 from https://nodejs.org and run this file again."
  exit 1
fi

node scripts/launch.mjs
