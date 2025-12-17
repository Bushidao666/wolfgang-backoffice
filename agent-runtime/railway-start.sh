#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SERVICE_DIR}"

export PYTHONPATH="${SERVICE_DIR}/src"
exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-5000}"

