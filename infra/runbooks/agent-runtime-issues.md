# Runbook: Agent Runtime

Este runbook cobre incidentes do serviço **`agent-runtime`** (FastAPI), responsável por processar eventos, qualificar leads e responder mensagens.

## Healthchecks

- `GET /health` → 200 (sempre que o processo estiver de pé)
- `GET /ready` → indica dependências (`db`, `redis`) e readiness real
- `GET /metrics` → métricas Prometheus

## Sintomas comuns

- Bot não responde (sem `message.sent`)
- `POST /centurions/:id/test` retorna 503 (`connections disabled` ou `service not ready`)
- `GET /ready` retorna `degraded`
- Alto tempo de resposta / timeouts
- Erros de integração OpenAI (API key ausente, rate limit)

## Triage (5 minutos)

1) Verificar readiness
- `curl -fsS http://localhost:5000/ready | jq`

2) Verificar variáveis de ambiente
- `DISABLE_CONNECTIONS=true` faz o serviço subir sem DB/Redis (útil para testes, mas “mata” produção).
- `SUPABASE_DB_URL` e `REDIS_URL` devem existir em produção.

3) Ver logs
- Local: `docker compose -f infra/compose/docker-compose.yml logs --tail=200 agent-runtime`
- Procurar `request_id`/`correlation_id` e eventos `message_received.*`, `handoff.*`, `rag.*`

## Diagnóstico (detalhado)

### 1) Dependências (DB/Redis)

Se `/ready` falhar:
- DB: testar `psql "$SUPABASE_DB_URL" -c "select 1"`
- Redis: `redis-cli ping`

### 2) Workers (debounce/followups/cleanup)

Se o serviço sobe mas não processa:
- garantir `DISABLE_WORKERS=false` em produção
- checar logs de `debounce.tick_failed`, `followup.tick_failed`, `memory_cleanup.failed`

### 3) OpenAI

⚠️ No vNext, o runtime **não lê OPENAI_API_KEY de env**.

Se a integração OpenAI estiver **desabilitada** ou **sem `api_key`** para a empresa:
- STT/vision/embeddings não funcionam (erros do tipo “OpenAI integration not configured …”)
- algumas rotinas caem em fallback determinístico (ex.: extração de fatos via regex), reduzindo qualidade mas mantendo o fluxo básico

Checklist de diagnóstico:
- conferir `core.integration_credential_sets` (provider `openai`) e se existe um default
- conferir `core.company_integration_bindings` para a empresa (modo `global/custom/disabled`)
- observar erros de rate limit/timeout nos logs do runtime e do provedor

## Mitigação / Recovery

- Reiniciar o serviço:
  - `docker compose -f infra/compose/docker-compose.yml restart agent-runtime`
- Se DB/Redis instáveis, mitigar primeiro dependências.
- Reduzir pressão:
  - aumentar pool de DB (`DB_POOL_MAX`)
  - aumentar recursos do container

## Coleta para pós-incidente

- logs e métricas (latência, taxa de erro)
- número de eventos `domain_events_total` por tipo
- status de DB/Redis

## Escalação

- Incidente P0 se o bot parar de responder para múltiplos tenants.
