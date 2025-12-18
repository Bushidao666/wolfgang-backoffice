-- Secret hygiene: add encrypted columns for previously-plaintext fields.
-- Note: encryption is performed application-side using APP_ENCRYPTION_KEY_CURRENT,
-- so this migration is schema-only. Data backfill is handled by a dedicated script/worker.

-- Telegram bot token (was plaintext)
alter table core.channel_instances
  add column if not exists telegram_bot_token_enc text;

-- Tool configs: headers/auth configs may contain secrets; store encrypted payloads.
alter table core.tool_configs
  add column if not exists headers_enc text not null default '',
  add column if not exists auth_secrets_enc text not null default '';

-- MCP servers: auth_config may contain secrets; store encrypted payload.
alter table core.mcp_servers
  add column if not exists auth_secrets_enc text not null default '';

-- Down (manual):
-- alter table core.channel_instances drop column if exists telegram_bot_token_enc;
-- alter table core.tool_configs drop column if exists headers_enc;
-- alter table core.tool_configs drop column if exists auth_secrets_enc;
-- alter table core.mcp_servers drop column if exists auth_secrets_enc;

