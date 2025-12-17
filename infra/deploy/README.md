# Deploy Guide — Wolfgang Backoffice

Este guia descreve um fluxo de deploy seguro para o backoffice multi-serviço (V1), cobrindo pré-requisitos, migrações e smoke tests.

## Componentes

- `backoffice-web` (Next.js) — UI administrativa
- `backoffice-api` (Nest.js) — API principal (Swagger em `/api/docs`)
- `agent-runtime` (FastAPI) — processamento IA / workers
- `evolution-manager` (Nest.js) — integração WhatsApp / canais
- `autentique-service` (Nest.js) — contratos
- `facebook-capi` (Nest.js) — marketing / pixels
- Redis — Pub/Sub + cache
- Supabase/Postgres — banco e Auth
- Observabilidade: Prometheus + Jaeger (opcional)

## Princípios

- Deploy deve ser **repetível** e **idempotente**
- Migrações antes de tráfego (quando compatível)
- Sempre manter caminho de rollback
- Monitorar métricas e logs (request_id/correlation_id)

## Pré-requisitos

- Variáveis de ambiente configuradas (base em `.env.example`)
- Secrets gerenciados fora do repositório
- Migrações versionadas em `supabase/migrations/`
- Acesso aos dashboards de logs/métricas

## Ordem recomendada

1) Infra (Redis / observability)
2) Banco (migrações)
3) Serviços backend:
   - `backoffice-api`, `agent-runtime`, `evolution-manager`, `autentique-service`, `facebook-capi`
4) Frontend:
   - `backoffice-web`

## Migrações

- Local/staging (Supabase CLI):
  - `npx supabase db push --workdir . --local --include-roles`
- Produção:
  - aplicar migrações de forma controlada (pipeline), com validação pós-migração

## Smoke tests (mínimo)

- `backoffice-api`:
  - `GET /health` (200)
  - `GET /metrics` (200)
  - `GET /api/docs` (200)
- `agent-runtime`:
  - `GET /health` (200)
  - `GET /ready` (ready=true)
- `evolution-manager`:
  - `GET /health` (200)
- `backoffice-web`:
  - `GET /api/health` (200)
  - login e navegação básica

## Observabilidade

- Logs estruturados JSON em todos os serviços
- Métricas em `/metrics` (scrape pelo Prometheus)
- Tracing via OTEL (Jaeger/OTLP) quando habilitado

## Pós-deploy

- Acompanhar taxa de erro e latência por 30-60 min
- Validar fluxo E2E:
  - `message.received` → `agent-runtime` → `message.sent`
  - criação de empresa/tenant e leitura de leads

## Referências

- `infra/deploy/checklist.md`
- `infra/deploy/rollback.md`
- `infra/runbooks/*.md`

