#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SERVICE_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "[evolution-manager] installing dependencies (workspaces)"
npm ci --workspaces --include-workspace-root

echo "[evolution-manager] building shared packages"
npm -w @wolfgang/contracts run build
npm -w @wolfgang/logger run build

echo "[evolution-manager] building service"
npm -w @wolfgang/evolution-manager run build

