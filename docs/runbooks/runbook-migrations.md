# Runbook — Migrations (Drift Control + Apply)

Este runbook descreve como:

- detectar **drift** entre `supabase/migrations/*` (repo) e o banco (cloud/staging/prod);
- aplicar migrations **de forma controlada**;
- validar pós-apply e lidar com incidentes comuns.

## Objetivo

Manter `supabase/migrations/*` como **fonte única de verdade** e evitar incidentes por “tabela/RPC não existe”.

## Pré-requisitos

- `psql` disponível na máquina/runner.
- Variável `SUPABASE_DB_URL` (ou `DATABASE_URL`) configurada com uma conexão Postgres válida.
- Permissões para criar/alterar objetos e gravar em `supabase_migrations.schema_migrations`.

## Scripts oficiais do repo

- `infra/db/migrations-check.sh` — **read-only**, falha se houver drift.
- `infra/db/migrations-apply.sh` — aplica migrations faltantes e registra a versão aplicada.

## 1) Drift check (repo vs DB)

Executar no ambiente alvo:

```bash
SUPABASE_DB_URL="postgres://..." infra/db/migrations-check.sh
```

### Interpretação

- `missing_in_db`: existe migration no repo que **não está aplicada** no banco.
- `extra_in_db`: existe versão aplicada no banco que **não existe** no repo (sintoma de drift histórico).

## 2) Apply (controlado)

### Dry-run

```bash
SUPABASE_DB_URL="postgres://..." infra/db/migrations-apply.sh --dry-run
```

### Apply

```bash
SUPABASE_DB_URL="postgres://..." infra/db/migrations-apply.sh
```

O script:

- garante existência de `supabase_migrations.schema_migrations`;
- adquire um advisory lock `wolfgang-backoffice:migrations`;
- aplica cada migration faltante em uma transação;
- registra `version` ao final de cada migration.

## 3) Validações pós-migração (checklist)

- `infra/db/migrations-check.sh` retorna OK (drift=0).
- Backoffice API:
  - `GET /health` (200)
  - criar empresa e validar `schema_name` retornado
- PostgREST schema exposure:
  - schema novo aparece em `pgrst.db_schemas` (via função `core.fn_postgrest_expose_schema`)
  - `supabase-js` consegue `.schema(<tenant>)` sem `permission denied`
- `agent-runtime`:
  - `GET /ready` (quando existir) ou logs sem erros de inicialização

## 4) Rollback (pragmático)

Supabase/Postgres não tem rollback automático de migrations já aplicadas. Estratégias:

- **Hotfix forward**: criar nova migration corrigindo o estado (preferível).
- **Restaurar backup**: somente em incidentes graves, com janela e comunicação.

## 5) Incidentes comuns

### Drift detectado em produção

**Sintoma:** `migrations-check.sh` falha em prod; endpoints quebram com “relation does not exist”.

**Ação:**

1) Rodar `infra/db/migrations-apply.sh --dry-run` e validar quais versões faltam.
2) Aplicar com janela (ou pipeline controlado).
3) Validar checklist pós-migração.

### Permission denied / PostgREST não expõe schema

**Sintoma:** `.schema(<tenant>)` falha, ou criação de empresa quebra ao tentar expor schema.

**Ação:**

- Verificar `supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql` aplicado.
- Garantir que o serviço que executa o `fn_postgrest_expose_schema` usa **conexão direta** (não PostgREST).

## Referências

- `infra/deploy/README.md` (seção “Migrações”)
- `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` (auto-expose PostgREST)
