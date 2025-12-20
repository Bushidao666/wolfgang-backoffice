# Wolfgang Backoffice (Monorepo)

Backoffice multi-tenant para a holding, com arquitetura orientada a eventos (Redis Pub/Sub) e base em Supabase/Postgres.

## Requisitos

- Node.js (recomendado: 20+)
- Python 3.12+
- Redis (local ou managed)

## Quick start (desenvolvimento)

1. Configure variáveis:
   - `cp .env.example .env`
2. Instale dependências:
   - `npm ci --workspaces --include-workspace-root`
3. Suba os serviços (em terminais separados):
   - API: `npm -w @wolfgang/backoffice-api run start:dev`
   - Web: `npm -w @wolfgang/backoffice-web run dev`
   - Evolution: `npm -w @wolfgang/evolution-manager run start:dev`
   - Autentique: `npm -w @wolfgang/autentique-service run start:dev`
   - Facebook CAPI: `npm -w @wolfgang/facebook-capi run start:dev`
   - Agent Runtime: `cd agent-runtime && python3 -m pip install -r requirements.txt && python3 -m uvicorn api.main:app --host 0.0.0.0 --port 5000`

## Dev usando Supabase Cloud (sem Supabase local)

1. Copie o template:
   - `cp .env.cloud.example .env`
2. Preencha no `.env` (no Supabase Dashboard → Project Settings → API):
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_DB_URL` (senha do DB)
3. Suba os serviços (mesmo fluxo do dev acima).

Serviços:

- Backoffice Web: http://localhost:3000
- Backoffice API (Swagger): http://localhost:4000/api/docs
- Agent Runtime: http://localhost:5000/health
- Evolution Manager: http://localhost:4001/health
- Autentique Service: http://localhost:4002/health
- Facebook CAPI: http://localhost:4003/health

## Deploy no Railway (monorepo, sem docker-compose)

O Railway sobe cada serviço isolado. Este repo **não tem Dockerfiles** e usa **Railpack** + scripts `.sh`.

1. Crie **um serviço por app** (6 serviços): `backoffice-web`, `backoffice-api`, `agent-runtime`, `evolution-manager`, `autentique-service`, `facebook-capi`.
2. Use o *Root Directory* no **repo root** (necessário por causa dos `workspaces` em `packages/*`).
3. Builder: Railpack.
4. Opção mais simples: use `railway.json` da raiz (`railway.json:1`) e configure **uma variável por serviço**:
   - `RAILWAY_SERVICE_DIR=backoffice-api` (ou `backoffice-web`, `agent-runtime`, etc.)
5. Adicione um Redis no Railway (plugin) e configure `REDIS_URL` igual para os serviços que usam Redis.
6. Configure as variáveis por serviço usando os exemplos:
   - `backoffice-web/.env.example`
   - `backoffice-api/.env.example`
   - `agent-runtime/.env.example`
   - `evolution-manager/.env.example`
   - `autentique-service/.env.example`
   - `facebook-capi/.env.example`

Nota (Next.js): `NEXT_PUBLIC_*` precisa estar setado **no build** do `backoffice-web` (senão o bundle pode sair com valores vazios).

Nota (Supabase DB): se algum serviço precisar de `SUPABASE_DB_URL` em produção (ex.: `agent-runtime`), use a connection string do **Pooler** no Supabase (IPv4), porque `db.<ref>.supabase.co` costuma ser IPv6-only.

## Testes

- Unit (workspace): `npm test`
- E2E (Playwright): `npm run e2e`
- Agent Runtime: `cd agent-runtime && poetry install && poetry run pytest`
- OpenAPI: `npm -w @wolfgang/backoffice-api run openapi:generate`

## Migrations (drift control)

- Drift check (repo vs DB): `infra/db/migrations-check.sh`
- Apply controlado: `infra/db/migrations-apply.sh`
- Runbook: `docs/runbooks/runbook-migrations.md`

## Documentação

- Backlog: `BACKLOG.md`, `BACKLOG_DETALHADO.md`
- Catálogo de eventos: `docs/architecture/event-catalog.md`
