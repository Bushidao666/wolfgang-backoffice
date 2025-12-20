# Runbook — Webhooks (Evolution / Telegram) + replay de eventos

Este runbook cobre incidentes onde webhooks não chegam, chegam mas não viram eventos, ou eventos precisam ser reprocessados.

## Escopo

- Evolution Manager:
  - `POST /webhooks/evolution` (WhatsApp/Instagram via Evolution API)
  - `POST /webhooks/telegram/:instanceId` (Telegram)
- Pipeline de eventos:
  - Producer publica `message.received` no Redis
  - Agent Runtime consome `message.received` e publica `message.sent`
  - Evolution Manager consome `message.sent` e envia no canal

## Sintomas comuns

- Leads não entram no runtime (sem `message.received`).
- Leads entram, mas não há resposta (sem `message.sent`).
- Logs do Evolution Manager mostram `UnauthorizedException` (secret inválido).
- Telegram para de receber updates (webhook removido ou URL errada).

## Pré-requisitos

- Acesso aos logs do Evolution Manager e Agent Runtime.
- Acesso ao Redis do ambiente (`redis-cli`).
- Conhecer `WEBHOOK_SECRET` (e `TELEGRAM_WEBHOOK_SECRET`, se usado).

---

## 1) Validar secrets e endpoints

### 1.1) Evolution webhook

Endpoint:

- `POST /webhooks/evolution`
- Header obrigatório: `x-webhook-secret: <WEBHOOK_SECRET>`

**Teste rápido (deve retornar 200/204; payload inválido é ignorado):**

```bash
curl -i -X POST "${EVOLUTION_MANAGER_URL}/webhooks/evolution" \
  -H "x-webhook-secret: ${WEBHOOK_SECRET}" \
  -H "content-type: application/json" \
  --data '{"event":"noop"}'
```

Se retornar `401`, o secret está incorreto ou não foi configurado no serviço/provider.

### 1.2) Telegram webhook

Endpoint:

- `POST /webhooks/telegram/:instanceId`
- Header obrigatório: `x-telegram-bot-api-secret-token: <TELEGRAM_WEBHOOK_SECRET>`
  - fallback: `WEBHOOK_SECRET` (se `TELEGRAM_WEBHOOK_SECRET` não estiver setado)

**Teste rápido:**

```bash
curl -i -X POST "${EVOLUTION_MANAGER_URL}/webhooks/telegram/${INSTANCE_ID}" \
  -H "x-telegram-bot-api-secret-token: ${TELEGRAM_WEBHOOK_SECRET}" \
  -H "content-type: application/json" \
  --data '{"update_id": 1}'
```

Se retornar `401`, o secret do header não bate com o esperado.

---

## 2) Confirmar publicação de eventos no Redis

### 2.1) Observar inbound (`message.received`)

```bash
redis-cli -u "${REDIS_URL}" SUBSCRIBE message.received
```

Envie uma mensagem real no canal e verifique se um envelope JSON chega.

### 2.2) Observar outbound (`message.sent`)

```bash
redis-cli -u "${REDIS_URL}" SUBSCRIBE message.sent
```

Se o runtime estiver processando, você deve ver envelopes publicados após o debounce.

---

## 3) Quando `message.received` chega, mas runtime não processa

1) Verifique `agent-runtime`:
   - `GET /ready` deve ser `ready=true`
2) Verifique backlog de conversas (`debounce_state`) e recovery:
   - use `docs/runbooks/runbook-agent-runtime-stuck-processing.md`

---

## 4) Replay manual de um `message.received`

Use para reprocessar uma mensagem específica (ex.: incidente de webhook/Redis).

### 4.1) Construir envelope mínimo

Exemplo (ajuste ids/valores):

```json
{
  "id": "evt-replay-1",
  "type": "message.received",
  "version": 1,
  "occurred_at": "2025-12-19T00:00:00.000Z",
  "company_id": "co_...",
  "source": "replay",
  "correlation_id": "corr_...",
  "causation_id": null,
  "payload": {
    "instance_id": "inst_...",
    "lead_external_id": "+5511999999999",
    "from": "+5511999999999",
    "body": "Mensagem para reprocessar",
    "media": null,
    "raw": { "message_id": "corr_..." }
  }
}
```

### 4.2) Publicar no Redis

```bash
redis-cli -u "${REDIS_URL}" PUBLISH message.received "$(cat envelope.json)"
```

### 4.3) Se nada acontecer: idempotência pode estar bloqueando

O runtime deduplica inbound usando `core.event_consumptions`:

- `consumer='agent-runtime:message.received'`
- `dedupe_key='message.received:<correlation_id>'`

Remover a chave (somente se necessário) e re-publicar:

```sql
delete from core.event_consumptions
where company_id = '<company_id>'
  and consumer = 'agent-runtime:message.received'
  and dedupe_key = 'message.received:<correlation_id>';
```

---

## 5) Quando `message.sent` é publicado, mas o canal não entrega

### 5.1) Checar logs do Evolution Manager

Erros comuns:

- `message_sent.instance_not_found`
- `message_sent.whatsapp_send_failed`
- `message_sent.telegram_missing_token`
- `message_sent.instagram_send_failed`

### 5.2) Idempotência do subscriber (Redis setNx)

O subscriber do Evolution Manager deduplica por Redis com a chave:

`idempotency:message.sent:<company_id>:<correlation_id>:<chunk_index>`

Se o serviço cair após “claim” e antes de enviar, a chave pode bloquear o reenvio até expirar.

**Ação (com cuidado):** apagar a chave específica no Redis e re-publicar `message.sent` (ou aguardar TTL).

```bash
redis-cli -u "${REDIS_URL}" DEL "idempotency:message.sent:${COMPANY_ID}:${CORRELATION_ID}:${CHUNK_INDEX}"
```

---

## 6) Checklist final

- Webhooks retornando 200 e sem 401.
- `message.received` observado no Redis.
- `agent-runtime` processa e publica `message.sent`.
- Evolution Manager envia no canal (sem erros em logs).
