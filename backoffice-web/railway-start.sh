#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SERVICE_DIR}/.." && pwd)"

cd "${SERVICE_DIR}"

PORT="${PORT:-3000}"
HOSTNAME="${HOSTNAME:-0.0.0.0}"

# Run Next.js from the app directory so it finds `.next/`.
exec node "${REPO_ROOT}/node_modules/next/dist/bin/next" start -p "${PORT}" -H "${HOSTNAME}"

