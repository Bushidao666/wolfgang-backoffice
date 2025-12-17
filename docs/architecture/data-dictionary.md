# Data Dictionary — Wolfgang Backoffice (V1)

Este documento descreve as entidades principais do banco **Supabase/Postgres** com foco operacional (V1).

## Convenções

- **Multi-tenant por schema**:
  - `core`: governança, integrações, memória, índices
  - `tenant_*`: dados operacionais isolados por empresa (ex.: `tenant_a.deals`)
- Quase tudo é **company-scoped** via `company_id`
- RLS aplica isolamento por tenant/company

## Tabelas (Schema `core`)

### `core.companies`

Empresa/tenant. Origina provisionamento de schema e governança.

Campos principais:
- `id` (uuid, PK)
- `name` (text)
- `slug` (text, unique)
- `document` (text, opcional)
- `status` (text)
- `settings` (jsonb)
- `created_at`, `updated_at` (timestamptz)

### `core.company_crms`

Mapeia empresa → schema do tenant (CRM/operacional).

Campos principais:
- `company_id` (uuid, FK → companies)
- `schema_name` (text) — ex.: `tenant_a`
- `is_primary` (bool)

### `core.company_users`

Vincula usuários (Supabase Auth) a empresas e roles.

Campos principais:
- `company_id` (uuid)
- `user_id` (uuid)
- `role` (text) — ex.: `super_admin`, `backoffice_admin`, `company_admin`
- `created_at`

### `core.channel_instances`

Instâncias de canais (WhatsApp/Instagram/Telegram).

Campos principais:
- `id` (uuid)
- `company_id` (uuid)
- `channel_type` (text)
- `instance_name` (text)
- `state` (text)
- `phone_number` / `instagram_account_id` / `telegram_bot_token` (dependendo do canal)
- `metadata` (jsonb)

### `core.centurion_configs`

Configuração do Centurion (prompt, regras, capacidades).

Campos principais:
- `id` (uuid)
- `company_id` (uuid)
- `name`, `slug` (text)
- `prompt` (text)
- `qualification_rules` (jsonb) — ex.: `{ "required_fields": ["budget","date","location"], "threshold": 1.0 }`
- `can_process_audio`, `can_process_image` (bool)
- `message_chunking_enabled`, `chunk_delay_ms`, `debounce_wait_ms` (humanização)
- `is_active` (bool)

### `core.leads`

Lead centralizado (independente do tenant schema).

Campos principais:
- `id` (uuid)
- `company_id` (uuid)
- `phone` (text) — identificador principal
- `name`, `email`, `cpf` (text, opcionais)
- `lifecycle_stage` (text)
- `is_qualified` (bool), `qualification_score` (numeric), `qualification_data` (jsonb), `qualified_at` (timestamptz)
- UTM/pixel: `utm_*`, `pixel_config_id`, `contact_fingerprint`

### `core.conversations`

Conversa ativa (memória curta). Acumula `pending_messages` durante debounce.

Campos principais:
- `id` (uuid)
- `company_id` (uuid)
- `lead_id` (uuid)
- `centurion_id` (uuid)
- `channel_type`, `channel_instance_id`
- `debounce_state`, `debounce_until`, `pending_messages` (jsonb)
- `last_inbound_at`, `last_outbound_at`

### `core.messages`

Histórico de mensagens (inbound/outbound) por conversa.

Campos principais:
- `id` (uuid)
- `conversation_id`, `company_id`, `lead_id`
- `direction` (text: inbound/outbound)
- `content_type` (text: text/audio/image/document)
- `content` (text)
- `audio_transcription`, `image_description` (text)
- `metadata` (jsonb)
- `created_at`

### `core.deals_index`

Índice que liga deal do tenant schema (`local_deal_id`) ao CORE.

Campos principais:
- `id` (uuid)
- `company_id` (uuid)
- `schema_name` (text)
- `local_deal_id` (uuid/text)
- `created_at`

### `core.contract_templates` / `core.contracts`

Templates e contratos (Autentique).

Campos principais:
- Template: `id`, `company_id`, `name`, `variables` (jsonb), `file_path`, `file_type`
- Contract: `id`, `company_id`, `deal_index_id`, `template_id`, `status`, `value`, `currency`, `contract_url`, `contract_data` (jsonb)

### `core.followup_rules` / `core.followup_queue`

Regras e fila de follow-ups.

Campos principais:
- Rules: `id`, `company_id`, `centurion_id`, `inactivity_hours`, `template`, `max_attempts`, `is_active`
- Queue: `id`, `company_id`, `lead_id`, `centurion_id`, `rule_id`, `scheduled_at`, `attempt_number`, `status`

### `core.tool_configs` / `core.mcp_servers`

Tools HTTP e servidores MCP configuráveis por Centurion.

Campos principais:
- Tool: `id`, `company_id`, `centurion_id`, `tool_name`, `endpoint`, `method`, `headers` (jsonb), `auth_*`, `input_schema` (jsonb), `output_schema` (jsonb)
- MCP: `id`, `company_id`, `centurion_id`, `name`, `server_url`, `auth_*`, `tools_available` (jsonb), `connection_status`

### `core.knowledge_documents` / `core.knowledge_chunks`

Base de conhecimento (RAG).

Campos principais:
- Document: `id`, `company_id`, `title`, `file_path`, `status`
- Chunk: `id`, `company_id`, `document_id`, `content`, `metadata`, `embedding` (vector)

### `core.audit_logs`

Auditoria de operações (writes).

Campos principais:
- `id` (uuid)
- `company_id`
- `actor_user_id`, `actor_role`
- `action` (HTTP method)
- `entity_type`, `entity_id`
- `request_id`, `correlation_id`
- `metadata` (jsonb)
- `created_at`

## Tabelas (Schema do tenant)

### `<tenant_schema>.deals`

Tabela operacional do CRM por empresa (dados isolados por schema).

Campos típicos:
- `id` (uuid)
- `company_id` (uuid)
- `core_lead_id` (uuid) — referência ao lead no CORE
- `deal_full_name`, `deal_phone`, `deal_email`
- `deal_status`, `deal_servico`, `deal_valor_contrato`
- `created_at`, `updated_at`

