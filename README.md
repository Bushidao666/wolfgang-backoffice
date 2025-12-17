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
   - `docker compose up --build`

Serviços:

- Backoffice Web: http://localhost:3000
- Backoffice API (Swagger): http://localhost:4000/api/docs
- Agent Runtime: http://localhost:5000/health
- Evolution Manager: http://localhost:4001/health
- Autentique Service: http://localhost:4002/health
- Facebook CAPI: http://localhost:4003/health

## Testes

- Unit (workspace): `npm test`
- E2E (Playwright): `npm run e2e`
- Agent Runtime: `cd agent-runtime && poetry install && poetry run pytest`
- OpenAPI: `npm -w @wolfgang/backoffice-api run openapi:generate`

## Documentação

- Backlog: `BACKLOG.md`, `BACKLOG_DETALHADO.md`
- Catálogo de eventos: `docs/architecture/event-catalog.md`
