#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SERVICE_DIR}"

echo "[agent-runtime] installing python dependencies"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

