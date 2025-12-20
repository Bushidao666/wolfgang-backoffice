# Backlog vNext (Agno-first) — Detalhado (EPICs + Fases + Tasks)

Este documento é a versão **aprofundada e expandida** do `BACKLOG_VNEXT_AGNO.md` e serve como **fonte única de verdade** para execução do vNext, com rastreabilidade completa entre:

- arquitetura (docs + linhas),
- impacto por módulo/app (arquivos a modificar/criar),
- plano operacional de implementação (fases + tasks),
- dependências/riscos/paralelização,
- glossário consolidado de arquivos.

**Escopo do repo:** `backoffice-web`, `backoffice-api`, `agent-runtime`, `evolution-manager`, `autentique-service`, `facebook-capi`, `packages/*`, `supabase/migrations/*`.

---

## Contexto (princípios e requisitos arquiteturais)

- **SDR 100% IA** e papéis: `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 56–90)
- **Leads nascem no `core`** e handoff para `<empresa>.deals`: `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 71–80)
- **Agent Runtime** orquestra Centurions, memória, tools/MCP e qualificação: `docs/architecture/arch-micro-agent-runtime.md` (linhas 13–44, 93–172)
- **Event-driven via Redis** com envelope e idempotência: `docs/architecture/event-catalog.md` (linhas 13–45)
- **Multi-tenant por schema** e tabelas `core`: `docs/architecture/data-dictionary.md` (linhas 7–12, 13–156)
- **Integrações vNext** (credenciais globais/por empresa + segredos criptografados + schema autoexposto): `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` (linhas 10–27, 162–180, 193–260)
- **Agno**:
  - Structured Output: `docs/agno-documentation/agno-docs-main/agents/structured-output.mdx` (linhas 5–45)
  - Memory: `docs/agno-documentation/agno-docs-main/agents/memory.mdx` (linhas 11–18, 55–71)
  - Tool Hooks: `docs/agno-documentation/agno-docs-main/tools/hooks.mdx` (linhas 6–13, 48–59, 125–133)
  - MCPTools: `docs/agno-documentation/agno-docs-main/tools/mcp/mcp.mdx` (linhas 17–49, 166–174)

---

## Índice

- [1. Tarefas EPIC — Visão Arquitetural](#1-tarefas-epic--visão-arquitetural)
- [2. Fases de Implementação Detalhadas](#2-fases-de-implementação-detalhadas)
- [3. Matriz de Dependências](#3-matriz-de-dependências)
- [4. Glossário de Arquivos](#4-glossário-de-arquivos)
- [5. Observações Finais](#5-observações-finais)

---

# 1. Tarefas EPIC — Visão Arquitetural

> Nesta seção, **cada EPIC** tem “o que/por que”, referências com linhas e impacto técnico/arquitetural (incluindo arquivos e conexões).

## EPICs (lista)

- [EPIC-F0-E1] Drift Control de migrations (cloud vs repo)
- [EPIC-F0-E2] Provisionamento determinístico de empresa (create company full)
- [EPIC-F0-E3] Auto-expose de schemas no PostgREST (fila + drain via direct)
- [EPIC-F0-E4] Grants/RLS consistentes em tenant schemas
- [EPIC-F1-E1] RBAC holding-only + enforcement company-scoped
- [EPIC-F1-E2] Gestão de usuários por empresa (Supabase Admin + core.company_users)
- [EPIC-F1-E3] Auditoria completa (core.audit_logs) + correlation_id
- [EPIC-F2-E1] Credential Sets globais + bindings por empresa + resolver tipado
- [EPIC-F2-E2] Segredos criptografados + rotação (keyring) + “no plaintext”
- [EPIC-F2-E3] Wizard “criar empresa” (globais vs custom vs disabled por provider)
- [EPIC-F3-E1] Envelope de eventos + correlation end-to-end
- [EPIC-F3-E2] Idempotência real (event consumption store + dedupe keys)
- [EPIC-F3-E3] Debounce multi-worker safe (lock/claim + watchdog)
- [EPIC-F4-E1] Agno Structured Output para decisões críticas
- [EPIC-F4-E2] Agno Memory (Storage + User Memories + Summaries) alinhada ao core
- [EPIC-F4-E3] Agno Tool Hooks (segurança + logging + auditoria)
- [EPIC-F4-E4] MCP nativo via Agno MCPTools (bridge DB → MCPTools)
- [EPIC-F5-E1] Qualificação inteligente configurável (critérios + pesos + threshold)
- [EPIC-F5-E2] Explainability + histórico append-only de avaliações
- [EPIC-F5-E3] Media Tools (biblioteca + playbooks + envio via message.sent)
- [EPIC-F6-E1] Multi-canal real (IG/TG) com contrato canônico
- [EPIC-F7-E1] Segurança de tool calls e egress (SSRF/allowlist/quotas/limits)
- [EPIC-F7-E2] Runbooks + dashboards mínimos (incidentes previsíveis)

---

## [EPIC-F0-E1]: Drift Control de migrations (cloud vs repo)

##### Definição & Justificativa
- **O que:** Garantir que `supabase/migrations/*` está 100% aplicado em cada ambiente, com checagem automática pré-deploy e runbook de correção.
- **Por que:** Drift de migrations quebra RPCs/tabelas e causa incidentes em cascata (create company, schema exposure, integrações, runtime).
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 7–17)
  - 📄 Documento: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` (linhas 162–180)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `README.md` - procedimento de migrations por ambiente + validações pós-apply
  - `infra/` - integrar scripts no pipeline (se aplicável)
- **Novos arquivos a criar:**
  - `infra/db/migrations-check.sh` - checagem read-only de drift (sem expor secrets)
  - `infra/db/migrations-apply.sh` - runner idempotente para aplicar migrations em ordem
  - `docs/runbooks/runbook-migrations.md` - runbook executável (checklist e troubleshooting)
- **🔗 Conexões Diretas:**
  - `infra/db/migrations-check.sh` ↔️ Supabase Postgres (psql)
- **🔗 Conexões Indiretas:**
  - drift → falta RPC/tabela → erro em `backoffice-api`/`agent-runtime` → UI quebra em cascata
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados (schemas, migrations)
  - [x] APIs/Endpoints (dependem de RPCs/tabelas)
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Deploy/CI

---

## [EPIC-F0-E2]: Provisionamento determinístico de empresa (create company full)

##### Definição & Justificativa
- **O que:** Tornar o fluxo “criar empresa” determinístico e transacional: `core.companies` + provisionamento de `<tenant_schema>` via `_template_base` + `core.company_crms`, com idempotência e validações.
- **Por que:** Se “criar empresa” falha, o backoffice perde sua função central (criar tenants) e quebra o acesso a dados por schema (deals, contratos, marketing, etc.).
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 15–36)
  - 📄 Documento: `docs/architecture/arch-micro-backoffice-api.md` (linhas 216–227)
  - 📄 Documento: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` (linhas 167–180)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `supabase/migrations/00075_create_company_full.sql` - consolidar RPC transacional e retornos (company_id, schema_name)
  - `supabase/migrations/00079_fix_create_company_full_provider_ambiguous.sql` - remover ambiguidade e endurecer SQL/PLpgSQL
  - `backoffice-api/src/modules/companies/repository/companies.repository.ts` - chamar RPC e mapear retorno/erros
  - `backoffice-api/src/modules/companies/services/companies.service.ts` - orquestrar create + integrações + exposure (sem “workarounds”)
  - `backoffice-api/src/modules/companies/services/schema-provisioner.service.ts` - garantir que schema e mapeamentos estão prontos
- **Novos arquivos a criar:**
  - `backoffice-api/src/modules/companies/services/company-provisioning-orchestrator.service.ts` - retries/backoff + checkpoints do provisioning
  - `backoffice-api/src/modules/companies/dto/provisioning-status.dto.ts` - expor status detalhado (útil para UI e operação)
- **🔗 Conexões Diretas:**
  - `backoffice-api/src/modules/companies/services/companies.service.ts` ↔️ `backoffice-api/src/modules/companies/repository/companies.repository.ts`
  - `backoffice-api/src/modules/companies/repository/companies.repository.ts` ↔️ DB (RPC create company)
- **🔗 Conexões Indiretas:**
  - “company provisioned” → `core.company_crms.schema_name` → PostgREST `.schema(<tenant>)` → módulos (deals/marketing/contracts)
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados (schemas, migrations)
  - [x] APIs/Endpoints (`POST /companies`)
  - [x] Serviços/Business Logic
  - [x] UI/Frontend (desbloqueia fluxo “Nova empresa”)
  - [ ] Autenticação/Autorização
  - [ ] Outros: -

---

## [EPIC-F0-E3]: Auto-expose de schemas no PostgREST (fila + drain via direct)

##### Definição & Justificativa
- **O que:** Garantir que, após provisionar `<tenant_schema>`, o schema seja automaticamente “exposto” no PostgREST (permitindo `.schema(<tenant>)`), via fila no DB + drain no backend com conexão direta Postgres.
- **Por que:** “Invalid schema” e/ou “permission denied to set parameter pgrst.db_schemas” são incidentes recorrentes quando tentamos resolver isso no lugar errado (PostgREST/supabase-js). O mecanismo precisa rodar com privilégios corretos e ser idempotente.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` (linhas 162–180)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `supabase/migrations/00072_auto_expose_tenant_schemas.sql` - função `core.fn_postgrest_expose_schema(...)`
  - `supabase/migrations/00077_fix_postgrest_expose_schema_dedupe.sql` - dedupe/concorrência
  - `supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql` - fila `core.postgrest_schema_exposure_queue` + enqueue
  - `backoffice-api/src/modules/companies/services/postgrest-exposure.service.ts` - drain idempotente + métricas/logs
  - `backoffice-api/src/modules/companies/services/companies.service.ts` - disparar drain pós-create
- **Novos arquivos a criar:**
  - `backoffice-api/src/modules/companies/jobs/postgrest-exposure.worker.ts` - worker dedicado (startup + scheduler)
  - `backoffice-api/src/modules/companies/dto/postgrest-exposure.dto.ts` - diagnóstico (fila/status/último erro)
- **🔗 Conexões Diretas:**
  - `backoffice-api/src/modules/companies/services/postgrest-exposure.service.ts` ↔️ Postgres direct (env `SUPABASE_DB_URL`)
- **🔗 Conexões Indiretas:**
  - expose schema → PostgREST aceita `.schema(<tenant>)` → UI/API deixam de falhar em endpoints por schema
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados (schemas, migrations)
  - [x] APIs/Endpoints (companies/deals/etc por schema)
  - [x] Serviços/Business Logic
  - [x] UI/Frontend (listagens por empresa)
  - [ ] Autenticação/Autorização
  - [x] Outros: Jobs/Operação

---

## [EPIC-F0-E4]: Grants/RLS consistentes em tenant schemas (evitar `permission denied for schema`)

##### Definição & Justificativa
- **O que:** Padronizar grants/default privileges e validar RLS para garantir operações esperadas em `<tenant_schema>.*` sem abrir brechas cross-tenant.
- **Por que:** Mesmo com schema exposto, sem grants corretos o Postgres bloqueia e o backoffice falha em deals/relatórios; o runtime também falha no handoff para `<tenant>.deals`.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 82–89)
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 171–184)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql` - grants + default privileges (existentes e futuros)
  - `backoffice-api/src/modules/deals/*` - tratamento de erro e validações para schema/grants
- **Novos arquivos a criar:**
  - `docs/runbooks/runbook-rls-and-grants.md` - matriz roles × schemas × operações + checklist de validação
- **🔗 Conexões Diretas:**
  - DB grants/RLS ↔️ PostgREST ↔️ supabase-js `.schema(<tenant>)`
- **🔗 Conexões Indiretas:**
  - grants errados → `/deals` falha → UI quebra → handoff (runtime) não consegue escrever deals
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados (grants/RLS)
  - [x] APIs/Endpoints (deals/stats)
  - [x] Serviços/Business Logic
  - [x] UI/Frontend
  - [x] Autenticação/Autorização (RLS/roles)
  - [ ] Outros: -

---

## [EPIC-F1-E1]: RBAC holding-only + enforcement company-scoped

##### Definição & Justificativa
- **O que:** Implementar RBAC consistente no backoffice (holding-only) e enforcement de contexto `company_id` onde necessário (golden rule: sem `company_id`, sem recurso).
- **Por que:** Este repositório é o painel do dono da holding; precisamos garantir que apenas roles permitidos acessem/alterem recursos críticos (empresas, centuriões, integrações e credenciais).
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 66–70)
  - 📄 Documento: `docs/architecture/arch-micro-backoffice-api.md` (linhas 216–239)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `backoffice-api/src/modules/auth/*` - guards/claims/roles e padronização de autorização
  - `backoffice-api/src/modules/companies/controllers/companies.controller.ts` - aplicar guards/decorators e validar `company_id` no contexto
  - `backoffice-api/src/modules/centurions/controllers/centurions.controller.ts` - enforcement de roles
  - `backoffice-web/src/middleware.ts` - gating de rotas (redirect/deny)
  - `backoffice-web/src/lib/*` - client/config (propagação de sessão e `x-company-id`)
- **Novos arquivos a criar:**
  - `backoffice-api/src/modules/auth/guards/holding-role.guard.ts` - guard holding-only
  - `backoffice-api/src/modules/auth/decorators/holding-role.decorator.ts` - decorator para controllers
  - `backoffice-web/src/modules/auth/rbac.ts` - helpers de RBAC no frontend
- **🔗 Conexões Diretas:**
  - `backoffice-web/src/middleware.ts` ↔️ `backoffice-web/src/modules/auth/rbac.ts`
  - guards (API) ↔️ controllers (enforcement)
- **🔗 Conexões Indiretas:**
  - RBAC → quem pode gerenciar credenciais → segurança operacional de integrações (Autentique/Evolution/OpenAI)
- **🎯 Áreas de Impacto:**
  - [ ] Banco de Dados
  - [x] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [x] UI/Frontend
  - [x] Autenticação/Autorização
  - [ ] Outros: -

---

## [EPIC-F1-E2]: Gestão de usuários por empresa (Supabase Admin + core.company_users)

##### Definição & Justificativa
- **O que:** Implementar gestão de usuários por empresa: convidar/criar usuário (Supabase Auth), vincular em `core.company_users`, alterar role, remover vínculo.
- **Por que:** O dono da holding precisa gerenciar acessos e permissões por empresa no backoffice; isso também sustenta os fronts operacionais.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 37–46)
  - 📄 Documento: `docs/architecture/arch-micro-backoffice-api.md` (linhas 216–227)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `backoffice-api/src/modules/companies/controllers/company-users.controller.ts` - endpoints list/add/remove users
  - `backoffice-api/src/modules/companies/services/company-users.service.ts` - lógica de vínculo e validações
  - `backoffice-api/src/modules/companies/dto/add-user.dto.ts` - schema do payload (email/role)
  - `backoffice-web/src/modules/companies/*` - UI de usuários por empresa
- **Novos arquivos a criar:**
  - `backoffice-api/src/modules/auth/services/supabase-admin.service.ts` - wrapper do Admin API
  - `backoffice-web/src/modules/companies/components/company-users-table.tsx` - tabela (roles + ações)
  - `docs/runbooks/runbook-user-management.md` - runbook (criar usuário, reset, remover)
- **🔗 Conexões Diretas:**
  - `backoffice-api/src/modules/companies/controllers/company-users.controller.ts` ↔️ `backoffice-api/src/modules/companies/services/company-users.service.ts`
  - `backoffice-api/src/modules/auth/services/supabase-admin.service.ts` ↔️ Supabase Admin API
- **🔗 Conexões Indiretas:**
  - user vínculo → claims/roles → acesso a recursos company-scoped e RLS em fronts operacionais
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados (`core.company_users`)
  - [x] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [x] UI/Frontend
  - [x] Autenticação/Autorização
  - [ ] Outros: -

---

## [EPIC-F1-E3]: Auditoria completa (core.audit_logs) + correlation_id

##### Definição & Justificativa
- **O que:** Registrar auditoria padronizada em mutações críticas (companies, integrations, centurions, media, etc.), com `actor_*`, `company_id`, `request_id` e `correlation_id`.
- **Por que:** Permite rastrear “quem fez o quê” e torna incidentes debugáveis (mudança de credencial, mudança de critério, etc.).
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 157–169)
  - 📄 Documento: `docs/architecture/event-catalog.md` (linhas 13–28)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `backoffice-api/src/modules/*/controllers/*.ts` - instrumentar writes com audit
  - `backoffice-api/src/modules/*/services/*.ts` - propagar correlation e metadata útil
  - `agent-runtime/src/common/middleware/logging.py` - correlation nos logs do runtime
  - `evolution-manager/src/modules/webhooks/*` - correlation no envelope
- **Novos arquivos a criar:**
  - `backoffice-api/src/common/audit/audit.service.ts` - serviço central de auditoria
  - `backoffice-api/src/common/audit/audit.types.ts` - contratos/tipos de auditoria
- **🔗 Conexões Diretas:**
  - controllers ↔️ `backoffice-api/src/common/audit/audit.service.ts` ↔️ `core.audit_logs`
- **🔗 Conexões Indiretas:**
  - audit + correlation → runbooks e debugs end-to-end (F7-E2)
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados (`core.audit_logs`)
  - [x] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [x] Autenticação/Autorização (actor e role)
  - [x] Outros: Observabilidade

---

## [EPIC-F2-E1]: Credential Sets globais + bindings por empresa + resolver tipado

##### Definição & Justificativa
- **O que:** Implementar modelo unificado de credenciais com dois níveis: sets globais (reutilizáveis) e bindings por empresa (global/custom/disabled) com resolução efetiva por `company_id`.
- **Por que:** Elimina dependência de env por provider e garante que cada serviço/job use a credencial correta por empresa.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` (linhas 193–260)
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 10–12)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `supabase/migrations/00073_company_integrations.sql` - enums/tabelas/índices
  - `backoffice-api/src/modules/integrations/services/credential-sets.service.ts` - CRUD sets globais
  - `backoffice-api/src/modules/integrations/services/company-integrations.service.ts` - CRUD bindings por empresa
  - `backoffice-api/src/modules/integrations/services/integrations-resolver.service.ts` - resolver de credencial efetiva
  - `packages/integrations/src/*` - contrato compartilhado (resolver + tipos)
- **Novos arquivos a criar:**
  - `packages/integrations/src/providers/autentique.ts` - contrato/validação provider Autentique
  - `packages/integrations/src/providers/evolution.ts` - contrato/validação provider Evolution
  - `packages/integrations/src/providers/openai.ts` - contrato/validação provider OpenAI
  - `backoffice-api/src/modules/integrations/services/integration-validator.service.ts` - validação e “status” de credenciais
- **🔗 Conexões Diretas:**
  - `backoffice-api/src/modules/integrations/services/integrations-resolver.service.ts` ↔️ `packages/integrations` (types + resolver)
- **🔗 Conexões Indiretas:**
  - credencial resolvida → `agent-runtime`/`evolution-manager`/`autentique-service`/`facebook-capi` usam por empresa
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados
  - [x] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [x] UI/Frontend
  - [x] Autenticação/Autorização (holding-only)
  - [x] Outros: Serviços satélites

---

## [EPIC-F2-E2]: Segredos criptografados + rotação (keyring) + “no plaintext”

##### Definição & Justificativa
- **O que:** Padronizar armazenamento de segredos (tokens/keys) sempre criptografados em repouso, com keyring e rotação segura, e migração de plaintext.
- **Por que:** Segurança e compliance; e também robustez: evita 500 por fluxo depender de env “de integração” e garante dados protegidos no DB.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` (linhas 12–16)
  - 📄 Documento: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` (linhas 216–233)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `packages/crypto/src/*` - primitives + versionamento de payload criptografado
  - `supabase/migrations/00074_encrypt_plaintext_secrets.sql` - migração e backfill
  - `backoffice-api/src/modules/integrations/services/credential-sets.service.ts` - encrypt no write/decrypt no read
  - `autentique-service/src/modules/contracts/services/autentique-integration.service.ts` - consumir secrets via decrypt
  - `evolution-manager/src/modules/instances/services/evolution-api.service.ts` - consumir secrets via decrypt
- **Novos arquivos a criar:**
  - `packages/crypto/src/keyring/keyring.ts` - keyring/rotação (API clara)
  - `docs/runbooks/runbook-key-rotation.md` - runbook (rotate, rollback, teste)
- **🔗 Conexões Diretas:**
  - serviços ↔️ `packages/crypto` (encrypt/decrypt)
- **🔗 Conexões Indiretas:**
  - falha de crypto → bloqueia CRUD de credenciais → travamento de integrações
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados
  - [x] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Segurança de dados

---

## [EPIC-F2-E3]: Wizard “criar empresa” (globais vs custom vs disabled por provider)

##### Definição & Justificativa
- **O que:** Implementar wizard na criação de empresa para escolher credenciais globais, credenciais específicas por empresa, ou desabilitar provider (Autentique/Evolution/OpenAI).
- **Por que:** Garante que empresa nasce “operável” e reduz erro humano; implementa o fluxo vNext (holding define globais, mas pode sobrescrever por empresa).
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` (linhas 193–205)
  - 📄 Documento: `docs/architecture/arch-micro-backoffice-api.md` (linhas 216–227)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `backoffice-api/src/modules/companies/dto/create-company.dto.ts` - aceitar `integrations[]` com provider+mode+refs
  - `backoffice-api/src/modules/companies/services/companies.service.ts` - persistir bindings no create
  - `backoffice-api/src/modules/integrations/services/company-integrations.service.ts` - upsert bindings por empresa
  - `backoffice-web/src/modules/companies/*` - UX de wizard e estado multi-step
  - `backoffice-web/src/modules/integrations/*` - reuso de forms/validations por provider
- **Novos arquivos a criar:**
  - `backoffice-web/src/modules/companies/components/company-create-wizard/company-create-wizard.tsx` - container do wizard
  - `backoffice-web/src/modules/companies/components/company-create-wizard/steps/autentique-step.tsx` - step Autentique
  - `backoffice-web/src/modules/companies/components/company-create-wizard/steps/evolution-step.tsx` - step Evolution
  - `backoffice-web/src/modules/companies/components/company-create-wizard/steps/openai-step.tsx` - step OpenAI
  - `backoffice-web/src/modules/integrations/providers/autentique.schema.ts` - schema/validação
  - `backoffice-web/src/modules/integrations/providers/evolution.schema.ts` - schema/validação
  - `backoffice-web/src/modules/integrations/providers/openai.schema.ts` - schema/validação
- **🔗 Conexões Diretas:**
  - wizard (web) ↔️ `POST /companies` (api)
- **🔗 Conexões Indiretas:**
  - create company + bindings → resolver → serviços satélites usam credencial correta por empresa
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados (bindings)
  - [x] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [x] UI/Frontend
  - [ ] Autenticação/Autorização
  - [ ] Outros: -

---

## [EPIC-F3-E1]: Envelope de eventos + correlation end-to-end (todos os serviços)

##### Definição & Justificativa
- **O que:** Padronizar producers/consumers para usar o envelope do catálogo de eventos (id/type/version/occurred_at/company_id/source/correlation/causation/payload).
- **Por que:** Sem envelope e correlation consistentes, debugging e auditoria cross-service ficam inviáveis.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/event-catalog.md` (linhas 13–28, 46–57)
  - 📄 Documento: `docs/architecture/arch-micro-agent-runtime.md` (linhas 47–75)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `evolution-manager/src/modules/webhooks/*` - publicar `message.received` com envelope
  - `agent-runtime/src/handlers/message_handler.py` - consumir/validar envelope
  - `agent-runtime/src/modules/centurion/handlers/message_handler.py` - correlation em persistência e logs
  - `agent-runtime/src/modules/centurion/services/whatsapp_sender.py` - publicar `message.sent` com envelope
  - `evolution-manager/src/modules/messages/*` - consumir `message.sent` com envelope
  - `facebook-capi/src/modules/events/*` - consumir `lead.*` com correlation
- **Novos arquivos a criar:**
  - `agent-runtime/src/common/infrastructure/events/envelope.py` - tipos e validações do envelope
  - `packages/contracts/src/events/event_envelope.ts` - contrato TS compartilhado (opcional)
- **🔗 Conexões Diretas:**
  - Redis channels ↔️ envelope parser/validator (runtime e satélites)
- **🔗 Conexões Indiretas:**
  - correlation consistente → audit logs (F1-E3) + runbooks (F7-E2)
- **🎯 Áreas de Impacto:**
  - [ ] Banco de Dados
  - [ ] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Mensageria/Observabilidade

---

## [EPIC-F3-E2]: Idempotência real (event consumption store + dedupe keys)

##### Definição & Justificativa
- **O que:** Criar store de consumo de eventos e aplicar dedupe keys para:
  - inbound `message.received`,
  - outbound `message.sent`,
  - `lead.qualified`/handoff (side-effects).
- **Por que:** Pub/Sub + retries/replays => at-least-once na prática; sem idempotência duplicamos mensagens e efeitos colaterais.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/event-catalog.md` (linhas 36–45, 85–88, 110–113)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `agent-runtime/src/modules/centurion/repository/message_repository.py` - persist/lookup dedupe keys
  - `agent-runtime/src/modules/centurion/services/whatsapp_sender.py` - dedupe outbound
  - `evolution-manager/src/modules/messages/*` - respeitar idempotency no envio ao provider
- **Novos arquivos a criar:**
  - `supabase/migrations/00080_event_consumption.sql` - tabela/índices para dedupe
  - `agent-runtime/src/common/infrastructure/idempotency/idempotency_store.py` - store com TTL e atomicidade
- **🔗 Conexões Diretas:**
  - consumers ↔️ idempotency store ↔️ DB
- **🔗 Conexões Indiretas:**
  - idempotência protege `facebook-capi` e integrações downstream de duplicidade
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados
  - [ ] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Mensageria

---

## [EPIC-F3-E3]: Debounce multi-worker safe (lock/claim + watchdog)

##### Definição & Justificativa
- **O que:** Implementar debounce com lock/claim por `conversation_id`, impedindo processamento concorrente e recuperando conversas presas em `processing`.
- **Por que:** Em escala horizontal, sem claim/lock, dois workers podem responder ao mesmo lead; e estados presos quebram UX e custo.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/arch-micro-agent-runtime.md` (linhas 303–318)
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 87–99)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `agent-runtime/src/modules/centurion/handlers/debounce_handler.py` - state machine + lock TTL
  - `agent-runtime/src/modules/centurion/handlers/message_handler.py` - buffer de pending_messages consistente
  - `agent-runtime/src/modules/centurion/repository/conversation_repository.py` - persistência de states e timestamps
- **Novos arquivos a criar:**
  - `agent-runtime/src/common/infrastructure/locks/redis_lock.py` - lock TTL com renew/release seguro
  - `agent-runtime/src/modules/centurion/jobs/conversation_watchdog.py` - job de recovery (stuck processing)
- **🔗 Conexões Diretas:**
  - handlers ↔️ Redis (locks) ↔️ DB (state)
- **🔗 Conexões Indiretas:**
  - debounce saudável → previsibilidade de `message.sent` e de qualificação/followups
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados
  - [ ] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Redis

---

## [EPIC-F4-E1]: Agno Structured Output para decisões críticas (qualificação, mídia, tools)

##### Definição & Justificativa
- **O que:** Migrar decisões críticas (extração de campos, avaliação por critérios/pesos, plano de mídia e tool selection) para output estruturado via `response_model` (Pydantic), usando `parser_model` quando necessário.
- **Por que:** Elimina parsing frágil de strings, aumenta previsibilidade e testabilidade e aproveita recurso central do Agno.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/agno-documentation/agno-docs-main/agents/structured-output.mdx` (linhas 5–45)
  - 📄 Documento: `docs/architecture/arch-micro-agent-runtime.md` (linhas 79–90, 460–507)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `agent-runtime/src/modules/centurion/services/qualification_service.py` - produzir resultado tipado (score/evidências/decisão)
  - `agent-runtime/src/modules/centurion/services/prompt_builder.py` - prompts orientados ao schema (criteria/weights)
  - `agent-runtime/src/modules/centurion/services/response_builder.py` - construir resposta (texto+mídia) a partir de modelos
- **Novos arquivos a criar:**
  - `agent-runtime/src/modules/centurion/agno_models/qualification_models.py` - Pydantic models (criteria, weights, evidências)
  - `agent-runtime/src/modules/centurion/agno_models/media_plan_models.py` - Pydantic models (plano de mídia/condições)
- **🔗 Conexões Diretas:**
  - `agent-runtime/src/modules/centurion/services/centurion_service.py` → `agent-runtime/src/modules/centurion/services/qualification_service.py` → `agent-runtime/src/modules/centurion/agno_models/qualification_models.py`
- **🔗 Conexões Indiretas:**
  - avaliação tipada → persistência em `core.leads.qualification_*` → UI de explainability (F5-E2)
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados (persistência de avaliação)
  - [ ] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [x] UI/Frontend (explicabilidade)
  - [ ] Autenticação/Autorização
  - [ ] Outros: -

---

## [EPIC-F4-E2]: Agno Memory (Storage + User Memories + Summaries) alinhada ao core

##### Definição & Justificativa
- **O que:** Implementar uso consistente de Storage (chat history + session state), User Memories e Summaries do Agno, alinhando `session_id` ao `conversation_id` do domínio.
- **Por que:** Aumenta qualidade de contexto, reduz token/custo, e elimina duplicação de mecanismos de memória. Também permite sessões multi-turn robustas.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/agno-documentation/agno-docs-main/agents/memory.mdx` (linhas 11–18, 55–71)
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 87–113)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `agent-runtime/src/modules/memory/services/short_term_memory.py` - integrar com storage/summaries
  - `agent-runtime/src/modules/memory/services/memory_cleanup.py` - retenção/limpeza coerente
  - `agent-runtime/src/modules/centurion/repository/message_repository.py` - mapear histórico para storage
  - `agent-runtime/src/modules/centurion/repository/conversation_repository.py` - garantir mapping session/conversation
- **Novos arquivos a criar:**
  - `agent-runtime/src/common/infrastructure/agno/storage.py` - driver de storage (Postgres)
  - `agent-runtime/src/common/infrastructure/agno/memory.py` - integração do MemoryManager
- **🔗 Conexões Diretas:**
  - Agno Agent ↔️ Storage/Memory ↔️ Postgres
- **🔗 Conexões Indiretas:**
  - summaries → prompts menores → latência/custo menores → mais throughput
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados
  - [ ] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Performance/custo

---

## [EPIC-F4-E3]: Agno Tool Hooks (segurança + logging + auditoria)

##### Definição & Justificativa
- **O que:** Implementar hooks globais de tools para validação, logging, quotas e auditoria (pre/post hooks e tool hooks).
- **Por que:** Tools são a superfície mais crítica (SSRF, timeouts, leaks). Hooks são o “ponto único” para enforcement e telemetria.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/agno-documentation/agno-docs-main/tools/hooks.mdx` (linhas 6–13, 48–59, 125–133)
  - 📄 Documento: `docs/architecture/arch-micro-agent-runtime.md` (linhas 116–121, 155–158)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `agent-runtime/src/modules/tools/services/tool_executor.py` - plugar hooks e telemetria
  - `agent-runtime/src/modules/tools/services/schema_validator.py` - validação de payload sizes/schemas
  - `agent-runtime/src/modules/tools/services/tool_registry.py` - aplicar hooks por tool (quando necessário)
- **Novos arquivos a criar:**
  - `agent-runtime/src/modules/tools/agno_hooks/security_hooks.py` - allowlist/SSRF/timeouts
  - `agent-runtime/src/modules/tools/agno_hooks/logging_hooks.py` - latência, tamanho, outcome
  - `agent-runtime/src/modules/tools/agno_hooks/audit_hooks.py` - integração com audit logs (F1-E3)
- **🔗 Conexões Diretas:**
  - hooks ↔️ ToolExecutor ↔️ tool calls (HTTP/MCP)
- **🔗 Conexões Indiretas:**
  - hooks → base para runbooks e alertas (F7-E2)
- **🎯 Áreas de Impacto:**
  - [ ] Banco de Dados
  - [ ] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Segurança/Observabilidade

---

## [EPIC-F4-E4]: MCP nativo via Agno MCPTools (bridge DB → MCPTools)

##### Definição & Justificativa
- **O que:** Conectar servidores MCP configurados no DB a MCPTools do Agno (context manager), com error handling e cleanup.
- **Por que:** Evita plumbing custom e usa o caminho recomendado pelo Agno para MCP, com melhor gerenciamento de recursos.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/agno-documentation/agno-docs-main/tools/mcp/mcp.mdx` (linhas 17–49, 166–174)
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 141–147)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `agent-runtime/src/modules/tools/services/mcp_registry.py` - ler configuração do DB
  - `agent-runtime/src/modules/tools/services/mcp_tool_adapter.py` - adaptar MCPTools
  - `backoffice-api/src/modules/mcp/*` - CRUD/validação de MCP servers
- **Novos arquivos a criar:**
  - `agent-runtime/src/modules/tools/services/agno_mcp_bridge.py` - criar MCPTools a partir da config
- **🔗 Conexões Diretas:**
  - runtime ↔️ MCP servers (via MCPTools)
- **🔗 Conexões Indiretas:**
  - MCP tools enriquecem contexto/decisões (qualificação, mídia, roteamento)
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados (config MCP)
  - [x] APIs/Endpoints (CRUD MCP)
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Extensibilidade

---

## [EPIC-F5-E1]: Qualificação inteligente configurável (critérios + pesos + threshold)

##### Definição & Justificativa
- **O que:** Permitir que o admin crie critérios personalizados por Centurion (do zero), com pesos, thresholds e regras de decisão (qualified / not qualified / needs follow-up), avaliados pela LLM com explainability.
- **Por que:** É requisito do “sistema de qualificação inteligente” e aumenta precisão/contexto (LLM interpreta nuances), mantendo rastreabilidade e consistência.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 60–73)
  - 📄 Documento: `docs/architecture/arch-micro-agent-runtime.md` (linhas 460–507)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `supabase/migrations/00006_core_centurion_configs.sql` - evoluir `qualification_rules` para DSL+pesos
  - `backoffice-api/src/modules/centurions/dto/create-centurion.dto.ts` - aceitar critérios/pesos
  - `backoffice-api/src/modules/centurions/services/centurions.service.ts` - persistir config e versionar
  - `agent-runtime/src/modules/centurion/services/qualification_service.py` - avaliação híbrida (LLM + deterministic)
  - `agent-runtime/src/modules/centurion/services/prompt_builder.py` - instruções e contexto para avaliação
- **Novos arquivos a criar:**
  - `backoffice-api/src/modules/centurions/dto/qualification-rules.dto.ts` - DTO tipado para UI/API
  - `agent-runtime/src/modules/centurion/qualification/criteria_engine.py` - engine (pesos, agregação, thresholds)
  - `agent-runtime/src/modules/centurion/agno_models/criteria_eval_models.py` - structured output por critério
- **🔗 Conexões Diretas:**
  - `backoffice-api/src/modules/centurions/services/centurions.service.ts` ↔️ `core.centurion_configs`
  - `agent-runtime/src/modules/centurion/qualification/criteria_engine.py` ↔️ `agent-runtime/src/modules/centurion/services/qualification_service.py`
- **🔗 Conexões Indiretas:**
  - score/decisão → `lead.qualified` → handoff → `<tenant>.deals` (e métricas por Centurion)
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados
  - [x] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [x] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Métricas/qualidade

---

## [EPIC-F5-E2]: Explainability + histórico append-only de avaliações

##### Definição & Justificativa
- **O que:** Persistir resultado de avaliação com evidências (mensagens/trechos), score por critério, score final, decisão e versão da config, em tabela append-only; exibir isso no backoffice.
- **Por que:** Permite auditoria, debugging e melhoria contínua (comparar performance dos Centurions e ajustar critérios).
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/data-dictionary.md` (linhas 74–86)
  - 📄 Documento: `docs/architecture/event-catalog.md` (linhas 142–163)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `supabase/migrations/00005_core_leads.sql` - expandir `qualification_data` (sem perder compatibilidade)
  - `agent-runtime/src/modules/centurion/services/qualification_service.py` - persistir evidências e emitir `lead.qualified`
  - `backoffice-api/src/modules/leads/*` - endpoints para visualizar histórico de avaliação
  - `backoffice-web/src/modules/leads/*` - UI para explainability
- **Novos arquivos a criar:**
  - `supabase/migrations/00081_lead_qualification_events.sql` - histórico append-only
  - `backoffice-web/src/modules/leads/components/qualification-explainability.tsx` - componente de detalhamento
- **🔗 Conexões Diretas:**
  - runtime ↔️ DB (gravar avaliações)
- **🔗 Conexões Indiretas:**
  - explainability → ajuste de critérios → melhoria de conversão (feedback loop)
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados
  - [x] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [x] UI/Frontend
  - [ ] Autenticação/Autorização
  - [ ] Outros: -

---

## [EPIC-F5-E3]: Media Tools (biblioteca + playbooks + envio via message.sent)

##### Definição & Justificativa
- **O que:** Implementar biblioteca de mídias (áudio/imagem/vídeo/docs) por company e opcionalmente por Centurion, com tags, regras e playbooks/steps; permitir que a LLM selecione e orquestre mídia no fluxo de atendimento.
- **Por que:** Permite scripts sofisticados (prova social, cases, objeções) e melhora conversão; conecta diretamente com `SendMedia` do Evolution Manager e com o evento `message.sent`.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/arch-micro-evolution-manager.md` (linhas 63–75)
  - 📄 Documento: `docs/architecture/event-catalog.md` (linhas 91–113)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `agent-runtime/src/modules/centurion/services/response_builder.py` - incluir plano de mídia no outbound
  - `evolution-manager/src/modules/messages/*` - suportar envio de mídia por evento
  - `agent-runtime/src/modules/channels/services/media_downloader.py` - (se necessário) download/normalização segura
- **Novos arquivos a criar:**
  - `supabase/migrations/00082_media_assets.sql` - `core.media_assets`, `core.media_playbooks`, `core.media_playbook_steps`
  - `backoffice-api/src/modules/media/media.module.ts` - módulo Media Tools
  - `backoffice-api/src/modules/media/controllers/media-assets.controller.ts` - endpoints upload/list/update/delete
  - `backoffice-api/src/modules/media/services/media-assets.service.ts` - regras, storage, indexação
  - `backoffice-web/src/modules/media/*` - UI de gestão de mídias e playbooks
  - `agent-runtime/src/modules/centurion/media/media_tool.py` - tool de consulta/seleção de mídia
- **🔗 Conexões Diretas:**
  - Media Tools (API) ↔️ Supabase Storage/DB
  - runtime ↔️ media_tool ↔️ DB
- **🔗 Conexões Indiretas:**
  - plano de mídia → `message.sent` → evolution-manager → Evolution API
- **🎯 Áreas de Impacto:**
  - [x] Banco de Dados
  - [x] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [x] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Storage/mídia

---

## [EPIC-F6-E1]: Multi-canal real (IG/TG) com contrato canônico

##### Definição & Justificativa
- **O que:** Normalizar WhatsApp/Instagram/Telegram para um contrato canônico, com adapters e router único no runtime (inbound/outbound + mídia).
- **Por que:** Evita forks por canal e mantém o runtime consistente com a visão multi-canal.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/arch-micro-agent-runtime.md` (linhas 20–22, 47–75)
  - 📄 Documento: `docs/architecture/event-catalog.md` (linhas 61–88)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `agent-runtime/src/modules/channels/adapters/base_adapter.py` - contrato base e capabilities
  - `agent-runtime/src/modules/channels/services/channel_router.py` - roteamento canônico
  - `agent-runtime/src/modules/channels/adapters/instagram_adapter.py` - adapter IG
  - `agent-runtime/src/modules/channels/adapters/telegram_adapter.py` - adapter TG
- **Novos arquivos a criar:**
  - `agent-runtime/src/modules/channels/contracts/events.py` - tipos canônicos
  - `docs/architecture/arch-micro-agent-runtime-channel-contracts.md` - doc do contrato
- **🔗 Conexões Diretas:**
  - adapters ↔️ router ↔️ `agent-runtime/src/modules/centurion/services/centurion_service.py`
- **🔗 Conexões Indiretas:**
  - Media Tools e qualificação precisam respeitar capacidades do canal
- **🎯 Áreas de Impacto:**
  - [ ] Banco de Dados
  - [ ] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Canais/integrações

---

## [EPIC-F7-E1]: Segurança de tool calls e egress (SSRF/allowlist/quotas/limits)

##### Definição & Justificativa
- **O que:** Definir e aplicar política de egress e limites: allowlist de hosts/protocolos, bloqueio SSRF (ranges internos), timeouts e quotas por company/centurion, limites de payload e mídia.
- **Por que:** Em sistemas agentic, tools/media são vetores de SSRF/leaks e fontes de custo/latência; precisamos “guardrails” globais e auditáveis.
- **Referências arquiteturais:**
  - 📄 Documento: `docs/agno-documentation/agno-docs-main/tools/hooks.mdx` (linhas 6–13)
  - 📄 Documento: `docs/architecture/arch-micro-agent-runtime.md` (linhas 89–90)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `agent-runtime/src/modules/tools/services/tool_executor.py` - enforcement de policy/timeout
  - `agent-runtime/src/modules/channels/services/media_downloader.py` - safe download + limites
  - `agent-runtime/src/modules/channels/services/stt_service.py` - limites e timeouts
  - `agent-runtime/src/modules/channels/services/vision_service.py` - limites e timeouts
- **Novos arquivos a criar:**
  - `agent-runtime/src/common/security/egress_policy.py` - allowlist/denylist + SSRF guards
  - `agent-runtime/src/common/security/payload_limits.py` - limites globais por tipo
- **🔗 Conexões Diretas:**
  - policy/hooks ↔️ ToolExecutor ↔️ http clients
- **🔗 Conexões Indiretas:**
  - policy → reduz incidentes → melhora robustez e previsibilidade do runtime
- **🎯 Áreas de Impacto:**
  - [ ] Banco de Dados
  - [ ] APIs/Endpoints
  - [x] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Segurança/custo

---

## [EPIC-F7-E2]: Runbooks + dashboards mínimos (incidentes previsíveis)

##### Definição & Justificativa
- **O que:** Criar runbooks executáveis e dashboards mínimos para incidentes recorrentes: schema não exposto, drift, credenciais inválidas, runtime travado, falhas de webhook.
- **Por que:** Reduz MTTR e transforma operação em um processo reproduzível (sem conhecimento tácito).
- **Referências arquiteturais:**
  - 📄 Documento: `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 145–160)
  - 📄 Documento: `docs/architecture/event-catalog.md` (linhas 166–183)

##### Impacto Técnico & Arquitetural
- **Arquivos a modificar:**
  - `docs/architecture/event-catalog.md` - (se necessário) expandir seção de observabilidade por evento
- **Novos arquivos a criar:**
  - `docs/runbooks/runbook-schema-exposure.md` - “Invalid schema” / fila de exposure
  - `docs/runbooks/runbook-agent-runtime-stuck-processing.md` - stuck debounce/processing
  - `docs/runbooks/runbook-integrations-validation.md` - validação/erro por provider
  - `docs/runbooks/runbook-webhooks.md` - autenticação e reprocessamento de webhooks
- **🔗 Conexões Diretas:**
  - runbooks ↔️ logs/metrics por serviço
- **🔗 Conexões Indiretas:**
  - correlation_id + audit logs → debug end-to-end mais rápido
- **🎯 Áreas de Impacto:**
  - [ ] Banco de Dados
  - [ ] APIs/Endpoints
  - [ ] Serviços/Business Logic
  - [ ] UI/Frontend
  - [ ] Autenticação/Autorização
  - [x] Outros: Operação/Observabilidade

---

# 2. Fases de Implementação Detalhadas

> As fases são uma ordem lógica. Cada fase lista tasks com arquivos, dependências e validações.

## FASE 0: Fundamentos de DB e Multi-Tenancy

**Objetivo:** zerar drift e tornar `POST /companies` + “schema exposure” determinísticos.  
**EPIC(s) Relacionado(s):** EPIC-F0-E1, EPIC-F0-E2, EPIC-F0-E3, EPIC-F0-E4

**Tasks:**

- [ ] **[TASK-0.1]** Implementar drift-check e runbook de migrations
  ```
  📁 Arquivos:
     • Criar: infra/db/migrations-check.sh (~120 linhas)
     • Criar: infra/db/migrations-apply.sh (~160 linhas)
     • Criar: docs/runbooks/runbook-migrations.md (~250 linhas)
     • Modificar: README.md (adicionar ~40 linhas)

  🔗 Depende de: Nada (task inicial)

  📚 Referência:
     • docs/architecture/data-dictionary.md (linhas 7–17)

  ⚠️ Validar:
     • Drift=0 em staging/prod (comparar migrations aplicadas)
     • Scripts não imprimem secrets
     • Runner é idempotente (rodar 2x sem efeitos colaterais)
  ```

- [ ] **[TASK-0.2]** Consolidar RPC de “create company full” e corrigir ambiguidade (provider)
  ```
  📁 Arquivos:
     • Modificar: supabase/migrations/00075_create_company_full.sql (~80 linhas)
     • Modificar: supabase/migrations/00079_fix_create_company_full_provider_ambiguous.sql (~60 linhas)

  🔗 Depende de: TASK-0.1

  📚 Referência:
     • docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md (linhas 167–180)

  ⚠️ Validar:
     • `POST /companies` não falha com `column reference ... is ambiguous`
     • RPC retorna company_id e schema_name corretamente
     • Falhas retornam erro claro (validation vs infra)
  ```

- [ ] **[TASK-0.3]** Garantir fila + drain de exposição PostgREST via direct connection
  ```
  📁 Arquivos:
     • Modificar: supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql (~120 linhas)
     • Modificar: supabase/migrations/00077_fix_postgrest_expose_schema_dedupe.sql (~60 linhas)
     • Modificar: backoffice-api/src/modules/companies/services/postgrest-exposure.service.ts (~120 linhas)
     • Criar: backoffice-api/src/modules/companies/jobs/postgrest-exposure.worker.ts (~180 linhas)
     • Criar: backoffice-api/src/modules/companies/dto/postgrest-exposure.dto.ts (~80 linhas)

  🔗 Depende de: TASK-0.2

  📚 Referência:
     • docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md (linhas 162–180)

  ⚠️ Validar:
     • Criar empresa e validar `.schema(<tenant>)` funciona via PostgREST/supabase-js
     • Rodar drain 2x e validar idempotência (sem duplicar)
     • Se DB estiver indisponível, worker falha com retry/backoff e logs úteis
  ```

- [ ] **[TASK-0.4]** Padronizar grants/default privileges e validar acesso em tenant schemas
  ```
  📁 Arquivos:
     • Modificar: supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql (~100 linhas)
     • Modificar: backoffice-api/src/modules/deals/* (~120 linhas)
     • Criar: docs/runbooks/runbook-rls-and-grants.md (~220 linhas)

  🔗 Depende de: TASK-0.3

  📚 Referência:
     • docs/architecture/data-dictionary.md (linhas 171–184)

  ⚠️ Validar:
     • `/deals` e `/deals/stats` funcionam para empresa de teste
     • Não existe acesso cross-tenant (testar 2 empresas)
  ```

**✅ CHECKPOINT FASE 0:**
- [ ] Drift=0 em staging/prod (migrations-check)
- [ ] `POST /companies` cria empresa e schema sem erro
- [ ] Schema novo é exposto no PostgREST e `.schema(<tenant>)` funciona
- [ ] `/deals` funciona sem `permission denied for schema`

---

## FASE 1: Governança, RBAC e Usuários por Empresa

**Objetivo:** consolidar holding-only, gestão de usuários e auditoria/correlation.  
**EPIC(s) Relacionado(s):** EPIC-F1-E1, EPIC-F1-E2, EPIC-F1-E3

**Tasks:**

- [ ] **[TASK-1.1]** Enforcer RBAC holding-only (API + Web)
  ```
  📁 Arquivos:
     • Criar: backoffice-api/src/modules/auth/guards/holding-role.guard.ts (~90 linhas)
     • Criar: backoffice-api/src/modules/auth/decorators/holding-role.decorator.ts (~40 linhas)
     • Modificar: backoffice-api/src/modules/auth/* (~120 linhas)
     • Criar: backoffice-web/src/modules/auth/rbac.ts (~120 linhas)
     • Modificar: backoffice-web/src/middleware.ts (~80 linhas)

  🔗 Depende de: FASE 0 completa

  📚 Referência:
     • docs/architecture/arch-micro-backoffice-api.md (linhas 216–239)

  ⚠️ Validar:
     • Rotas/endereços bloqueados para roles não permitidos
     • Endpoints retornam 401/403 corretos (sem vazamento de dados)
  ```

- [ ] **[TASK-1.2]** Gestão de usuários por empresa (Supabase Admin + core.company_users)
  ```
  📁 Arquivos:
     • Criar: backoffice-api/src/modules/auth/services/supabase-admin.service.ts (~180 linhas)
     • Modificar: backoffice-api/src/modules/companies/controllers/company-users.controller.ts (~120 linhas)
     • Modificar: backoffice-api/src/modules/companies/services/company-users.service.ts (~180 linhas)
     • Modificar: backoffice-api/src/modules/companies/dto/add-user.dto.ts (~60 linhas)
     • Criar: backoffice-web/src/modules/companies/components/company-users-table.tsx (~240 linhas)

  🔗 Depende de: TASK-1.1

  📚 Referência:
     • docs/architecture/data-dictionary.md (linhas 37–46)

  ⚠️ Validar:
     • Criar/convidar usuário e vincular em `core.company_users`
     • Alterar role e verificar efeito em endpoints protegidos
  ```

- [ ] **[TASK-1.3]** AuditService + instrumentação de writes + correlation em logs
  ```
  📁 Arquivos:
     • Criar: backoffice-api/src/common/audit/audit.service.ts (~200 linhas)
     • Criar: backoffice-api/src/common/audit/audit.types.ts (~80 linhas)
     • Modificar: backoffice-api/src/modules/companies/services/companies.service.ts (~60 linhas)
     • Modificar: backoffice-api/src/modules/integrations/services/*.ts (~80 linhas)
     • Modificar: backoffice-api/src/modules/centurions/services/*.ts (~80 linhas)
     • Modificar: agent-runtime/src/common/middleware/logging.py (~80 linhas)

  🔗 Depende de: TASK-1.1

  📚 Referência:
     • docs/architecture/data-dictionary.md (linhas 157–169)

  ⚠️ Validar:
     • Toda mutação gera audit log com request_id/correlation_id
     • Nenhum secret aparece em logs/audit metadata
  ```

**✅ CHECKPOINT FASE 1:**
- [ ] RBAC holding-only aplicado (API + Web)
- [ ] CRUD de company users funcionando
- [ ] Auditoria consistente em writes críticos

---

## FASE 2: Integrações & Credenciais (sem env por provider)

**Objetivo:** credenciais globais/por empresa + segredos criptografados + wizard.  
**EPIC(s) Relacionado(s):** EPIC-F2-E1, EPIC-F2-E2, EPIC-F2-E3

**Tasks:**

- [ ] **[TASK-2.1]** Consolidar tabelas/enums e resolver credencial efetiva por empresa
  ```
  📁 Arquivos:
     • Modificar: supabase/migrations/00073_company_integrations.sql (~220 linhas)
     • Modificar: backoffice-api/src/modules/integrations/services/integrations-resolver.service.ts (~200 linhas)
     • Modificar: packages/integrations/src/* (~200 linhas)

  🔗 Depende de: FASE 0 completa

  📚 Referência:
     • docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md (linhas 193–260)

  ⚠️ Validar:
     • Resolver retorna credencial efetiva conforme mode (global/custom/disabled)
     • Unicidade por (company_id, provider)
  ```

- [ ] **[TASK-2.2]** Keyring + encrypt/decrypt + migração de plaintext
  ```
  📁 Arquivos:
     • Criar: packages/crypto/src/keyring/keyring.ts (~220 linhas)
     • Modificar: packages/crypto/src/* (~200 linhas)
     • Modificar: supabase/migrations/00074_encrypt_plaintext_secrets.sql (~100 linhas)
     • Modificar: backoffice-api/src/modules/integrations/services/credential-sets.service.ts (~160 linhas)

  🔗 Depende de: TASK-2.1

  📚 Referência:
     • docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md (linhas 12–16)

  ⚠️ Validar:
     • Salvar credencial nunca persiste plaintext
     • Rotação mantém decrypt para dados antigos
  ```

- [ ] **[TASK-2.3]** Providers + validator por provider (status/last_error)
  ```
  📁 Arquivos:
     • Criar: backoffice-api/src/modules/integrations/services/integration-validator.service.ts (~240 linhas)
     • Criar: packages/integrations/src/providers/autentique.ts (~180 linhas)
     • Criar: packages/integrations/src/providers/evolution.ts (~180 linhas)
     • Criar: packages/integrations/src/providers/openai.ts (~180 linhas)

  🔗 Depende de: TASK-2.2

  📚 Referência:
     • docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md (linhas 248–256)

  ⚠️ Validar:
     • Binding marca status `active|invalid|testing` com erros rastreáveis
     • Erros não vazam secrets
  ```

- [ ] **[TASK-2.4]** Wizard de criação de empresa (globais/custom/disabled)
  ```
  📁 Arquivos:
     • Modificar: backoffice-api/src/modules/companies/dto/create-company.dto.ts (~120 linhas)
     • Modificar: backoffice-api/src/modules/companies/services/companies.service.ts (~120 linhas)
     • Criar: backoffice-web/src/modules/companies/components/company-create-wizard/company-create-wizard.tsx (~260 linhas)
     • Criar: backoffice-web/src/modules/companies/components/company-create-wizard/steps/autentique-step.tsx (~220 linhas)
     • Criar: backoffice-web/src/modules/companies/components/company-create-wizard/steps/evolution-step.tsx (~220 linhas)
     • Criar: backoffice-web/src/modules/companies/components/company-create-wizard/steps/openai-step.tsx (~220 linhas)
     • Criar: backoffice-web/src/modules/integrations/providers/autentique.schema.ts (~120 linhas)
     • Criar: backoffice-web/src/modules/integrations/providers/evolution.schema.ts (~120 linhas)
     • Criar: backoffice-web/src/modules/integrations/providers/openai.schema.ts (~120 linhas)

  🔗 Depende de: TASK-2.1, TASK-2.2

  📚 Referência:
     • docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md (linhas 193–205)

  ⚠️ Validar:
     • Criar empresa com providers em modos diferentes
     • Bindings persistem e resolvem corretamente
     • UX: wizard mantém estado e mostra erro por step
  ```

**✅ CHECKPOINT FASE 2:**
- [ ] Credenciais globais + overrides funcionam por empresa
- [ ] Secrets sempre criptografados em repouso
- [ ] Wizard cria empresa já com integrações configuradas (ou desabilitadas)

---

## FASE 3: Runtime resiliente (event envelope + idempotência + debounce + recovery)

**Objetivo:** tornar o Agent Runtime confiável sob retries, concorrência e escala horizontal.  
**EPIC(s) Relacionado(s):** EPIC-F3-E1, EPIC-F3-E2, EPIC-F3-E3

**Tasks:**

- [ ] **[TASK-3.1]** Implementar envelope padrão em producers/consumers (Redis)
  ```
  📁 Arquivos:
     • Criar: agent-runtime/src/common/infrastructure/events/envelope.py (~180 linhas)
     • Modificar: agent-runtime/src/handlers/message_handler.py (~140 linhas)
     • Modificar: evolution-manager/src/modules/webhooks/* (~120 linhas)
     • Modificar: evolution-manager/src/modules/messages/* (~120 linhas)

  🔗 Depende de: FASE 2 completa (para garantir company_id e context consistente)

  📚 Referência:
     • docs/architecture/event-catalog.md (linhas 13–28, 46–57)

  ⚠️ Validar:
     • Eventos inválidos são rejeitados com log estruturado (sem crash)
     • correlation_id é propagado do inbound ao outbound
  ```

- [ ] **[TASK-3.2]** Idempotência por evento (DB store + dedupe keys)
  ```
  📁 Arquivos:
     • Criar: supabase/migrations/00080_event_consumption.sql (~180 linhas)
     • Criar: agent-runtime/src/common/infrastructure/idempotency/idempotency_store.py (~220 linhas)
     • Modificar: agent-runtime/src/modules/centurion/repository/message_repository.py (~160 linhas)
     • Modificar: agent-runtime/src/modules/centurion/services/whatsapp_sender.py (~120 linhas)
     • Modificar: evolution-manager/src/modules/messages/* (~120 linhas)

  🔗 Depende de: TASK-3.1

  📚 Referência:
     • docs/architecture/event-catalog.md (linhas 36–45, 85–88, 110–113)

  ⚠️ Validar:
     • Reprocessar o mesmo inbound não duplica resposta
     • message.sent dedupe por correlation_id + index
  ```

- [ ] **[TASK-3.3]** Debounce com lock/claim e watchdog de recovery
  ```
  📁 Arquivos:
     • Criar: agent-runtime/src/common/infrastructure/locks/redis_lock.py (~160 linhas)
     • Modificar: agent-runtime/src/modules/centurion/handlers/debounce_handler.py (~220 linhas)
     • Modificar: agent-runtime/src/modules/centurion/handlers/message_handler.py (~160 linhas)
     • Criar: agent-runtime/src/modules/centurion/jobs/conversation_watchdog.py (~200 linhas)

  🔗 Depende de: TASK-3.2

  📚 Referência:
     • docs/architecture/arch-micro-agent-runtime.md (linhas 303–318)
     • docs/architecture/data-dictionary.md (linhas 87–99)

  ⚠️ Validar:
     • Dois workers não processam a mesma conversa em paralelo
     • Conversa presa em `processing` é recuperada sem duplicar mensagens
  ```

**✅ CHECKPOINT FASE 3:**
- [ ] Envelope padrão aplicado e validado end-to-end
- [ ] Idempotência cobre inbound/outbound e side-effects principais
- [ ] Debounce seguro para escala horizontal

---

## FASE 4: Agno-first (Structured Output + Memory + Hooks + MCP)

**Objetivo:** maximizar produtividade e robustez usando Agno corretamente.  
**EPIC(s) Relacionado(s):** EPIC-F4-E1, EPIC-F4-E2, EPIC-F4-E3, EPIC-F4-E4

**Tasks:**

- [x] **[TASK-4.1]** Structured Output para qualificação e plano de mídia (Pydantic)
  ```
  📁 Arquivos:
     • Criar: agent-runtime/src/modules/centurion/agno_models/qualification_models.py (~220 linhas)
     • Criar: agent-runtime/src/modules/centurion/agno_models/media_plan_models.py (~220 linhas)
     • Modificar: agent-runtime/src/modules/centurion/services/qualification_service.py (~240 linhas)
     • Modificar: agent-runtime/src/modules/centurion/services/prompt_builder.py (~160 linhas)

  🔗 Depende de: FASE 3 completa

  📚 Referência:
     • docs/agno-documentation/agno-docs-main/agents/structured-output.mdx (linhas 5–45)

  ⚠️ Validar:
     • Parsing do modelo é robusto (erros tratados, fallback controlado)
     • Model outputs são persistidos de forma compatível com DB
  ```

- [x] **[TASK-4.2]** Memory/Storage/Summaries do Agno alinhados a conversation_id
  ```
  📁 Arquivos:
     • Criar: agent-runtime/src/common/infrastructure/agno/storage.py (~220 linhas)
     • Criar: agent-runtime/src/common/infrastructure/agno/memory.py (~220 linhas)
     • Modificar: agent-runtime/src/modules/memory/services/short_term_memory.py (~160 linhas)
     • Modificar: agent-runtime/src/modules/memory/services/memory_cleanup.py (~120 linhas)
     • Modificar: agent-runtime/src/modules/centurion/repository/message_repository.py (~120 linhas)

  🔗 Depende de: TASK-4.1

  📚 Referência:
     • docs/agno-documentation/agno-docs-main/agents/memory.mdx (linhas 11–18, 55–71)

  ⚠️ Validar:
     • Sessão persiste entre execuções do runtime
     • Summaries reduzem contexto sem quebrar coerência do atendimento
  ```

- [x] **[TASK-4.3]** Tool Hooks globais (segurança + logging + auditoria)
  ```
  📁 Arquivos:
     • Criar: agent-runtime/src/modules/tools/agno_hooks/security_hooks.py (~220 linhas)
     • Criar: agent-runtime/src/modules/tools/agno_hooks/logging_hooks.py (~180 linhas)
     • Criar: agent-runtime/src/modules/tools/agno_hooks/audit_hooks.py (~180 linhas)
     • Modificar: agent-runtime/src/modules/tools/services/tool_executor.py (~160 linhas)
     • Modificar: agent-runtime/src/modules/tools/services/schema_validator.py (~120 linhas)

  🔗 Depende de: TASK-4.1

  📚 Referência:
     • docs/agno-documentation/agno-docs-main/tools/hooks.mdx (linhas 6–13, 48–59)

  ⚠️ Validar:
     • Tool calls respeitam allowlist/timeout/payload limits (sem SSRF)
     • Logs incluem latência e correlation_id
     • Auditoria não grava secrets
  ```

- [x] **[TASK-4.4]** Bridge de MCP (DB → MCPTools) com cleanup e error handling
  ```
  📁 Arquivos:
     • Criar: agent-runtime/src/modules/tools/services/agno_mcp_bridge.py (~240 linhas)
     • Modificar: agent-runtime/src/modules/tools/services/mcp_registry.py (~120 linhas)
     • Modificar: agent-runtime/src/modules/tools/services/mcp_tool_adapter.py (~160 linhas)

  🔗 Depende de: TASK-4.3

  📚 Referência:
     • docs/agno-documentation/agno-docs-main/tools/mcp/mcp.mdx (linhas 17–49, 166–174)

  ⚠️ Validar:
     • MCPTools abre/fecha corretamente (context manager)
     • Falhas de MCP não derrubam conversa (fallback)
  ```

**✅ CHECKPOINT FASE 4:**
- [x] Decisões críticas em structured output (qualificação/plano de mídia/tools)
- [x] Memory/Storage/Summaries alinhados ao core
- [x] Tool hooks globais aplicados (segurança/log/audit)
- [x] MCP funcionando via MCPTools com cleanup

---

## FASE 5: Centurions vNext (Qualificação + Explainability + Media Tools)

**Objetivo:** Centurion configurável (critérios/pesos), auditável (explicabilidade) e capaz de orquestrar mídia.  
**EPIC(s) Relacionado(s):** EPIC-F5-E1, EPIC-F5-E2, EPIC-F5-E3

**Tasks:**

- [x] **[TASK-5.1]** UI/API para critérios custom + pesos + threshold por Centurion
  ```
  📁 Arquivos:
     • Criar: backoffice-api/src/modules/centurions/dto/qualification-rules.dto.ts (~180 linhas)
     • Modificar: backoffice-api/src/modules/centurions/dto/create-centurion.dto.ts (~120 linhas)
     • Modificar: backoffice-api/src/modules/centurions/services/centurions.service.ts (~120 linhas)
     • Modificar: backoffice-web/src/modules/centurions/* (~300 linhas)

  🔗 Depende de: FASE 4 completa

  📚 Referência:
     • docs/architecture/data-dictionary.md (linhas 60–73)

  ⚠️ Validar:
     • Config salva e reabre sem perda de estrutura (JSON)
     • API valida schema e retorna erros por campo
  ```

- [x] **[TASK-5.2]** Engine híbrida + histórico append-only de avaliações
  ```
  📁 Arquivos:
     • Criar: agent-runtime/src/modules/centurion/qualification/criteria_engine.py (~280 linhas)
     • Criar: agent-runtime/src/modules/centurion/agno_models/criteria_eval_models.py (~220 linhas)
     • Criar: supabase/migrations/00081_lead_qualification_events.sql (~220 linhas)
     • Modificar: agent-runtime/src/modules/centurion/services/qualification_service.py (~220 linhas)
     • Modificar: backoffice-api/src/modules/leads/* (~200 linhas)
     • Modificar: backoffice-web/src/modules/leads/* (~220 linhas)

  🔗 Depende de: TASK-5.1

  📚 Referência:
     • docs/architecture/event-catalog.md (linhas 142–163)

  ⚠️ Validar:
     • Cada avaliação gera registro com evidências
     • Score por critério soma corretamente conforme pesos
  ```

- [x] **[TASK-5.3]** Media Tools completo (DB + API + UI + tool no runtime + envio)
  ```
  📁 Arquivos:
     • Criar: supabase/migrations/00082_media_assets.sql (~320 linhas)
     • Criar: backoffice-api/src/modules/media/media.module.ts (~80 linhas)
     • Criar: backoffice-api/src/modules/media/controllers/media-assets.controller.ts (~220 linhas)
     • Criar: backoffice-api/src/modules/media/services/media-assets.service.ts (~260 linhas)
     • Criar: backoffice-web/src/modules/media/* (~600 linhas)
     • Criar: agent-runtime/src/modules/centurion/media/media_tool.py (~240 linhas)
     • Modificar: agent-runtime/src/modules/centurion/services/response_builder.py (~180 linhas)
     • Modificar: evolution-manager/src/modules/messages/* (~200 linhas)

  🔗 Depende de: TASK-5.2

  📚 Referência:
     • docs/architecture/arch-micro-evolution-manager.md (linhas 63–75)

  ⚠️ Validar:
     • Upload/storage vincula mídia a company/centurion corretamente
     • Runtime seleciona mídia por contexto e envia via `message.sent`
     • Evolution Manager envia mídia com idempotência
  ```

**✅ CHECKPOINT FASE 5:**
- [x] Critérios/pesos configuráveis e persistidos por Centurion
- [x] Explainability disponível no backoffice
- [x] Media Tools completo e integrado ao envio de mensagens

---

## FASE 6: Multi-canal real (Instagram/Telegram)

**Objetivo:** pipeline canal-agnostic (eventos + adapters + mídia + qualificação) para IG/TG além do WhatsApp.  
**EPIC(s) Relacionado(s):** EPIC-F6-E1

**Tasks:**

- [x] **[TASK-6.1]** Contrato canônico de canal + router único
  ```
  📁 Arquivos:
     • Criar: agent-runtime/src/modules/channels/contracts/events.py (~200 linhas)
     • Modificar: agent-runtime/src/modules/channels/services/channel_router.py (~220 linhas)
     • Modificar: agent-runtime/src/modules/channels/adapters/base_adapter.py (~160 linhas)

  🔗 Depende de: FASE 5 completa

  📚 Referência:
     • docs/architecture/arch-micro-agent-runtime.md (linhas 20–22)

  ⚠️ Validar:
     • Mesmo fluxo funciona para WA/IG/TG (contrato canônico)
     • Capabilities por canal respeitadas (texto/mídia)
  ```

- [x] **[TASK-6.2]** Completar adapters IG/TG e documentação de contrato
  ```
  📁 Arquivos:
     • Modificar: agent-runtime/src/modules/channels/adapters/instagram_adapter.py (~200 linhas)
     • Modificar: agent-runtime/src/modules/channels/adapters/telegram_adapter.py (~200 linhas)
     • Criar: docs/architecture/arch-micro-agent-runtime-channel-contracts.md (~250 linhas)

  🔗 Depende de: TASK-6.1

  📚 Referência:
     • docs/architecture/event-catalog.md (linhas 61–88)

  ⚠️ Validar:
     • Inbound é normalizado para `message.received` corretamente
     • Outbound respeita formato/capacidades por canal
  ```

**✅ CHECKPOINT FASE 6:**
- [x] Contrato canônico documentado e implementado
- [x] IG/TG operando com o mesmo pipeline do WhatsApp

---

## FASE 7: Segurança & Operação (egress policy + runbooks)

**Objetivo:** garantir operação segura e previsível em produção (guardrails e runbooks).  
**EPIC(s) Relacionado(s):** EPIC-F7-E1, EPIC-F7-E2

**Tasks:**

- [x] **[TASK-7.1]** Implementar egress policy + payload limits (tools + mídia)
  ```
  📁 Arquivos:
     • Criar: agent-runtime/src/common/security/egress_policy.py (~220 linhas)
     • Criar: agent-runtime/src/common/security/payload_limits.py (~160 linhas)
     • Modificar: agent-runtime/src/modules/tools/services/tool_executor.py (~160 linhas)
     • Modificar: agent-runtime/src/modules/channels/services/media_downloader.py (~160 linhas)
     • Modificar: agent-runtime/src/modules/channels/services/stt_service.py (~120 linhas)
     • Modificar: agent-runtime/src/modules/channels/services/vision_service.py (~120 linhas)

  🔗 Depende de: FASE 4 completa

  📚 Referência:
     • docs/agno-documentation/agno-docs-main/tools/hooks.mdx (linhas 6–13)

  ⚠️ Validar:
     • SSRF bloqueado (ranges internos) e allowlist respeitada
     • Limites impedem downloads gigantes e tool calls custosas
  ```

- [x] **[TASK-7.2]** Criar runbooks executáveis (incidentes previsíveis)
  ```
  📁 Arquivos:
     • Criar: docs/runbooks/runbook-schema-exposure.md (~220 linhas)
     • Criar: docs/runbooks/runbook-agent-runtime-stuck-processing.md (~220 linhas)
     • Criar: docs/runbooks/runbook-integrations-validation.md (~220 linhas)
     • Criar: docs/runbooks/runbook-webhooks.md (~220 linhas)

  🔗 Depende de: FASE 3 completa

  📚 Referência:
     • docs/architecture/event-catalog.md (linhas 166–183)

  ⚠️ Validar:
     • Cada runbook tem “sintomas → comandos → validação”
     • Runbooks não dependem de conhecimento tácito
  ```

**✅ CHECKPOINT FASE 7:**
- [x] Tool calls e downloads com políticas de egress e limites
- [ ] Runbooks prontos e testados em staging (simulação de falhas)

---

# 3. Matriz de Dependências

| Task | Depende de | Risco | Pode Paralelizar com | Prioridade |
|------|-----------|-------|----------------------|------------|
| TASK-0.1 | - | 🟢 Low | - | P0 |
| TASK-0.2 | TASK-0.1 | 🟡 Medium | - | P0 |
| TASK-0.3 | TASK-0.2 | 🔴 High | - | P0 |
| TASK-0.4 | TASK-0.3 | 🟡 Medium | TASK-1.1 | P0 |
| TASK-1.1 | FASE 0 | 🟡 Medium | TASK-0.4 | P1 |
| TASK-1.2 | TASK-1.1 | 🟡 Medium | TASK-1.3 | P1 |
| TASK-1.3 | TASK-1.1 | 🟡 Medium | TASK-1.2 | P1 |
| TASK-2.1 | FASE 0 | 🟡 Medium | TASK-1.3 | P0 |
| TASK-2.2 | TASK-2.1 | 🔴 High | - | P0 |
| TASK-2.3 | TASK-2.2 | 🟡 Medium | TASK-2.4 | P1 |
| TASK-2.4 | TASK-2.1, TASK-2.2 | 🟡 Medium | TASK-2.3 | P1 |
| TASK-3.1 | FASE 2 | 🟡 Medium | TASK-2.3 | P0 |
| TASK-3.2 | TASK-3.1 | 🔴 High | - | P0 |
| TASK-3.3 | TASK-3.2 | 🔴 High | - | P0 |
| TASK-4.1 | FASE 3 | 🟡 Medium | - | P0 |
| TASK-4.2 | TASK-4.1 | 🟡 Medium | TASK-4.3 | P1 |
| TASK-4.3 | TASK-4.1 | 🔴 High | TASK-4.2 | P0 |
| TASK-4.4 | TASK-4.3 | 🟡 Medium | - | P1 |
| TASK-5.1 | FASE 4 | 🟡 Medium | - | P1 |
| TASK-5.2 | TASK-5.1 | 🔴 High | - | P0 |
| TASK-5.3 | TASK-5.2 | 🔴 High | - | P0 |
| TASK-6.1 | FASE 5 | 🟡 Medium | TASK-7.2 | P1 |
| TASK-6.2 | TASK-6.1 | 🟡 Medium | TASK-7.2 | P2 |
| TASK-7.1 | FASE 4 | 🔴 High | TASK-7.2 | P0 |
| TASK-7.2 | FASE 3 | 🟢 Low | TASK-7.1 | P1 |

**Legenda:**
- 🟢 Low Risk: bem definida, poucos pontos de falha
- 🟡 Medium Risk: envolve integração/múltiplos módulos
- 🔴 High Risk: mudança crítica, alto impacto/complexidade

---

# 4. Glossário de Arquivos

> Consolidado de **todos os arquivos citados** nas EPICs/Tasks (existentes e propostos). Para reduzir ruído, o glossário está agrupado por app/módulo.

## Geral / Infra

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `BACKLOG_VNEXT_AGNO.md` | Existente | Backlog resumido (visão) | - |
| `BACKLOG_VNEXT_AGNO_DETALHADO.md` | Novo | Backlog detalhado (este arquivo) | - |
| `README.md` | Modificado | Procedimentos base, migrations e operação | 0 |
| `infra/` | Existente | Infra/pipeline (quando aplicável) | 0 |
| `infra/db/migrations-check.sh` | Novo | Checagem de drift de migrations | 0 |
| `infra/db/migrations-apply.sh` | Novo | Runner idempotente de migrations | 0 |

## Documentação (Arquitetura + Runbooks + Agno)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` | Existente | Arquitetura macro e princípios | Todas |
| `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md` | Existente | vNext integrações/credenciais/exposure | 0,2 |
| `docs/architecture/arch-micro-agent-runtime.md` | Existente | Arquitetura micro do runtime | 3,4,5,6 |
| `docs/architecture/arch-micro-backoffice-api.md` | Existente | Arquitetura micro do backoffice-api | 0,1,2 |
| `docs/architecture/arch-micro-evolution-manager.md` | Existente | Arquitetura micro do evolution-manager | 3,5 |
| `docs/architecture/data-dictionary.md` | Existente | Dicionário de dados core/tenant | 0,1,5 |
| `docs/architecture/event-catalog.md` | Existente | Catálogo de eventos Redis + idempotência | 3,7 |
| `docs/architecture/arch-micro-agent-runtime-channel-contracts.md` | Novo | Contrato canônico multi-canal | 6 |
| `docs/agno-documentation/agno-docs-main/agents/structured-output.mdx` | Existente | Doc Agno: structured output | 4 |
| `docs/agno-documentation/agno-docs-main/agents/memory.mdx` | Existente | Doc Agno: memory/storage/summaries | 4 |
| `docs/agno-documentation/agno-docs-main/tools/hooks.mdx` | Existente | Doc Agno: tool hooks | 4,7 |
| `docs/agno-documentation/agno-docs-main/tools/mcp/mcp.mdx` | Existente | Doc Agno: MCPTools | 4 |
| `docs/runbooks/runbook-migrations.md` | Novo | Runbook de migrations/rollback | 0 |
| `docs/runbooks/runbook-rls-and-grants.md` | Novo | Runbook grants/RLS por tenant | 0 |
| `docs/runbooks/runbook-key-rotation.md` | Novo | Runbook rotação de chaves | 2 |
| `docs/runbooks/runbook-user-management.md` | Novo | Runbook gestão de usuários | 1 |
| `docs/runbooks/runbook-schema-exposure.md` | Novo | Diagnóstico/correção de schema exposure | 7 |
| `docs/runbooks/runbook-agent-runtime-stuck-processing.md` | Novo | Diagnóstico/correção stuck processing | 7 |
| `docs/runbooks/runbook-integrations-validation.md` | Novo | Diagnóstico/correção credenciais inválidas | 7 |
| `docs/runbooks/runbook-webhooks.md` | Novo | Diagnóstico/correção webhooks | 7 |

## Banco (Supabase migrations)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `supabase/migrations/*` | Existente | Migrações do banco (ordem incremental) | Todas |
| `supabase/migrations/00005_core_leads.sql` | Modificado | Ajustes em `core.leads` (qualification_data) | 5 |
| `supabase/migrations/00006_core_centurion_configs.sql` | Modificado | Evolução de configs do Centurion | 5 |
| `supabase/migrations/00072_auto_expose_tenant_schemas.sql` | Modificado | Base do auto-expose PostgREST | 0 |
| `supabase/migrations/00073_company_integrations.sql` | Modificado | Tabelas/enums de integrações | 2 |
| `supabase/migrations/00074_encrypt_plaintext_secrets.sql` | Modificado | Migração para secrets criptografados | 2 |
| `supabase/migrations/00075_create_company_full.sql` | Modificado | RPC create company full | 0 |
| `supabase/migrations/00077_fix_postgrest_expose_schema_dedupe.sql` | Modificado | Dedupe/concorrência do exposure | 0 |
| `supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql` | Modificado | Fila exposure + grants | 0 |
| `supabase/migrations/00079_fix_create_company_full_provider_ambiguous.sql` | Modificado | Fix ambiguidade provider | 0 |
| `supabase/migrations/00080_event_consumption.sql` | Novo | Store de idempotência (consumo de eventos) | 3 |
| `supabase/migrations/00081_lead_qualification_events.sql` | Novo | Histórico append-only de avaliações | 5 |
| `supabase/migrations/00082_media_assets.sql` | Novo | Media assets + playbooks | 5 |

## Backoffice API (Nest.js)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `backoffice-api/src/common/audit/audit.service.ts` | Novo | Serviço central de auditoria | 1 |
| `backoffice-api/src/common/audit/audit.types.ts` | Novo | Tipos/contratos de auditoria | 1 |
| `backoffice-api/src/modules/*/controllers/*.ts` | Modificado | Instrumentação de writes (audit/correlation) | 1 |
| `backoffice-api/src/modules/*/services/*.ts` | Modificado | Propagação de correlation + audit | 1 |
| `backoffice-api/src/modules/auth/*` | Modificado | Ajustes de auth/guards/claims | 1 |
| `backoffice-api/src/modules/auth/guards/holding-role.guard.ts` | Novo | Guard holding-only | 1 |
| `backoffice-api/src/modules/auth/decorators/holding-role.decorator.ts` | Novo | Decorator de roles | 1 |
| `backoffice-api/src/modules/auth/services/supabase-admin.service.ts` | Novo | Wrapper Supabase Admin API | 1 |
| `backoffice-api/src/modules/companies/controllers/companies.controller.ts` | Modificado | Endpoints companies + RBAC | 0,1 |
| `backoffice-api/src/modules/companies/controllers/company-users.controller.ts` | Modificado | Endpoints company users | 1 |
| `backoffice-api/src/modules/companies/dto/add-user.dto.ts` | Modificado | DTO add user | 1 |
| `backoffice-api/src/modules/companies/dto/create-company.dto.ts` | Modificado | DTO create company + integrations[] | 2 |
| `backoffice-api/src/modules/companies/dto/postgrest-exposure.dto.ts` | Novo | DTO diagnóstico exposure | 0 |
| `backoffice-api/src/modules/companies/dto/provisioning-status.dto.ts` | Novo | DTO status provisioning | 0 |
| `backoffice-api/src/modules/companies/repository/companies.repository.ts` | Modificado | RPC create company e persistência | 0 |
| `backoffice-api/src/modules/companies/services/companies.service.ts` | Modificado | Orquestração create company | 0,1,2 |
| `backoffice-api/src/modules/companies/services/company-provisioning-orchestrator.service.ts` | Novo | Orquestração retries/checkpoints | 0 |
| `backoffice-api/src/modules/companies/services/schema-provisioner.service.ts` | Modificado | Provisionamento schema | 0 |
| `backoffice-api/src/modules/companies/services/postgrest-exposure.service.ts` | Modificado | Drain exposure PostgREST | 0 |
| `backoffice-api/src/modules/companies/jobs/postgrest-exposure.worker.ts` | Novo | Worker de drain exposure | 0 |
| `backoffice-api/src/modules/companies/services/company-users.service.ts` | Modificado | Lógica de company users | 1 |
| `backoffice-api/src/modules/centurions/controllers/centurions.controller.ts` | Modificado | Endpoints centurions + RBAC | 1 |
| `backoffice-api/src/modules/centurions/dto/create-centurion.dto.ts` | Modificado | DTO create centurion + rules | 5 |
| `backoffice-api/src/modules/centurions/dto/qualification-rules.dto.ts` | Novo | DTO rules/weights/threshold | 5 |
| `backoffice-api/src/modules/centurions/services/centurions.service.ts` | Modificado | Persistência config centurion | 5 |
| `backoffice-api/src/modules/integrations/services/credential-sets.service.ts` | Modificado | CRUD sets globais (cripto) | 2 |
| `backoffice-api/src/modules/integrations/services/company-integrations.service.ts` | Modificado | CRUD bindings por empresa | 2 |
| `backoffice-api/src/modules/integrations/services/integrations-resolver.service.ts` | Modificado | Resolver credencial efetiva | 2 |
| `backoffice-api/src/modules/integrations/services/integration-validator.service.ts` | Novo | Validar e marcar status | 2 |
| `backoffice-api/src/modules/deals/*` | Modificado | Handling schema/grants | 0 |
| `backoffice-api/src/modules/leads/*` | Modificado | Endpoints explainability | 5 |
| `backoffice-api/src/modules/mcp/*` | Modificado | CRUD MCP servers | 4 |
| `backoffice-api/src/modules/media/media.module.ts` | Novo | Módulo Media Tools | 5 |
| `backoffice-api/src/modules/media/controllers/media-assets.controller.ts` | Novo | Endpoints media assets | 5 |
| `backoffice-api/src/modules/media/services/media-assets.service.ts` | Novo | Lógica media assets/playbooks | 5 |

## Backoffice Web (Next.js)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `backoffice-web/src/middleware.ts` | Modificado | RBAC e gating de rotas | 1 |
| `backoffice-web/src/lib/*` | Modificado | Client/config (headers/session) | 1 |
| `backoffice-web/src/modules/auth/rbac.ts` | Novo | Helpers RBAC | 1 |
| `backoffice-web/src/modules/companies/*` | Modificado | UI empresas/fluxos | 1,2 |
| `backoffice-web/src/modules/companies/components/company-users-table.tsx` | Novo | UI usuários por empresa | 1 |
| `backoffice-web/src/modules/companies/components/company-create-wizard/company-create-wizard.tsx` | Novo | Wizard create company | 2 |
| `backoffice-web/src/modules/companies/components/company-create-wizard/steps/autentique-step.tsx` | Novo | Step Autentique | 2 |
| `backoffice-web/src/modules/companies/components/company-create-wizard/steps/evolution-step.tsx` | Novo | Step Evolution | 2 |
| `backoffice-web/src/modules/companies/components/company-create-wizard/steps/openai-step.tsx` | Novo | Step OpenAI | 2 |
| `backoffice-web/src/modules/integrations/*` | Modificado | UI de credenciais/bindings | 2 |
| `backoffice-web/src/modules/integrations/providers/autentique.schema.ts` | Novo | Validação provider Autentique | 2 |
| `backoffice-web/src/modules/integrations/providers/evolution.schema.ts` | Novo | Validação provider Evolution | 2 |
| `backoffice-web/src/modules/integrations/providers/openai.schema.ts` | Novo | Validação provider OpenAI | 2 |
| `backoffice-web/src/modules/centurions/*` | Modificado | UI critérios/pesos | 5 |
| `backoffice-web/src/modules/leads/*` | Modificado | UI explainability | 5 |
| `backoffice-web/src/modules/leads/components/qualification-explainability.tsx` | Novo | Componente explainability | 5 |
| `backoffice-web/src/modules/media/*` | Novo | UI Media Tools | 5 |

## Agent Runtime (Python)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `agent-runtime/src/common/middleware/logging.py` | Modificado | correlation/logs | 1,3 |
| `agent-runtime/src/common/infrastructure/events/envelope.py` | Novo | Tipos/validação do envelope | 3 |
| `agent-runtime/src/common/infrastructure/idempotency/idempotency_store.py` | Novo | Store idempotência | 3 |
| `agent-runtime/src/common/infrastructure/locks/redis_lock.py` | Novo | Lock TTL debounce | 3 |
| `agent-runtime/src/handlers/message_handler.py` | Modificado | Subscriber principal Redis | 3 |
| `agent-runtime/src/modules/centurion/handlers/message_handler.py` | Modificado | Handler inbound centurion | 3 |
| `agent-runtime/src/modules/centurion/handlers/debounce_handler.py` | Modificado | Debounce com claim/lock | 3 |
| `agent-runtime/src/modules/centurion/jobs/conversation_watchdog.py` | Novo | Recovery de conversas | 3 |
| `agent-runtime/src/modules/centurion/repository/message_repository.py` | Modificado | Persistência + idempotência | 3,4 |
| `agent-runtime/src/modules/centurion/repository/conversation_repository.py` | Modificado | Persistência de state conversa | 3,4 |
| `agent-runtime/src/modules/centurion/services/whatsapp_sender.py` | Modificado | Outbound message.sent idempotente | 3 |
| `agent-runtime/src/modules/centurion/services/prompt_builder.py` | Modificado | Prompts orientados a schema | 4,5 |
| `agent-runtime/src/modules/centurion/services/qualification_service.py` | Modificado | Qualificação híbrida + persistência | 4,5 |
| `agent-runtime/src/modules/centurion/services/response_builder.py` | Modificado | Plano de resposta (texto+mídia) | 5 |
| `agent-runtime/src/modules/centurion/agno_models/qualification_models.py` | Novo | Pydantic: qualificação | 4 |
| `agent-runtime/src/modules/centurion/agno_models/media_plan_models.py` | Novo | Pydantic: plano de mídia | 4,5 |
| `agent-runtime/src/modules/centurion/agno_models/criteria_eval_models.py` | Novo | Pydantic: avaliação por critério | 5 |
| `agent-runtime/src/modules/centurion/qualification/criteria_engine.py` | Novo | Engine critérios/pesos | 5 |
| `agent-runtime/src/modules/centurion/media/media_tool.py` | Novo | Tool media selection | 5 |
| `agent-runtime/src/modules/memory/services/short_term_memory.py` | Modificado | Memória curta integrada | 4 |
| `agent-runtime/src/modules/memory/services/memory_cleanup.py` | Modificado | Limpeza/retenção memória | 4 |
| `agent-runtime/src/common/infrastructure/agno/storage.py` | Novo | Storage driver Agno | 4 |
| `agent-runtime/src/common/infrastructure/agno/memory.py` | Novo | Memory integration Agno | 4 |
| `agent-runtime/src/modules/tools/services/tool_executor.py` | Modificado | Execução tools + hooks | 4,7 |
| `agent-runtime/src/modules/tools/services/schema_validator.py` | Modificado | Validação schema/payload | 4 |
| `agent-runtime/src/modules/tools/services/tool_registry.py` | Modificado | Registro tools (hooks) | 4 |
| `agent-runtime/src/modules/tools/services/mcp_registry.py` | Modificado | Registry MCP via DB | 4 |
| `agent-runtime/src/modules/tools/services/mcp_tool_adapter.py` | Modificado | Adapter MCPTools | 4 |
| `agent-runtime/src/modules/tools/services/agno_mcp_bridge.py` | Novo | Bridge DB→MCPTools | 4 |
| `agent-runtime/src/modules/tools/agno_hooks/security_hooks.py` | Novo | Hooks segurança tools | 4 |
| `agent-runtime/src/modules/tools/agno_hooks/logging_hooks.py` | Novo | Hooks logging tools | 4 |
| `agent-runtime/src/modules/tools/agno_hooks/audit_hooks.py` | Novo | Hooks auditoria tools | 4 |
| `agent-runtime/src/modules/channels/contracts/events.py` | Novo | Contrato canônico multi-canal | 6 |
| `agent-runtime/src/modules/channels/adapters/base_adapter.py` | Modificado | Base adapter | 6 |
| `agent-runtime/src/modules/channels/adapters/instagram_adapter.py` | Modificado | Adapter Instagram | 6 |
| `agent-runtime/src/modules/channels/adapters/telegram_adapter.py` | Modificado | Adapter Telegram | 6 |
| `agent-runtime/src/modules/channels/services/channel_router.py` | Modificado | Router multi-canal | 6 |
| `agent-runtime/src/modules/channels/services/media_downloader.py` | Modificado | Download seguro de mídia | 7 |
| `agent-runtime/src/modules/channels/services/stt_service.py` | Modificado | STT com limites | 7 |
| `agent-runtime/src/modules/channels/services/vision_service.py` | Modificado | Vision com limites | 7 |
| `agent-runtime/src/common/security/egress_policy.py` | Novo | Egress policy/SSRF guardrails | 7 |
| `agent-runtime/src/common/security/payload_limits.py` | Novo | Payload limits | 7 |

## Evolution Manager / Autentique Service / Facebook CAPI

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `evolution-manager/src/modules/webhooks/*` | Modificado | Producer `message.received` com envelope | 3 |
| `evolution-manager/src/modules/messages/*` | Modificado | Consumer `message.sent` + envio mídia | 3,5 |
| `evolution-manager/src/modules/instances/services/evolution-api.service.ts` | Modificado | Consumo de credenciais por empresa | 2 |
| `autentique-service/src/modules/contracts/services/autentique-integration.service.ts` | Modificado | Consumo de credenciais por empresa | 2 |
| `facebook-capi/src/modules/events/*` | Modificado | Consumer `lead.*` (idempotência/correlation) | 3 |

## Packages (workspaces)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `packages/*` | Existente | Pacotes compartilhados (TS) | 2,3,4 |
| `packages/contracts/src/events/event_envelope.ts` | Novo | Contrato TS do envelope | 3 |
| `packages/crypto/src/*` | Modificado | Crypto primitives + encoding | 2 |
| `packages/crypto/src/keyring/keyring.ts` | Novo | Keyring/rotação | 2 |
| `packages/integrations/src/*` | Modificado | Resolver + tipos providers | 2 |
| `packages/integrations/src/providers/autentique.ts` | Novo | Provider Autentique | 2 |
| `packages/integrations/src/providers/evolution.ts` | Novo | Provider Evolution | 2 |
| `packages/integrations/src/providers/openai.ts` | Novo | Provider OpenAI | 2 |

---

# 5. Observações Finais

- Este backlog deve ser **atualizado continuamente** conforme o projeto evolui.
- Cada task concluída deve ter sua checkbox marcada e, idealmente, data/autor.
- Bloqueios e impedimentos devem ser documentados na própria task (com link para PR/incident).
