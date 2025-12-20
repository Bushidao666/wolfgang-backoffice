#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  infra/db/migrations-apply.sh [--db-url <postgres_url>] [--migrations-dir <dir>] [--dry-run]

Applies missing repo migrations to the target DB and records versions in:
  supabase_migrations.schema_migrations

Env:
  SUPABASE_DB_URL / DATABASE_URL  (fallback for --db-url)
  MIGRATIONS_DIR                 (fallback for --migrations-dir)

Notes:
  - This script is intended for controlled environments (CI/CD or ops runbooks).
  - It does NOT print the DB URL (to avoid leaking secrets).
  - It uses a session-level advisory lock to prevent concurrent runs.
USAGE
}

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-}"
DRY_RUN="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url)
      DB_URL="${2:-}"; shift 2 ;;
    --migrations-dir)
      MIGRATIONS_DIR="${2:-}"; shift 2 ;;
    --dry-run)
      DRY_RUN="1"; shift 1 ;;
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

repo_files_file="${tmpdir}/repo_files.txt"
repo_versions_file="${tmpdir}/repo_versions.txt"
applied_versions_file="${tmpdir}/applied_versions.txt"
missing_versions_file="${tmpdir}/missing_versions.txt"

find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name "*.sql" -printf "%f\n" | sort > "${repo_files_file}"
awk -F'_' '{print $1}' "${repo_files_file}" | sort -u > "${repo_versions_file}"

psql "${DB_URL}" -v ON_ERROR_STOP=1 -Atq <<'SQL' > "${applied_versions_file}" 2>/dev/null || true
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  inserted_at timestamptz not null default now()
);
select version from supabase_migrations.schema_migrations order by version;
SQL

comm -23 "${repo_versions_file}" "${applied_versions_file}" > "${missing_versions_file}" || true

if [[ ! -s "${missing_versions_file}" ]]; then
  echo "migrations.apply nothing_to_do"
  exit 0
fi

echo "migrations.apply pending:"
sed 's/^/  - /' "${missing_versions_file}"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "migrations.apply dry_run=true"
  exit 0
fi

apply_script="${tmpdir}/apply.sql"
{
  echo "\\set ON_ERROR_STOP on"
  echo "create schema if not exists supabase_migrations;"
  echo "create table if not exists supabase_migrations.schema_migrations (version text primary key, inserted_at timestamptz not null default now());"
  echo "select pg_advisory_lock(hashtext('wolfgang-backoffice:migrations')::bigint);"

  while IFS= read -r version; do
    [[ -z "${version}" ]] && continue
    file="$(grep -E "^${version}_" "${repo_files_file}" | head -n 1 || true)"
    if [[ -z "${file}" ]]; then
      echo "\\echo 'skip: missing file for version ${version}'" >&2
      continue
    fi
    full_path="${MIGRATIONS_DIR}/${file}"
    echo "\\echo 'apply ${file}'"
    echo "begin;"
    echo "\\i '${full_path//\'/\'\\\'\'}'"
    echo "insert into supabase_migrations.schema_migrations(version) values ('${version}') on conflict (version) do nothing;"
    echo "commit;"
  done < "${missing_versions_file}"

  echo "select pg_advisory_unlock(hashtext('wolfgang-backoffice:migrations')::bigint);"
} > "${apply_script}"

psql "${DB_URL}" -f "${apply_script}"
echo "migrations.apply OK"
