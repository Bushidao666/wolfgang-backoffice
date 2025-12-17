#!/usr/bin/env bash
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SERVICE_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "[backoffice-web] installing dependencies (workspaces)"
npm ci --workspaces --include-workspace-root

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" || -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  echo "[backoffice-web] WARN: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set at build time"
fi

echo "[backoffice-web] building service"
npm -w @wolfgang/backoffice-web run build

