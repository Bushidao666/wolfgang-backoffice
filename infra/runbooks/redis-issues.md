# Runbook: Redis (Pub/Sub + Cache)

Este runbook cobre incidentes envolvendo **Redis**, usado para **Pub/Sub** (eventos cross-service) e cache (ex.: memória curta).

## Escopo

- Serviços afetados: `agent-runtime`, `backoffice-api`, `evolution-manager`, `autentique-service`, `facebook-capi`
- Funcionalidades afetadas: pipeline de mensagens, eventos de lead/contrato, cache de conversas

## Sintomas comuns

- Mensagens não “andam” (não há resposta do bot)
- Eventos não chegam nos consumers (ex.: `message.received` não processa)
- `GET /ready` falha com `checks.redis=failed` (agent-runtime)
- Erros: `RedisClient not connected`, `ECONNREFUSED`, `READONLY`, `OOM`

## Triage (5 minutos)

1) Verificar Redis responde
- Local: `redis-cli -h localhost -p 6379 ping`

2) Verificar containers/logs
- `docker compose ps`
- `docker compose logs --tail=200 redis`

3) Verificar fluxo de eventos
- `evolution-manager` publica `message.received`
- `agent-runtime` publica `message.sent` e `lead.*`
- `docker compose logs --tail=200 evolution-manager agent-runtime`

## Diagnóstico (detalhado)

### Conectividade

- `REDIS_URL` correto em todos os serviços.
- Em Docker Compose, use hostname do serviço (`redis://redis:6379`).
- Em localhost, use `redis://localhost:6379`.

### Backpressure / memória

Mesmo com Pub/Sub, Redis pode ficar indisponível por pressão de memória/CPU.

Comandos úteis:
- `redis-cli info memory`
- `redis-cli info stats`
- `redis-cli info clients`

### Pub/Sub: validação rápida

Em um terminal:
- `redis-cli subscribe message.received`

Em outro terminal (publicar teste):
- `redis-cli publish message.received '{"type":"test","payload":{}}'`

## Mitigação / Recovery

- Reiniciar Redis (local):
  - `docker compose restart redis`
- Reiniciar consumers/producers se houver reconexão travada:
  - `docker compose restart evolution-manager agent-runtime backoffice-api`
- Ajustar limites:
  - aumentar memória disponível
  - reduzir payloads e logs muito verbosos

## Coleta para pós-incidente

- `redis-cli info` (memory/stats/clients)
- logs com request_id/correlation_id
- taxa de eventos por minuto (`domain_events_total` / `http_requests_total`)

## Escalação

- Se Redis impactar pipeline de mensagens: incident P0

