# Supabase (Local & Migrations)

Este diretório contém:

- `supabase/config.toml`: configuração do Supabase CLI
- `supabase/migrations/*`: migrations SQL (schema `core` e features)
- `supabase/seed.sql`: seed para desenvolvimento local
- `supabase/tests/*`: testes SQL (ex.: RLS)

## Local development

1. Suba o stack local:
   - `npx supabase start`
2. Aplique migrations/seed:
   - `npx supabase db reset`

## Conexões padrão (Supabase CLI)

- API: `http://localhost:54321`
- DB: `postgresql://postgres:postgres@localhost:54322/postgres`
- Studio: `http://localhost:54323`

Use `npx supabase status` para obter as chaves (`anon` e `service_role`).
