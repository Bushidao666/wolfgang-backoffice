#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SERVICE_DIR}"

PYTHON_BIN="${PYTHON_BIN:-python}"
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  PYTHON_BIN="python3"
fi

VENV_DIR="${VENV_DIR:-.venv}"
if [[ -x "${VENV_DIR}/bin/python" ]]; then
  PYTHON_BIN="${VENV_DIR}/bin/python"
fi

export PYTHONPATH="${SERVICE_DIR}/src"
exec "${PYTHON_BIN}" -m uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-5000}"
