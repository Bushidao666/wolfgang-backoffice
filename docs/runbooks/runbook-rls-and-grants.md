# Runbook — RLS & Grants (Tenant Schemas)

Este runbook define uma matriz mínima de permissões para schemas de tenant (`<tenant_schema>`) e como validar que:

- o schema existe e está consistente com `_template_base`;
- o PostgREST consegue acessar (`.schema(<tenant>)`);
- **não existe** acesso cross-tenant.

## Objetivo

Evitar incidentes do tipo:

- `permission denied for schema <tenant_schema>`
- erros em `/deals` e `/deals/stats`
- handoff do `agent-runtime` falhar ao gravar em `<tenant_schema>.deals`

## Checklist rápido (produção)

1) Schema existe:

```sql
select nspname from pg_namespace where nspname = '<tenant_schema>';
```

2) Grants básicos:

```sql
grant usage on schema <tenant_schema> to anon, authenticated, service_role;
grant all on all tables in schema <tenant_schema> to anon, authenticated, service_role;
grant all on all sequences in schema <tenant_schema> to anon, authenticated, service_role;
grant all on all routines in schema <tenant_schema> to anon, authenticated, service_role;
```

3) Default privileges (para novos objetos):

```sql
alter default privileges for role postgres in schema <tenant_schema>
  grant all on tables to anon, authenticated, service_role;

alter default privileges for role postgres in schema <tenant_schema>
  grant all on sequences to anon, authenticated, service_role;

alter default privileges for role postgres in schema <tenant_schema>
  grant all on routines to anon, authenticated, service_role;
```

4) RLS habilitado e política tenant:

```sql
select relrowsecurity
from pg_class
where relnamespace = '<tenant_schema>'::regnamespace
  and relname in ('deals','services','equipe','contratos');
```

## Matriz mínima (roles × operações)

| Role | Operação | Esperado |
|------|----------|----------|
| `service_role` | read/write em `<tenant_schema>.*` | ✅ |
| `authenticated` | read/write com RLS (`core.can_access_company(company_id)`) | ✅ |
| `anon` | geralmente read-only (depende do produto) | ⚠️ (no mínimo: não quebrar rotas públicas) |

> Observação: a política de tenant deve sempre checar `company_id` e impedir cross-tenant.

## Referência do repo

A migration que consolida este padrão:

- `supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql`

## Validação via API

1) Criar 2 empresas (A e B) e obter seus `schema_name`.
2) Com `x-company-id` apontando para A:
   - `GET /deals` deve funcionar e retornar apenas dados de A.
3) Alterar para B:
   - `GET /deals` deve retornar apenas dados de B.
4) Teste negativo:
   - tentar acessar dados de A com `company_id` de B deve falhar (403/empty).

## Troubleshooting

### PostgREST não enxerga schema

Se `.schema(<tenant>)` falhar:

- confirmar que `core.fn_postgrest_expose_schema` existe e roda via conexão direta;
- checar se `pgrst.db_schemas` contém `<tenant_schema>`.

### Grants aplicados mas ainda dá permission denied

Possíveis causas:

- `default privileges` ausentes (objetos novos ficam sem grant);
- role diferente sendo usada (ex.: não é `service_role`);
- RLS bloqueando (token sem `company_id` ou `core.can_access_company` retornando false).
