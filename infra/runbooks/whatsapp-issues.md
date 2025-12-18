# Runbook: WhatsApp / Evolution Manager

Este runbook cobre incidentes do **`evolution-manager`**, responsável por integrar com WhatsApp (Evolution API) e publicar eventos no Redis.

## Sintomas comuns

- Não gera QR Code / não conecta
- `instance.status` fica em `error`/`disconnected`
- Mensagens chegam no WhatsApp mas não aparecem no sistema
- Bot não responde (pipeline `message.sent` não retorna)

## Triage (5 minutos)

1) Saúde do serviço
- `curl -fsS http://localhost:4001/health`

2) Verificar eventos no Redis
- `redis-cli subscribe message.received`
- enviar mensagem real e verificar se evento chega

3) Logs
- `docker compose -f infra/compose/docker-compose.yml logs --tail=200 evolution-manager`

## Diagnóstico (detalhado)

### 1) Variáveis de ambiente

- ⚠️ Credenciais da Evolution API **não** são lidas de env (vNext).
  - Elas vêm do banco (`core.integration_credential_sets` + `core.company_integration_bindings`) para a empresa selecionada.
- `WEBHOOK_SECRET` (quando aplicável) consistente com o produtor/consumer
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (para persistir estados no CORE)
- `CORS_ORIGIN` (se houver UI consumindo)

### 2) Fluxo de eventos (end-to-end)

1. Evolution Manager recebe webhook/mensagem
2. Publica `message.received` no Redis
3. Agent Runtime processa e publica `message.sent`
4. Evolution Manager consome `message.sent` e envia ao WhatsApp

Se quebrar:
- entre 1 e 2 → problema no evolution-manager/Redis
- entre 2 e 3 → problema no agent-runtime
- entre 3 e 4 → consumer do evolution-manager ou credenciais do WhatsApp

### 3) Estados da instância

Estados típicos:
- `connected`
- `disconnected`
- `qr_ready`
- `error`

Se ficar em `qr_ready`:
- regenerar QR
- validar sessão antiga/expirada

## Mitigação / Recovery

- Reiniciar evolution-manager:
  - `docker compose -f infra/compose/docker-compose.yml restart evolution-manager`
- Recriar instância (quando suportado pelo provider)
- Revalidar credenciais e permissões no Evolution API

## Coleta para pós-incidente

- logs do evolution-manager
- status da instância e última mudança
- payloads de webhook (sem PII quando possível)
- correlação com `correlation_id`
