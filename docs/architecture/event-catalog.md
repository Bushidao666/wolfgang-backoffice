# Catálogo de Eventos (Redis Pub/Sub) — Wolfgang Backoffice

Este documento formaliza os **eventos cross-service** publicados via **Redis Pub/Sub**.

## Objetivos

- Padronizar nomes de canais e payloads
- Garantir rastreabilidade (correlation/causation)
- Definir regras de **idempotência** e versionamento

## Convenções

### Envelope padrão

Todo evento trafega com um envelope comum:

```json
{
  "id": "evt_01J8Z0P3H1Y8K8Q0KQ9VJ8X7K1",
  "type": "message.received",
  "version": 1,
  "occurred_at": "2025-12-16T12:00:00.000Z",
  "company_id": "cmp_01J8Z0P1F7K4V6E9QW3M0N1B2C",
  "source": "evolution-manager",
  "correlation_id": "cor_01J8Z0P2T0Q1V9G7H6J5K4L3M2",
  "causation_id": null,
  "payload": {}
}
```

### Versionamento

- `version` é incrementado apenas quando o schema do `payload` muda de forma incompatível.
- Consumers devem ser tolerantes a campos extras e tratar campos ausentes com defaults seguros.

### Idempotência

Redis Pub/Sub é **at-most-once** por natureza; quando combinado com replays/retentativas (ex.: consumers com retry), deve-se tratar como **at-least-once**.

Regras:

- Todo evento tem `id` único (ULID/UUID).
- Consumers devem persistir `id` consumidos quando a ação for side-effect (ex.: envio ao Facebook CAPI, criação de contrato, handoff).
- Producers devem evitar duplicidade usando `correlation_id` + `causation_id` e chaves naturais do domínio (ex.: `message_id` do canal).

## Canais e Eventos

| Canal | Producer | Consumers |
|------|----------|-----------|
| `message.received` | evolution-manager | agent-runtime |
| `message.sent` | agent-runtime | evolution-manager |
| `lead.created` | agent-runtime | facebook-capi, backoffice-api |
| `lead.qualified` | agent-runtime | backoffice-api, facebook-capi |
| `contract.created` | autentique-service | backoffice-api |
| `contract.signed` | autentique-service | facebook-capi, backoffice-api |
| `instance.status` | evolution-manager | backoffice-api |

---

## Evento: `message.received`

### Descrição

Emitido quando uma nova mensagem chega por um canal (inicialmente WhatsApp via Evolution API).

### Payload (v1)

```json
{
  "instance_id": "ins_...",
  "lead_external_id": "wa:+5511999999999",
  "from": "+5511999999999",
  "body": "Olá, quero um orçamento",
  "media": {
    "type": "image|audio|document",
    "url": "https://...",
    "mime_type": "image/jpeg",
    "sha256": "..."
  },
  "raw": {}
}
```

### Idempotência

- Chave recomendada: `instance_id + raw.message_id` (quando disponível) ou `sha256(body+timestamp+from)` como fallback.

---

## Evento: `message.sent`

### Descrição

Emitido pelo Agent Runtime com a resposta final e/ou mensagens em chunks.

### Payload (v1)

```json
{
  "instance_id": "ins_...",
  "to": "+5511999999999",
  "messages": [
    { "type": "text", "text": "Perfeito! Qual a data do evento?" }
  ],
  "raw": {}
}
```

### Idempotência

- Chave recomendada: `correlation_id + index_da_mensagem`.

---

## Evento: `lead.created`

### Descrição

Emitido quando um lead é criado no CORE.

### Payload (v1)

```json
{
  "lead_id": "lead_...",
  "company_id": "cmp_...",
  "channel": "whatsapp|instagram|telegram",
  "source": "organic|ads|referral|unknown",
  "utm": {
    "source": "facebook",
    "medium": "cpc",
    "campaign": "xmas",
    "content": "ad-1",
    "term": "buffet"
  }
}
```

---

## Evento: `lead.qualified`

### Descrição

Emitido quando o lead atinge critérios de qualificação (score e/ou rules).

### Payload (v1)

```json
{
  "lead_id": "lead_...",
  "company_id": "cmp_...",
  "score": 0.86,
  "criteria": ["budget", "date", "location"],
  "summary": "Lead qualificado para buffet em 12/03, 120 pessoas."
}
```

### Idempotência

- Chave recomendada: `lead_id + qualified_at (trunc)`, mantendo apenas o primeiro qualificado.

---

## Evento: `contract.created`

### Descrição

Emitido quando um contrato foi gerado/enviado para assinatura.

### Payload (v1)

```json
{
  "contract_id": "ctr_...",
  "deal_id": "deal_...",
  "company_id": "cmp_...",
  "value": 15000,
  "currency": "BRL"
}
```

---

## Evento: `contract.signed`

### Descrição

Emitido quando o contrato muda para estado assinado (Autentique webhook).

### Payload (v1)

```json
{
  "contract_id": "ctr_...",
  "deal_id": "deal_...",
  "company_id": "cmp_...",
  "signed_at": "2025-12-16T12:00:00.000Z",
  "value": 15000,
  "currency": "BRL"
}
```

---

## Evento: `instance.status`

### Descrição

Emitido quando a instância do canal muda de estado (ex.: conectado/desconectado).

### Payload (v1)

```json
{
  "instance_id": "ins_...",
  "company_id": "cmp_...",
  "channel": "whatsapp|instagram|telegram",
  "status": "connected|disconnected|error",
  "details": {}
}
```

---

## Observabilidade mínima

Todos os producers e consumers devem logar:

- `event.id`, `event.type`, `event.version`
- `company_id`
- `correlation_id` e `causation_id`
- `source`

## Segurança

- Webhooks externos devem validar assinatura/secret antes de publicar no Redis.
- Nunca publicar secrets nos payloads.
