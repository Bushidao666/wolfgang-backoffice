# Runbook — Schema Exposure (PostgREST / `pgrst.db_schemas`)

Este runbook cobre incidentes em que um schema de tenant (`core.companies.schema_name`) **existe no Postgres**, mas **não está exposto** para o PostgREST, causando falhas no Backoffice API/Web e/ou em serviços que usam `supabase-js` com `.schema(<tenant>)`.

## Quando usar

Use este runbook quando houver erros do tipo:

- `permission denied for schema <tenant>`
- `schema "<tenant>" does not exist` (via PostgREST) mesmo com schema presente no banco
- endpoints do Backoffice API retornando 500 ao acessar tabelas do tenant

## Contexto rápido (como deveria funcionar)

- O repo possui helper `core.fn_postgrest_expose_schema(schema)` que atualiza a config `pgrst.db_schemas`.
- Como **não é seguro** atualizar `pgrst.db_schemas` dentro de uma sessão PostgREST, existe uma fila:
  - `core.postgrest_schema_exposure_queue`
  - função `core.fn_enqueue_postgrest_schema_exposure(schema)`
- O Backoffice API possui um dreno best-effort:
  - `backoffice-api/src/modules/companies/services/postgrest-exposure.service.ts`

## Pré-requisitos

- Acesso a um Postgres “admin/direct” (ex.: `SUPABASE_DB_URL`) — **não** via PostgREST.
- `psql` disponível (ou console SQL do Supabase).

---

## 1) Identificar o schema do tenant

> Você precisa de `company_id` (UUID) ou `schema_name`.

```sql
select id, name, slug, schema_name, created_at
from core.companies
where id = '<company_id>';
```

Guarde o valor de `schema_name` (ex.: `cmp_acme`).

---

## 2) Confirmar que o schema existe no Postgres

```sql
select nspname
from pg_namespace
where nspname = '<schema_name>';
```

- Se **não existir**, o problema é provisionamento/migrations (use `docs/runbooks/runbook-migrations.md`).
- Se existir, continue.

---

## 3) Checar fila de exposição (drain)

```sql
select schema_name, created_at
from core.postgrest_schema_exposure_queue
order by created_at desc
limit 50;
```

Se `<schema_name>` estiver na fila:

1) **Opção A (preferida):** reiniciar Backoffice API para executar drain no startup.
2) **Opção B (manual):** executar o drain (passo 5).

---

## 4) Verificar se `pgrst.db_schemas` contém o schema

O PostgREST usa a config `pgrst.db_schemas` no role `authenticator`.

```sql
select r.rolname,
       unnest(s.setconfig) as setting
from pg_db_role_setting s
join pg_roles r on r.oid = s.setrole
where r.rolname = 'authenticator'
  and exists (
    select 1
    from unnest(s.setconfig) cfg
    where cfg like 'pgrst.db_schemas=%'
  );
```

Interpretação:

- Você deve ver uma linha `pgrst.db_schemas=...` contendo `core` e o `<schema_name>`.
- Se o `<schema_name>` não estiver presente, execute o passo 5.

---

## 5) Correção (manual) — expor schema

Executar via conexão Postgres direta:

```sql
select core.fn_postgrest_expose_schema('<schema_name>');
```

Se o erro envolver `permission denied to set parameter pgrst.db_schemas`:

- Garanta que está usando conexão direta (admin) e não PostgREST.
- Confirme migrations aplicadas:
  - `supabase/migrations/00077_fix_postgrest_expose_schema_dedupe.sql`
  - `supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql`

### Drenar fila (se aplicável)

Se a fila estiver acumulada:

```sql
-- Veja o backlog
select schema_name, created_at
from core.postgrest_schema_exposure_queue
order by created_at asc
limit 200;

-- Execute exposição e remova da fila (um-a-um, controlado)
begin;
  select core.fn_postgrest_expose_schema(schema_name)
  from core.postgrest_schema_exposure_queue
  order by created_at asc
  limit 200;

  delete from core.postgrest_schema_exposure_queue
  where schema_name in (
    select schema_name
    from core.postgrest_schema_exposure_queue
    order by created_at asc
    limit 200
  );
commit;
```

> Observação: se preferir, use o dreno automático do Backoffice API (reinício) ao invés do SQL acima.

---

## 6) Validação pós-correção (checklist)

1) `pgrst.db_schemas` contém o schema (repita o passo 4).
2) A fila de exposição está vazia ou reduzida (passo 3).
3) Backoffice API:
   - `GET /health` retorna 200
   - endpoints que acessam tenant schema voltam a responder (ex.: `GET /deals` com `x-company-id`)
4) Drift de migrations:
   - `infra/db/migrations-check.sh` retorna OK no ambiente alvo.

---

## 7) Prevenção

- Garantir que o Backoffice API tenha conexão Postgres direta configurada para executar o drain:
  - `PostgrestExposureService.ensureOperational()` é um bom smoke test em staging.
- Monitorar o tamanho da fila:

```sql
select count(*) as queued
from core.postgrest_schema_exposure_queue;
```

Se o contador crescer continuamente, investigar por que o drain não está rodando (startup falhando, env vars ausentes, etc.).
