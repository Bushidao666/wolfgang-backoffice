# Runbook: Database (Supabase/Postgres)

Este runbook cobre incidentes envolvendo **Postgres** (via Supabase), incluindo conectividade, performance, locks e migrações.

## Escopo

- Serviços afetados: `backoffice-api`, `agent-runtime`, `autentique-service`, `facebook-capi`, `evolution-manager`
- Dependências: Supabase/Postgres (`SUPABASE_DB_URL` / `DATABASE_URL`), Supabase API (`SUPABASE_URL`)

## Sintomas comuns

- `agent-runtime`:
  - `GET /ready` retorna `status=degraded` com `checks.db=failed`
  - logs com `ConnectionPool not started`, `asyncpg` errors, timeouts
- `backoffice-api`:
  - 5xx em endpoints de leitura/escrita
  - erros de `RLS`, `permission denied`, `relation does not exist`
- Migrações:
  - tabelas/colunas faltando
  - drift entre ambientes (staging/prod)

## Triage (5 minutos)

1) Validar se o banco está acessível
- Local (Supabase CLI): `npx supabase status --workdir .`
- Conectividade: `psql "$SUPABASE_DB_URL" -c "select 1"`

2) Checar saúde dos serviços
- `curl -fsS http://localhost:4000/health` (API)
- `curl -fsS http://localhost:5000/ready` (Agent Runtime)

3) Checar logs
- Local: `docker compose -f infra/compose/docker-compose.yml logs --tail=200 backoffice-api agent-runtime`
- Supabase (remoto): usar logs do projeto (Dashboard)

## Diagnóstico (detalhado)

### 1) Variáveis de ambiente e URLs

- `SUPABASE_DB_URL` deve apontar para Postgres (porta 5432/54322 no local).
- `SUPABASE_URL` deve apontar para o API Gateway (porta 54321 no local).

Erros típicos:
- `SUPABASE_DB_URL (or DATABASE_URL) is required` (PostgresService / ConnectionPool)
- `ECONNREFUSED` / `timeout` (banco indisponível ou firewall)

### 2) Locks e queries lentas

Checar sessões e locks:

```sql
select pid, usename, state, wait_event_type, wait_event, query
from pg_stat_activity
where datname = current_database()
order by state desc, pid;
```

```sql
select locktype, relation::regclass, mode, granted, pid
from pg_locks
order by granted, pid;
```

Mitigação (com cuidado):
- cancelar query: `select pg_cancel_backend(<pid>);`
- encerrar sessão: `select pg_terminate_backend(<pid>);`

### 3) Migrações e drift

Local:
- aplicar migrações: `npx supabase db push --workdir . --local --include-roles`
- rodar testes de RLS: `npm -w @wolfgang/backoffice-api run test:rls`

Produção:
- aplicar migrações via pipeline controlado (nunca manual “no susto”)
- validar versionamento em `supabase/migrations/`

### 4) Erros de RLS

Sintomas:
- `permission denied for table ...`
- respostas vazias para tenants corretos

Checklist:
- claims JWT corretas (`company_id`, `role`)
- policies presentes na tabela alvo
- uso do schema correto (`core` vs tenant)

## Mitigação / Recovery

- Reiniciar serviços consumidores se a conexão ficou “presa”:
  - local: `docker compose -f infra/compose/docker-compose.yml restart backoffice-api agent-runtime`
- Reaplicar migrações (local):
  - `npx supabase db push --workdir . --local --include-roles`
- Em produção: escalar/mitigar com read replicas, aumentar pool, e aplicar mudanças com janela.

## Coleta para pós-incidente

- Janela do incidente (UTC) e deploys feitos
- Trechos de log (request_id/correlation_id)
- Métricas: latência p95, taxa de erro, conexões ativas
- Queries/locks relevantes (pg_stat_activity / pg_locks)

## Escalação

- Se não houver recuperação em 15 minutos: acionar responsável de infra/DBA
- Se o impacto for multi-tenant (RLS vazando ou bloqueando): incident P0
