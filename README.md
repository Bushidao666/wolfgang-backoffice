# Wolfgang Backoffice (Monorepo)

Backoffice multi-tenant para a holding, com arquitetura orientada a eventos (Redis Pub/Sub) e base em Supabase/Postgres.

## Requisitos

- Docker + Docker Compose (v2)
- Node.js (recomendado: 20+)
- Python 3.12+

## Quick start (desenvolvimento)

1. Configure variáveis:
   - `cp .env.example .env`
2. Instale dependências:
   - `npm install`
3. (Opcional) Suba Supabase local:
   - `npm install -g supabase`
   - `supabase start`
4. Suba os serviços:
   - `docker compose -f infra/compose/docker-compose.yml up --build`

## Dev usando Supabase Cloud (sem Supabase local)

1. Copie o template:
   - `cp .env.cloud.example .env`
2. Preencha no `.env` (no Supabase Dashboard → Project Settings → API):
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_DB_URL` (senha do DB)
3. Suba os serviços:
   - `docker compose -f infra/compose/docker-compose.yml up --build`

Se o `agent-runtime` cair com `OSError: [Errno 101] Network is unreachable`, seu Docker provavelmente não tem rota IPv6 (o host direto do DB do Supabase é IPv6 por padrão). Use o override:

- `docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.agent-runtime-host.yml up --build`

Serviços:

- Backoffice Web: http://localhost:3000
- Backoffice API (Swagger): http://localhost:4000/api/docs
- Agent Runtime: http://localhost:5000/health
- Evolution Manager: http://localhost:4001/health
- Autentique Service: http://localhost:4002/health
- Facebook CAPI: http://localhost:4003/health

## Deploy no Railway (monorepo, sem docker-compose)

O Railway sobe cada serviço isolado. Este repo já tem `railway.json` + scripts por serviço (Railpack) para instalar os workspaces no diretório raiz e buildar apenas o app alvo.

Obs.: os arquivos de Docker Compose ficam em `infra/compose/` para evitar o autodetect do Railway.

1. Crie **um serviço por app** (6 serviços): `backoffice-web`, `backoffice-api`, `agent-runtime`, `evolution-manager`, `autentique-service`, `facebook-capi`.
2. Recomendo manter o *Root Directory* no **repo root** (para os workspaces `packages/*` funcionarem).
3. Builder: Railpack.
4. Configure o serviço para usar o manifest do app:
   - Se sua conta/UI tiver *Service Manifest Path*, selecione o `railway.json` do app (ex.: `backoffice-api/railway.json`).
   - Caso contrário, configure manualmente os comandos do serviço:
     - Build: `bash <app>/railway-build.sh`
     - Start: `bash <app>/railway-start.sh`
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

## Documentação

- Backlog: `BACKLOG.md`, `BACKLOG_DETALHADO.md`
- Catálogo de eventos: `docs/architecture/event-catalog.md`
