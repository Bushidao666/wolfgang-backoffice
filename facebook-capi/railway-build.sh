#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SERVICE_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "[facebook-capi] installing dependencies (workspaces)"
npm ci --workspaces --include-workspace-root

echo "[facebook-capi] building shared packages"
npm -w @wolfgang/contracts run build
npm -w @wolfgang/logger run build

echo "[facebook-capi] building service"
npm -w @wolfgang/facebook-capi run build

