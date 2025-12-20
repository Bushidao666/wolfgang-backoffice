# Arquitetura Micro: Agent Runtime — Contratos Canônicos de Canal v1.0

**Documento ID:** ARCH-agent-runtime-channel-contracts-v1.0  
**Módulo:** Agent Runtime  
**Bounded Context:** Mensageria Multi-Canal (WhatsApp/Instagram/Telegram)  
**Data de Criação:** 2025-12-19  
**Última Atualização:** 2025-12-19  
**Baseado em:** `docs/architecture/arch-micro-agent-runtime.md` e `docs/architecture/event-catalog.md`  
**Status:** Draft  

---

## Objetivo

Formalizar um **contrato canônico** (multi-canal) para:

- `message.received` (inbound) → entrada única para o runtime
- `message.sent` (outbound) → saída única do runtime

E padronizar:

- **Normalização** via adapters por canal
- **Capacidades por canal** (o que pode/ não pode ser enviado)
- **Idempotência** e “chaves naturais” de mensagens

---

## Onde está no código

- Contratos (models canônicos):
  - `agent-runtime/src/modules/channels/contracts/events.py`
- Normalização + capabilities:
  - `agent-runtime/src/modules/channels/services/channel_router.py`
  - `agent-runtime/src/modules/channels/adapters/base_adapter.py`
  - `agent-runtime/src/modules/channels/adapters/instagram_adapter.py`
  - `agent-runtime/src/modules/channels/adapters/telegram_adapter.py`
- Uso no pipeline do runtime:
  - Inbound: `agent-runtime/src/modules/centurion/handlers/message_handler.py`
  - Outbound (capabilities + envio): `agent-runtime/src/modules/centurion/services/centurion_service.py`

---

## Conceitos

### 1) “Canônico” vs “Específico do canal”

- **Canônico**: campos mínimos que o runtime precisa para operar (lead + texto + mídia opcional + rastreabilidade).
- **Específico do canal**: tudo o que for particular do provider (estrutura do webhook, ids, payloads brutos) deve ficar em `payload.raw`.

### 2) Prefixos por canal (anti-colisão)

Para que ids de leads/conversas não colidam entre canais, usamos prefixos no `from`/`lead_external_id` quando não é um telefone:

- WhatsApp: `+5511999999999`
- Instagram: `instagram:<id>`
- Telegram: `telegram:<chat_id>`

**Regra:** o runtime pode aceitar inbound já prefixado (preferível), mas o adapter também é “idempotente” e adiciona prefixo caso esteja faltando.

### 3) Capabilities (o que cada canal suporta no sistema)

Capabilities são definidas por adapter e aplicadas pelo router antes do envio:

- WhatsApp: `text`, `image`, `video`, `audio`, `document`
- Instagram/Telegram: apenas `text` (no estado atual do sistema)

Isso garante que o runtime não publique `message.sent` com tipos que a ponta não sabe enviar.

---

## Contrato: `message.received` (v1)

### Envelope

O runtime consome eventos no formato de envelope (ver `common.infrastructure.events.envelope`):

- `type`: `"message.received"`
- `company_id`: empresa dona da instância
- `correlation_id`: idempotência (idealmente o id da mensagem no provider)
- `payload`: segue schema abaixo

### Payload (canônico)

Campos canônicos mínimos (v1):

| Campo | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `instance_id` | `string` | sim | id da instância (`core.channel_instances.id`) |
| `lead_external_id` | `string` | preferível | id estável do lead no canal (pode ser igual ao `from`) |
| `from` | `string` | sim | identificador do remetente no canal (telefone ou id prefixado) |
| `body` | `string \| null` | não | texto da mensagem (quando houver) |
| `media` | `object \| null` | não | metadados mínimos da mídia (quando houver) |
| `raw` | `object` | não | payload bruto/provider-specific |

### `media` (inbound)

| Campo | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `type` | `image \| audio \| document` | sim | tipo da mídia |
| `url` | `string` | sim | URL de download |
| `mime_type` | `string` | sim | mime type |
| `sha256` | `string` | não | hash (quando disponível) |

### Regras de normalização no runtime

O `MessageHandler` aplica:

- Normalização do sender via `ChannelRouter.normalize_inbound(...)`
- Persistência em `core.messages` com:
  - `channel_message_id` (quando disponível via `raw.message_id`, ou extraído pelo adapter)
  - `metadata.raw` para rastreabilidade
- Enriquecimento de mídia (STT/Vision) quando aplicável

---

## Contrato: `message.sent` (v1)

### Payload (canônico)

| Campo | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `instance_id` | `string` | sim | id da instância |
| `to` | `string` | sim | destinatário no canal (telefone ou id prefixado) |
| `messages` | `array` | sim | lista de mensagens (texto e/ou mídia) |
| `raw` | `object` | não | metadados (ex.: `chunk_index`) |

### Tipos suportados (outbound)

- Texto:
  - `{ "type": "text", "text": "..." }`
- Mídia (quando suportado pelo canal e pelo sistema):
  - `{ "type": "image|video|audio|document", "asset_id": "<uuid>", "caption": "opcional" }`
  - `{ "type": "image|video|audio|document", "url": "https://...", "mime_type": "..." }` (fallback/integrações)

### Regras de capabilities (enforcement)

O runtime aplica `ChannelRouter.filter_outbound(...)` antes de publicar `message.sent`.

- Se um canal não suporta mídia, mensagens não-texto são removidas do envio.
- O runtime sempre garante pelo menos uma mensagem de texto (fallback) para evitar “resposta vazia”.

---

## Exemplos

### 1) WhatsApp (texto)

```json
{
  "type": "message.received",
  "company_id": "co_...",
  "correlation_id": "wamid.XXX",
  "payload": {
    "instance_id": "inst_...",
    "lead_external_id": "+5511999999999",
    "from": "+5511999999999",
    "body": "Olá, quero um orçamento",
    "media": null,
    "raw": { "provider": "evolution", "message_id": "wamid.XXX" }
  }
}
```

### 2) Telegram (texto + `raw.update`)

```json
{
  "type": "message.received",
  "company_id": "co_...",
  "correlation_id": "12345",
  "payload": {
    "instance_id": "inst_...",
    "lead_external_id": "telegram:123456",
    "from": "telegram:123456",
    "body": "/start",
    "media": null,
    "raw": { "provider": "telegram", "update": { "update_id": 10, "message": { "message_id": 99, "text": "/start" } } }
  }
}
```

No runtime:

- `TelegramAdapter` extrai `raw.message_id` quando necessário (para `channel_message_id`).
- `TelegramAdapter` inclui `raw.telegram.command` quando a mensagem é comando.

### 3) Instagram (mídia sem texto)

```json
{
  "type": "message.received",
  "company_id": "co_...",
  "correlation_id": "m_123",
  "payload": {
    "instance_id": "inst_...",
    "lead_external_id": "instagram:abc",
    "from": "instagram:abc",
    "body": null,
    "media": { "type": "image", "url": "https://...", "mime_type": "image/jpeg" },
    "raw": { "provider": "evolution", "message_id": "m_123" }
  }
}
```

No runtime:

- O texto pode ser enriquecido via Vision (quando habilitado).
- Se o canal não suportar envio de mídia no outbound do sistema, o envio é degradado para texto.

---

## Guia rápido: adicionando um novo canal

1. Criar adapter em `agent-runtime/src/modules/channels/adapters/`:
   - estender `BaseChannelAdapter` ou `PrefixedChannelAdapter`
   - definir `channel_type` e `capabilities`
   - implementar `normalize_inbound(...)` (extração de `message_id`/texto em `raw` quando necessário)
2. Registrar no `ChannelRouter`
3. Atualizar `docs/architecture/event-catalog.md` (se houver novo tipo/campo canônico)
4. Adicionar testes em `agent-runtime/tests/test_channel_adapters.py`

---

## Notas de operação (idempotência)

- Inbound: preferir `correlation_id = message_id do provider` (ou equivalente).
- Outbound: idempotência recomendada por `correlation_id + chunk_index` (o runtime já publica `raw.chunk_index`).
- Sempre preservar `payload.raw` para debug/reprocessamento.
