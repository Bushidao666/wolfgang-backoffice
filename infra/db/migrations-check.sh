#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  infra/db/migrations-check.sh [--db-url <postgres_url>] [--migrations-dir <dir>]

Checks drift between:
  - migrations present in the repo under supabase/migrations/
  - versions recorded in supabase_migrations.schema_migrations on the target DB

Env:
  SUPABASE_DB_URL / DATABASE_URL  (fallback for --db-url)
  MIGRATIONS_DIR                 (fallback for --migrations-dir)

Exit codes:
  0: no drift
  2: drift detected
  3: invalid usage / missing deps
USAGE
}

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url)
      DB_URL="${2:-}"; shift 2 ;;
    --migrations-dir)
      MIGRATIONS_DIR="${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 3 ;;
  esac
done

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required" >&2
  exit 3
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-${REPO_ROOT}/supabase/migrations}"

if [[ -z "${DB_URL}" ]]; then
  echo "Missing --db-url (or SUPABASE_DB_URL/DATABASE_URL env var)" >&2
  exit 3
fi

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "Migrations dir not found: ${MIGRATIONS_DIR}" >&2
  exit 3
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

repo_versions_file="${tmpdir}/repo_versions.txt"
applied_versions_file="${tmpdir}/applied_versions.txt"

find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name "*.sql" -printf "%f\n" \
  | sort \
  | awk -F'_' '{print $1}' \
  | sed -E 's/\.sql$//' \
  | awk 'NF && $1 != "" {print $1}' \
  | sort -u \
  > "${repo_versions_file}"

# If the supabase migrations table doesn't exist yet, treat as "nothing applied".
psql "${DB_URL}" -v ON_ERROR_STOP=1 -Atq -c \
  "select version from supabase_migrations.schema_migrations order by version" \
  > "${applied_versions_file}" 2>/dev/null || true

missing_in_db="$(comm -23 "${repo_versions_file}" "${applied_versions_file}" || true)"
extra_in_db="$(comm -13 "${repo_versions_file}" "${applied_versions_file}" || true)"

repo_count="$(wc -l < "${repo_versions_file}" | tr -d ' ')"
db_count="$(wc -l < "${applied_versions_file}" | tr -d ' ')"

repo_last="$(tail -n 1 "${repo_versions_file}" 2>/dev/null || true)"
db_last="$(tail -n 1 "${applied_versions_file}" 2>/dev/null || true)"

echo "migrations.check repo=${repo_count} db=${db_count} repo_last=${repo_last:-none} db_last=${db_last:-none}"

drift=0
if [[ -n "${missing_in_db}" ]]; then
  drift=1
  echo "migrations.drift.missing_in_db" >&2
  echo "${missing_in_db}" | sed 's/^/  - /' >&2
fi

if [[ -n "${extra_in_db}" ]]; then
  drift=1
  echo "migrations.drift.extra_in_db" >&2
  echo "${extra_in_db}" | sed 's/^/  - /' >&2
fi

if [[ "${drift}" -eq 1 ]]; then
  echo "migrations.check FAILED (drift detected)" >&2
  exit 2
fi

echo "migrations.check OK"
