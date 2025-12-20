# Runbook — Agent Runtime travado (debounce/processing)

Este runbook cobre incidentes em que o `agent-runtime` deixa conversas “presas” em `debounce_state='processing'` (ou não consome conversas que já venceram `debounce_until`), resultando em ausência de respostas ao lead.

## Sintomas comuns

- Lead envia mensagens, mas não recebe resposta.
- Logs mostram `message_received.*`, porém não há `message_sent.*`.
- Muitas conversas ficam com `debounce_state='processing'` por vários minutos.
- Endpoint `GET /ready` retorna `degraded` (DB/Redis).

## Pré-requisitos

- Acesso ao Postgres (conexão direta) e ao Redis do ambiente.
- Acesso a logs do `agent-runtime` (evolution-manager opcional, para checar outbound).

---

## 1) Checagem rápida de saúde

### Agent Runtime

- `GET /health` deve retornar `status=ok`
- `GET /ready` deve retornar `ready=true`

Se `ready=false`:

1) Verifique conectividade com Redis (`REDIS_URL`) e Postgres (`SUPABASE_DB_URL`).
2) Verifique se `DISABLE_CONNECTIONS=true` (modo sem workers) ou falha no startup.

---

## 2) Verificar se os workers estão rodando

O `agent-runtime` inicia workers no startup (subscriber + debounce + watchdog) quando:

- `DISABLE_WORKERS=false`
- `DISABLE_CONNECTIONS=false`

Se `DISABLE_WORKERS=true`, o runtime sobe a API mas não processa mensagens.

**Ação:** corrigir env vars e reiniciar o serviço.

---

## 3) Diagnóstico via banco (conversas presas)

### 3.1) Conversas travadas em `processing`

```sql
select
  id,
  company_id,
  lead_id,
  channel_type,
  debounce_state,
  debounce_until,
  jsonb_array_length(coalesce(pending_messages, '[]'::jsonb)) as pending_count,
  updated_at
from core.conversations
where debounce_state = 'processing'
order by updated_at asc
limit 100;
```

Heurística:

- Se `updated_at` está muito antigo (ex.: > 2–5 min) e `pending_count > 0`, a conversa travou antes de enviar.
- Se `pending_count = 0`, normalmente é safe resetar para `idle`.

### 3.2) Conversas que deveriam ser processadas (`waiting` vencido)

```sql
select
  id,
  company_id,
  lead_id,
  channel_type,
  debounce_state,
  debounce_until,
  jsonb_array_length(coalesce(pending_messages, '[]'::jsonb)) as pending_count,
  updated_at
from core.conversations
where debounce_state = 'waiting'
  and debounce_until is not null
  and debounce_until <= now()
order by debounce_until asc
limit 100;
```

Se existir backlog aqui, o `DebounceWorker` pode estar parado (ou sem lock/sem Redis).

---

## 4) Recovery automático (watchdog)

O runtime possui um watchdog (`ConversationWatchdog`) que recupera conversas que ficaram em `processing` por tempo demais:

- procura `processing` com `updated_at < now() - WATCHDOG_STUCK_AFTER_S`
- se `pending_messages` existe: move para `waiting` com `debounce_until=now()`
- se vazio: move para `idle`

**Se o watchdog estiver habilitado**, o ideal é:

1) corrigir causa raiz (crash/DB/Redis)
2) aguardar 1–2 ciclos (`WATCHDOG_POLL_INTERVAL_S`) para recuperação

---

## 5) Recovery manual (SQL) — com cuidado

> Use apenas quando o watchdog não está rodando ou quando é necessário destravar imediatamente.

### 5.1) Voltar para `waiting` (mantendo pending)

```sql
update core.conversations
set debounce_state = 'waiting',
    debounce_until = now(),
    updated_at = now()
where id = '<conversation_id>'
  and debounce_state = 'processing'
  and jsonb_array_length(coalesce(pending_messages, '[]'::jsonb)) > 0;
```

### 5.2) Limpar para `idle` (quando não há pending)

```sql
update core.conversations
set debounce_state = 'idle',
    debounce_until = null,
    pending_messages = '[]'::jsonb,
    updated_at = now()
where id = '<conversation_id>'
  and debounce_state = 'processing'
  and jsonb_array_length(coalesce(pending_messages, '[]'::jsonb)) = 0;
```

---

## 6) Se ainda não processa: checar idempotência (event_consumptions)

O runtime usa `core.event_consumptions` para idempotência. Em crashes no meio do processamento, um dedupe pode “segurar” reprocessamentos até expirar (`expires_at`).

### 6.1) Ver últimas chaves de inbound (`message.received`)

```sql
select created_at, expires_at, consumer, dedupe_key, correlation_id, event_id, metadata
from core.event_consumptions
where consumer = 'agent-runtime:message.received'
order by created_at desc
limit 50;
```

### 6.2) Reprocessar um `message.received` específico (somente se necessário)

1) Remover a chave (para permitir reprocessamento):

```sql
delete from core.event_consumptions
where company_id = '<company_id>'
  and consumer = 'agent-runtime:message.received'
  and dedupe_key = 'message.received:<correlation_id>';
```

2) Re-publicar o envelope (ver `docs/runbooks/runbook-webhooks.md` para replay).

> Atenção: isso pode gerar duplicidade se o provider também reenviar. Use com parcimônia e apenas para um `correlation_id` conhecido.

---

## 7) Validação pós-recovery

Checklist:

1) Query de `processing` (passo 3.1) reduzindo para ~0.
2) Conversas `waiting` vencidas (passo 3.2) sendo consumidas.
3) Logs do runtime mostram:
   - `watchdog.recovered_*` (se aplicável)
   - `message.sent` sendo publicado
4) Evolution Manager (para outbound):
   - logs `message_sent.*` sem erros de envio
   - para WhatsApp, mídia só quando suportado

---

## 8) Causas raiz típicas

- `DISABLE_WORKERS=true` em produção (runtime sobe mas não processa).
- Redis indisponível (subscriber/debounce não rodam).
- Postgres indisponível (não grava conversas/mensagens).
- Crash durante envio (ex.: provider instável) e reprocessamento bloqueado por idempotência até expirar.
