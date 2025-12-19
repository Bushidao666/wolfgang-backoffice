# Backlog vNext (Agno-first) — Agent Runtime & Centurions (Holding Backoffice)

Este documento define um **backlog de desenvolvimento holístico**, em **fases progressivas**, estruturado por **EPICs**. O foco é maximizar **produtividade** e **robustez** do sistema, usando o **Agno** da forma mais inteligente possível, enquanto consolidamos a arquitetura multi-tenant por schema e o modelo de integrações por credenciais (globais e/ou por empresa).

> Escopo (repo): `backoffice-web`, `backoffice-api`, `agent-runtime`, `evolution-manager`, `autentique-service`, `facebook-capi`, `packages/*`, `supabase/migrations/*`.

---

## Índice

- [Fase 0 — Base de Dados, Multi-Tenancy e Confiabilidade de Deploy](#fase-0)
- [Fase 1 — Acessos, Usuários e Governança (Holding-only)](#fase-1)
- [Fase 2 — Integrações & Credenciais (Globais + Por Empresa, sem env por provider)](#fase-2)
- [Fase 3 — Agent Runtime: Robustez Operacional (Eventos, Idempotência, Debounce, Recovery)](#fase-3)
- [Fase 4 — Agno “do jeito certo”: Structured Output, Memory, Hooks, MCP e Observabilidade](#fase-4)
- [Fase 5 — Centurions vNext: Qualificação Inteligente + Media Tools](#fase-5)
- [Fase 6 — Multi-canal (Instagram/Telegram) e Orquestração de Conteúdo](#fase-6)
- [Fase 7 — Segurança, Compliance e Runbooks (Operação Sustentável)](#fase-7)

---

## Contexto (pilares que este backlog respeita)

- **SDR 100% IA** (Centurions executam qualificação e follow-up) e **leads nascem no `core`**: `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md:58`, `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md:71`.  
- **Agent Runtime** é o “cérebro” e deve orquestrar mensagem multi-canal, memória, tools/MCP e qualificação: `docs/architecture/arch-micro-agent-runtime.md:13`, `docs/architecture/arch-micro-agent-runtime.md:33`.  
- **Event-driven** via Redis, com envelope, correlation/causation e idempotência: `docs/architecture/event-catalog.md:13`, `docs/architecture/event-catalog.md:36`.  
- **Multi-tenant por schema** com isolamento (RLS/`company_id`) e entidades canônicas no `core`: `docs/architecture/data-dictionary.md:7`, `docs/architecture/data-dictionary.md:13`.  
- **vNext integrações**: credenciais globais e overrides por empresa, segredos criptografados e “schema auto-exposto” para PostgREST: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:10`, `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:162`.

---

<a id="fase-0"></a>
# Fase 0 — Base de Dados, Multi-Tenancy e Confiabilidade de Deploy

> Objetivo: remover “drift” de produção, garantir que o DB tem tudo aplicado e que o provisioning de empresa é determinístico (schema + grants + exposição PostgREST), pois isso destrava TODAS as fases seguintes.

## EPIC F0-E1: Auditoria e “Drift Control” de migrações (cloud vs repo)

### 1) Definição & Justificativa

- **O que:** Criar um processo/automatismo para garantir que **todas as migrations** do diretório `supabase/migrations/` estão aplicadas em cada ambiente (local/staging/prod), com verificação automática e alertas.
- **Por que:** Vários bugs de produção são **sintoma direto** de drift (ex.: função RPC ou tabela esperada não existe no cloud), quebrando criação de empresa, exposição de schemas e regras de grants.
- **Referências arquiteturais:**
  - Provisão de schema + necessidade de PostgREST expor schema: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:56`, `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:162`
  - Multi-tenant por schema e governança no `core`: `docs/architecture/data-dictionary.md:7`, `docs/architecture/data-dictionary.md:15`

### 2) Impacto Técnico

- **Arquivos a serem modificados (repo):**
  - `README.md` (runbook de migrations por ambiente)
  - `infra/` (scripts de CI/CD, se existirem pipelines de migração)
- **Novos arquivos a serem criados:**
  - `infra/db/migrations-check.sh` — script “read-only” para comparar versões e falhar deploy se houver drift.
  - `infra/db/migrations-apply.sh` — runner controlado para aplicar migrations em ordem.
  - `docs/runbooks/runbook-migrations.md` — procedimento de operação (RTO/RPO, rollback, validações).
- **Conexões diretas:**
  - CI/CD (Railway/GitHub Actions) → runner de migrations → Supabase Postgres.
- **Conexões indiretas:**
  - `backoffice-api`/`agent-runtime` dependem de RPCs/tabelas; drift vira incidentes em cascata (companies, deals, creds).
- **Relações com o código:**
  - Pré-requisito para qualquer EPIC que dependa de `supabase/migrations/*`, RPCs e tabelas `core.*` (especialmente provisionamento, integrações e runtime).
- **Áreas de impacto:** banco de dados, deploy, observabilidade/alertas.

---

## EPIC F0-E2: Provisionamento de empresa “à prova de produção” (schema + grants + _template_base)

### 1) Definição & Justificativa

- **O que:** Garantir que o fluxo de criação de empresa:
  1) cria registro canônico em `core.companies`,  
  2) provisiona `<tenant_schema>` via template,  
  3) aplica grants/default privileges corretamente,  
  4) registra mapeamento em `core.company_crms`,  
  5) é **idempotente**, concorrente-safe e recuperável.
- **Por que:** Se esse fluxo falha, o backoffice inteiro quebra (listagens, deals, módulos dependentes). A arquitetura exige multi-tenant por schema com `core` canônico: `docs/architecture/data-dictionary.md:7`, `docs/architecture/data-dictionary.md:28`.
- **Referências arquiteturais:**
  - Multi-tenant por schema e empresa → schema_name: `docs/architecture/data-dictionary.md:28`, `docs/architecture/data-dictionary.md:30`
  - Fluxo do Agent Runtime depende de `company_id` e contexto correto: `docs/architecture/arch-micro-agent-runtime.md:17`, `docs/architecture/arch-micro-agent-runtime.md:47`
  - Design vNext descreve separação provisionamento vs exposição PostgREST: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:162`, `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:177`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `supabase/migrations/00075_create_company_full.sql` (RPC/fluxo transacional de criação “full”)
  - `supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql` (fila de exposição + grants)
  - `supabase/migrations/00079_fix_create_company_full_provider_ambiguous.sql` (correções de ambiguidade e robustez)
  - `backoffice-api/src/modules/companies/repository/companies.repository.ts`
  - `backoffice-api/src/modules/companies/services/companies.service.ts`
  - `backoffice-api/src/modules/companies/services/schema-provisioner.service.ts`
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/companies/services/company-provisioning-orchestrator.service.ts` — orquestra o fluxo com retries e checkpoints.
  - `backoffice-api/src/modules/companies/dto/provisioning-status.dto.ts` — expõe status detalhado (útil para UI).
- **Conexões diretas:**
  - `CompaniesController` → `CompaniesService` → `CompaniesRepository`/RPC.
  - `CompaniesService` → `SchemaProvisionerService`.
- **Conexões indiretas:**
  - `DealsService` (query em `<tenant_schema>.deals`) depende de grants e de schema existir.
  - `Integrations` e `Evolution Manager` dependem de `company_id` e `company_crms`.
- **Relações com o código:**
  - Define o “contrato base” do tenant schema consumido por `backoffice-api` e usado como alvo de handoff pelo `agent-runtime`.
- **Áreas de impacto:** DB, APIs, consistência e governança de tenants.

---

## EPIC F0-E3: Exposição automática de schemas no PostgREST (sem depender de permissões do `authenticator`)

### 1) Definição & Justificativa

- **O que:** Implementar um mecanismo robusto para garantir que, ao criar uma empresa, o `<tenant_schema>` fique **automaticamente exposto** ao PostgREST (para suportar `.schema(<tenant>)` no supabase-js), sem tentar alterar parâmetros via conexão “errada”.
- **Por que:** O PostgREST rejeita acessos a schemas não expostos (“Invalid schema”) e, em produção, a tentativa de `SET pgrst.db_schemas` via usuário sem permissão vira erro 42501. O design vNext já indica separação provisionamento (DB) vs exposição (job/serviço com conexão direta): `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:162`.
- **Referências arquiteturais:**
  - Problema e abordagem vNext: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:162`, `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:167`
  - Multi-tenant por schema: `docs/architecture/data-dictionary.md:7`, `docs/architecture/data-dictionary.md:171`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `supabase/migrations/00072_auto_expose_tenant_schemas.sql` (base do mecanismo)
  - `supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql` (fila e função de enqueue)
  - `supabase/migrations/00077_fix_postgrest_expose_schema_dedupe.sql` (dedupe/idempotência)
  - `backoffice-api/src/modules/companies/services/postgrest-exposure.service.ts`
  - `backoffice-api/src/modules/companies/services/companies.service.ts`
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/companies/jobs/postgrest-exposure.worker.ts` — worker dedicado (drain periódico) com métricas e logs.
  - `backoffice-api/src/modules/companies/dto/postgrest-exposure.dto.ts` — endpoints internos de diagnóstico (status da fila).
- **Conexões diretas:**
  - `postgrest-exposure.service.ts` → Postgres (via `SUPABASE_DB_URL`, conexão direta).
  - `CompaniesService` → enqueue + trigger de drain.
- **Conexões indiretas:**
  - `backoffice-web` usa `.schema(tenant)`; sem exposição, módulos “sumirem” na UI.
  - `backoffice-api` endpoints como `/deals` falham se schema não exposto/sem grants.
- **Relações com o código:**
  - Amarra `CompaniesService` (create) ao “estado operacional” do tenant via PostgREST, evitando regressões em módulos que usam `.schema(...)`.
- **Áreas de impacto:** DB/PostgREST, confiabilidade de criação de empresa, UX do backoffice.

---

## EPIC F0-E4: Grants/RLS consistentes para “read/write operational” por schema de tenant

### 1) Definição & Justificativa

- **O que:** Padronizar grants e default privileges em `<tenant_schema>` para garantir que os roles necessários (ex.: `authenticator`, `anon`, `authenticated`, roles internos de serviço) consigam executar as operações previstas com segurança.
- **Por que:** Erros como `permission denied for schema <tenant>` bloqueiam endpoints críticos (deals, stats), mesmo quando o schema existe.
- **Referências arquiteturais:**
  - Isolamento multi-tenant e RLS: `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md:82`
  - Estrutura de dados de deals por schema: `docs/architecture/data-dictionary.md:171`, `docs/architecture/data-dictionary.md:173`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `supabase/migrations/00078_defer_postgrest_exposure_and_fix_tenant_grants.sql`
  - `_template_base` (se existir definição de template em migrations/seed)
  - `backoffice-api/src/modules/deals/*` (garantir queries com schema e permissões corretas)
- **Novos arquivos a serem criados:**
  - `docs/runbooks/runbook-rls-and-grants.md` — matriz de roles × schemas × operações e checklist de validação.
- **Conexões diretas:**
  - Postgres roles/policies → PostgREST → supabase-js.
- **Conexões indiretas:**
  - Agent Runtime faz handoff para `<tenant_schema>.deals`; sem grants, qualificação “morre” no final.
- **Relações com o código:**
  - Requisito transversal para qualquer módulo que opere em schemas de tenant (deals, contracts, marketing, etc.).
- **Áreas de impacto:** DB/RLS, APIs, integridade do funil SDR.

---

<a id="fase-1"></a>
# Fase 1 — Acessos, Usuários e Governança (Holding-only)

> Objetivo: consolidar “quem pode fazer o quê” (holding-only), com backoffice gerenciando usuários/roles por empresa e garantindo auditoria de ações.

## EPIC F1-E1: Modelo de RBAC holding-only + “company-scoped resources”

### 1) Definição & Justificativa

- **O que:** Definir e implementar RBAC consistente:
  - no **Backoffice**: somente `super_admin` e `backoffice_admin` (e `ai_supervisor` para operações específicas),  
  - recursos sempre com `company_id` (golden rule: sem `company_id`, sem recurso).
- **Por que:** A arquitetura macro define papéis e isolamento. Sem RBAC consistente, qualquer camada vira bypass de governança e auditoria.
- **Referências arquiteturais:**
  - Roles e SDR 100% IA: `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md:66`
  - Endpoints por módulo e roles: `docs/architecture/arch-micro-backoffice-api.md:216`, `docs/architecture/arch-micro-backoffice-api.md:229`
  - Convenções de `company_id` e multi-tenant: `docs/architecture/data-dictionary.md:7`, `docs/architecture/data-dictionary.md:10`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/auth/*` (guards/claims/roles)
  - `backoffice-api/src/modules/companies/controllers/companies.controller.ts`
  - `backoffice-api/src/modules/companies/controllers/company-users.controller.ts`
  - `backoffice-api/src/modules/centurions/controllers/centurions.controller.ts`
  - `backoffice-web/src/middleware.ts` (proteções de rota)
  - `backoffice-web/src/lib/*` (client de API/headers `x-company-id`)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/auth/guards/holding-role.guard.ts` — enforcement explícito holding-only.
  - `backoffice-api/src/modules/auth/decorators/holding-role.decorator.ts` — DX para controllers.
  - `backoffice-web/src/modules/auth/rbac.ts` — helpers de RBAC no frontend.
- **Conexões diretas:**
  - JWT (Supabase Auth) → `backoffice-api` guards → controllers.
- **Conexões indiretas:**
  - `agent-runtime` e microserviços consumirão credenciais por `company_id`; RBAC governa CRUD dessas configurações.
- **Relações com o código:**
  - Define a “fronteira” de acesso do `backoffice-web`/`backoffice-api` e evita que módulos internos virem superfícies de escalonamento de privilégio.
- **Áreas de impacto:** segurança, API, UI, auditoria.

---

## EPIC F1-E2: Gestão de usuários por empresa (backoffice como “admin console” do Supabase Auth)

### 1) Definição & Justificativa

- **O que:** Implementar no backoffice:
  - criar/convidar usuário (Supabase Auth),
  - vincular usuário à empresa em `core.company_users`,
  - alterar role (por empresa),
  - desativar/remover vínculo.
- **Por que:** O dono da holding precisa administrar acessos por empresa no backoffice (não em dashboards externos). O data dictionary explicita `core.company_users`: `docs/architecture/data-dictionary.md:37`.
- **Referências arquiteturais:**
  - `core.company_users`: `docs/architecture/data-dictionary.md:37`
  - Endpoints companies/users: `docs/architecture/arch-micro-backoffice-api.md:216`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/companies/controllers/company-users.controller.ts`
  - `backoffice-api/src/modules/companies/services/company-users.service.ts`
  - `backoffice-api/src/modules/companies/dto/add-user.dto.ts`
  - `backoffice-web/src/modules/companies/*` (telas de usuários por empresa)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/auth/services/supabase-admin.service.ts` — wrapper do Admin API do Supabase.
  - `backoffice-web/src/modules/companies/components/company-users-table.tsx` — tabela com roles e ações.
  - `docs/runbooks/runbook-user-management.md` — operação e auditoria de acessos.
- **Conexões diretas:**
  - `CompanyUsersService` → Supabase Admin API + `core.company_users`.
- **Conexões indiretas:**
  - RLS e claims por `company_id` (fronts operacionais) dependem desse vínculo.
- **Relações com o código:**
  - Conecta governança (core) com acesso operacional, e habilita futuras integrações “company-scoped” com usuários/roles.
- **Áreas de impacto:** auth, DB, UI, compliance.

---

## EPIC F1-E3: Auditoria completa (audit_logs) e trilhas por request/correlation

### 1) Definição & Justificativa

- **O que:** Padronizar auditoria em todas as mutações relevantes (criar empresa, setar credenciais, alterar centurion, criar media asset, etc.), registrando `actor_*`, `company_id`, `request_id` e `correlation_id`.
- **Por que:** Segurança e operação. Sem trilha auditável, incidentes de credencial/integração ficam impossíveis de rastrear. O data dictionary já prevê `core.audit_logs`: `docs/architecture/data-dictionary.md:157`.
- **Referências arquiteturais:**
  - `core.audit_logs`: `docs/architecture/data-dictionary.md:157`
  - Envelope/correlation/causation de eventos: `docs/architecture/event-catalog.md:13`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/*/controllers/*.ts` (writes)
  - `backoffice-api/src/modules/*/services/*.ts` (writes)
  - `agent-runtime/src/common/middleware/logging.py` (correlation propagation)
  - `evolution-manager/src/modules/*` (propagar correlation em events)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/common/audit/audit.service.ts` — API única para registrar ações.
  - `backoffice-api/src/common/audit/audit.types.ts` — contratos padronizados.
- **Conexões diretas:**
  - Controllers → AuditService → `core.audit_logs`.
- **Conexões indiretas:**
  - Observabilidade (Fase 4/Fase 7) usa audit logs como fonte.
- **Relações com o código:**
  - Padroniza writes em `backoffice-api` e cria base para rastrear efeitos colaterais disparados via Redis por `agent-runtime` e satélites.
- **Áreas de impacto:** DB, observabilidade, segurança, operação.

---

<a id="fase-2"></a>
# Fase 2 — Integrações & Credenciais (Globais + Por Empresa, sem env por provider)

> Objetivo: remover dependência de env para Autentique/Evolution/OpenAI, usando credenciais por empresa (com opção de “globais”) e segredos criptografados.

## EPIC F2-E1: Modelo canônico de credenciais (Credential Sets) + bindings por empresa

### 1) Definição & Justificativa

- **O que:** Implementar o modelo:
  - `core.integration_credential_sets` (globais)
  - `core.company_integration_bindings` (por empresa, com `mode: global|custom|disabled`)
  - Resolver credencial efetiva por `company_id` + provider.
- **Por que:** É requisito do vNext e elimina env por provider; habilita wizard na criação de empresa; viabiliza rotação/invalidade e debug por empresa.
- **Referências arquiteturais:**
  - Problema e solução vNext: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:12`, `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:193`
  - Modelo de dados proposto (provider/sets/bindings): `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:207`, `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:237`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `supabase/migrations/00073_company_integrations.sql` (tabelas/enums)
  - `backoffice-api/src/modules/integrations/integrations.module.ts`
  - `backoffice-api/src/modules/integrations/services/credential-sets.service.ts`
  - `backoffice-api/src/modules/integrations/services/company-integrations.service.ts`
  - `backoffice-api/src/modules/integrations/services/integrations-resolver.service.ts`
  - `packages/integrations/src/*` (resolver tipado)
- **Novos arquivos a serem criados:**
  - `packages/integrations/src/providers/*.ts` — contrato por provider (autentique/evolution/openai/…).
  - `backoffice-api/src/modules/integrations/services/integration-validator.service.ts` — valida credenciais e marca status.
- **Conexões diretas:**
  - `backoffice-web` → `backoffice-api /integrations/*` → DB.
  - microserviços → resolver (`@wolfgang/integrations`) → DB.
- **Conexões indiretas:**
  - `agent-runtime` usará provider OpenAI e tool executors; `evolution-manager` usará Evolution API.
- **Relações com o código:**
  - Centraliza o “source of truth” de credenciais e reduz acoplamento entre serviços e variáveis de ambiente por provider.
- **Áreas de impacto:** DB, APIs, serviços satélites, UI.

---

## EPIC F2-E2: Segredos criptografados + rotação (keyring) + política de fallback

### 1) Definição & Justificativa

- **O que:** Padronizar criptografia de secrets (ex.: `secrets_enc`, `secrets_override_enc`) com:
  - keyring com “key current” + “keys antigas” (rotação),
  - migração de plaintext → encrypted,
  - validações (não permitir persistir plaintext).
- **Por que:** Segurança e compliance; sem isso, qualquer vazamento do DB expõe tokens. O vNext fala explicitamente em criptografia e rotação: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:14`.
- **Referências arquiteturais:**
  - vNext (segredos/cripto/rotação): `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:14`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `packages/crypto/src/*` (keyring, encrypt/decrypt, versioning)
  - `supabase/migrations/00074_encrypt_plaintext_secrets.sql`
  - `backoffice-api/src/modules/integrations/services/credential-sets.service.ts`
  - `autentique-service/src/modules/contracts/services/autentique-integration.service.ts`
  - `evolution-manager/src/modules/instances/services/evolution-api.service.ts`
  - `agent-runtime/src/config/openai/config.py` (remover dependência de env por provider e ler do DB via API/client)
- **Novos arquivos a serem criados:**
  - `packages/crypto/src/keyring/keyring.ts` — API explícita de keyring (rotate, encrypt, decrypt).
  - `docs/runbooks/runbook-key-rotation.md` — passos de rotação e rollback.
- **Conexões diretas:**
  - Serviços → `@wolfgang/crypto` → DB (secrets_enc).
- **Conexões indiretas:**
  - Qualquer provider que dependa de segredo (Autentique webhook secret, OpenAI key, etc).
- **Relações com o código:**
  - É o bloco de segurança que permite tirar credenciais de env e ainda manter segredos protegidos em repouso.
- **Áreas de impacto:** segurança, DB, serviços, auditoria.

---

## EPIC F2-E3: Wizard de criação de empresa (selecionar globais vs configurar por empresa)

### 1) Definição & Justificativa

- **O que:** Na criação de empresa, permitir:
  - escolher “usar credenciais globais” (set default por provider),
  - ou “configurar específicas” (wizard step-by-step),
  - ou “disabled” por provider.
- **Por que:** É requisito operacional do dono da holding e reduz erro humano.
- **Referências arquiteturais:**
  - Wizard e credenciais globais/por empresa: `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:193`, `docs/architecture/ARCH-VNEXT-integracoes-credenciais-acessos.md:200`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `backoffice-web/src/modules/companies/*` (fluxo de criação)
  - `backoffice-web/src/modules/integrations/*` (reuso de forms por provider)
  - `backoffice-api/src/modules/companies/dto/create-company.dto.ts` (payload “integrations[]”)
  - `backoffice-api/src/modules/companies/services/companies.service.ts` (persistir bindings no create)
  - `backoffice-api/src/modules/integrations/services/company-integrations.service.ts` (upsert bindings)
- **Novos arquivos a serem criados:**
  - `backoffice-web/src/modules/companies/components/company-create-wizard/*` (steps por provider)
  - `backoffice-web/src/modules/integrations/providers/*` (schemas/form validators por provider)
- **Conexões diretas:**
  - Wizard (web) → endpoint create company (api) → bindings + provisionamento schema.
- **Conexões indiretas:**
  - `evolution-manager`/`autentique-service` passam a usar bindings por empresa.
- **Relações com o código:**
  - Encosta “companies provisioning” (Fase 0) em “integrations bindings” de forma atômica (empresa nasce pronta para operar).
- **Áreas de impacto:** UI/UX, API, DB.

---

<a id="fase-3"></a>
# Fase 3 — Agent Runtime: Robustez Operacional (Eventos, Idempotência, Debounce, Recovery)

> Objetivo: tornar o runtime confiável sob concorrência, retries e alto volume, garantindo estado consistente e evitando duplicidade (mensagens, qualificação, handoff).

## EPIC F3-E1: Padronização do envelope de eventos e propagação de correlation_id end-to-end

### 1) Definição & Justificativa

- **O que:** Garantir que todos os serviços publiquem/consumam eventos no envelope padrão e propaguem `correlation_id`/`causation_id`.
- **Por que:** Sem isso, debugging e auditoria viram “adivinhação” em incidentes de produção.
- **Referências arquiteturais:**
  - Envelope padrão: `docs/architecture/event-catalog.md:13`
  - Catálogo de canais message.received/sent, lead.created/qualified: `docs/architecture/event-catalog.md:46`
  - Agent Runtime na macro: `docs/architecture/arch-micro-agent-runtime.md:47`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `evolution-manager/src/modules/webhooks/*` (producer `message.received`)
  - `evolution-manager/src/modules/messages/*` (consumer `message.sent`)
  - `agent-runtime/src/handlers/message_handler.py`
  - `agent-runtime/src/modules/centurion/handlers/message_handler.py`
  - `agent-runtime/src/modules/centurion/handlers/debounce_handler.py`
  - `facebook-capi/src/modules/events/*` (consumers `lead.created`, `lead.qualified`)
  - `autentique-service/src/modules/contracts/controllers/webhooks.controller.ts` (producers contract events)
  - `backoffice-api/src/modules/*` (consumers `lead.qualified`, etc.)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/common/infrastructure/events/envelope.py` — tipos e validação do envelope.
  - `packages/contracts/src/events/*` — contratos compartilhados (se o repo usar packages para isso).
- **Conexões diretas:**
  - Redis Pub/Sub ↔ serviços.
- **Conexões indiretas:**
  - Observabilidade e audit logs (Fase 1/Fase 7) dependem de correlation consistente.
- **Relações com o código:**
  - Unifica debugging entre serviços e evita “buracos” de rastreabilidade em fluxos assíncronos.
- **Áreas de impacto:** eventos, logs, tracing, consistência.

---

## EPIC F3-E2: Idempotência real (message.received, message.sent, lead.qualified, handoff)

### 1) Definição & Justificativa

- **O que:** Implementar idempotência nos pontos com side-effects:
  - dedupe de inbound (chave natural do canal),
  - dedupe de outbound (correlation + index),
  - dedupe de qualificação e handoff.
- **Por que:** Redis Pub/Sub é at-most-once, mas retries/replays fazem o sistema operar como at-least-once; sem dedupe, você duplica mensagens, qualifica duas vezes, cria dois handoffs etc.
- **Referências arquiteturais:**
  - Regras de idempotência: `docs/architecture/event-catalog.md:36`
  - Chave recomendada p/ inbound/outbound: `docs/architecture/event-catalog.md:85`, `docs/architecture/event-catalog.md:110`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/centurion/repository/message_repository.py` (persist/lookup dedupe keys)
  - `agent-runtime/src/modules/centurion/services/whatsapp_sender.py` (dedupe outbound)
  - `evolution-manager/src/modules/messages/*` (idempotency key no envio)
  - `supabase/migrations/*` (tabelas/índices para “event dedupe”)
- **Novos arquivos a serem criados:**
  - `supabase/migrations/0008x_event_deduplication.sql` — tabela `core.event_consumption` (ou similar) + índices.
  - `agent-runtime/src/common/infrastructure/idempotency/idempotency_store.py` — storage (DB/Redis) com TTL e “exactly-once-ish”.
- **Conexões diretas:**
  - Consumers → IdempotencyStore → DB/Redis.
- **Conexões indiretas:**
  - Follow-ups e media sequences podem gerar duplicidade se não participarem do mesmo mecanismo.
- **Relações com o código:**
  - Garante que o pipeline “mensagem → resposta → qualificação → handoff” não duplica efeitos colaterais.
- **Áreas de impacto:** runtime, mensageria, DB, confiabilidade.

---

## EPIC F3-E3: Debounce robusto com claim/lock e recovery de estado “processing”

### 1) Definição & Justificativa

- **O que:** Reimplementar debounce seguindo o pattern do documento, porém com:
  - claim de processamento por conversa (lock com TTL),
  - watchdog para limpar conversas presas em `processing`,
  - buffer “pending_messages” consistente,
  - métricas (pending_count, latency).
- **Por que:** Sem claim/lock, duas instâncias do runtime podem processar a mesma conversa em paralelo (duplicando respostas). Além disso, o estado `processing` pode travar e bloquear o lead.
- **Referências arquiteturais:**
  - Debounce pattern: `docs/architecture/arch-micro-agent-runtime.md:303`
  - `core.conversations` mantém `pending_messages` e debounce fields: `docs/architecture/data-dictionary.md:87`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/centurion/handlers/debounce_handler.py`
  - `agent-runtime/src/modules/centurion/handlers/message_handler.py`
  - `agent-runtime/src/modules/centurion/repository/conversation_repository.py`
  - `agent-runtime/src/modules/centurion/services/centurion_service.py`
  - `agent-runtime/src/modules/memory/services/short_term_memory.py` (se usado como cache de state)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/common/infrastructure/locks/redis_lock.py` — lock com TTL + refresh.
  - `agent-runtime/src/modules/centurion/jobs/conversation_watchdog.py` — recovery periódico.
  - `supabase/migrations/0008x_conversation_state_machine.sql` — constraints/enum para states (opcional, se desejado).
- **Conexões diretas:**
  - Runtime → Redis (locks + debounce).
  - Runtime → DB (persistência do estado).
- **Conexões indiretas:**
  - `message.sent` e follow-ups dependem de “uma resposta por janela”.
- **Relações com o código:**
  - Define o comportamento sob escala horizontal do `agent-runtime` e elimina corridas entre workers.
- **Áreas de impacto:** runtime, Redis, DB, escalabilidade.

---

<a id="fase-4"></a>
# Fase 4 — Agno “do jeito certo”: Structured Output, Memory, Hooks, MCP e Observabilidade

> Objetivo: aproveitar recursos do Agno que hoje estão subutilizados e transformar isso em velocidade de entrega + robustez.

## EPIC F4-E1: Structured Output (Pydantic) para qualificação, roteamento e decisões críticas

### 1) Definição & Justificativa

- **O que:** Migrar decisões críticas (qualificação, extração de campos, escolha de mídia/tool) para outputs estruturados (Pydantic), usando `response_model` (e opcionalmente `parser_model` quando necessário).
- **Por que:** Reduz “string parsing”, torna o sistema testável e previsível, e é um recurso nativo do Agno que se encaixa perfeitamente no nosso “sistema de critérios e pesos”.
- **Referências arquiteturais:**
  - Agno Structured Output (`response_model`, JSON mode): `docs/agno-documentation/agno-docs-main/agents/structured-output.mdx:5`, `docs/agno-documentation/agno-docs-main/agents/structured-output.mdx:28`
  - Runtime deve qualificar por critérios configuráveis: `docs/architecture/arch-micro-agent-runtime.md:42`, `docs/architecture/arch-micro-agent-runtime.md:532`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/centurion/services/qualification_service.py`
  - `agent-runtime/src/modules/centurion/services/prompt_builder.py`
  - `agent-runtime/src/modules/centurion/services/response_builder.py`
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/centurion/agno_models/qualification_models.py` — modelos Pydantic (scores, evidências, campos).
  - `agent-runtime/src/modules/centurion/agno_models/media_decision_models.py` — seleção de mídia e justificativas.
- **Conexões diretas:**
  - Agno Agent → `response_model` → `QualificationService`.
- **Conexões indiretas:**
  - DB armazenará `qualification_data` e “evidências”; UI exibirá explicabilidade.
- **Relações com o código:**
  - Reduz parsing textual em múltiplos pontos (qualificação, roteamento, mídia, tools) e facilita testes determinísticos.
- **Áreas de impacto:** runtime, testes, UX (transparência), confiabilidade.

---

## EPIC F4-E2: Memory do Agno (Storage + User Memories + Summaries) alinhada ao nosso `core.conversations/messages`

### 1) Definição & Justificativa

- **O que:** Consolidar memória usando os 3 tipos do Agno:
  - **Storage** (histórico/estado de sessão persistidos),
  - **User memories** (preferências/fatos aprendidos),
  - **Session summaries** (resumo para janelas longas).
- **Por que:** Hoje a implementação tende a “reinventar” partes de memória; usar Agno corretamente aumenta robustez e reduz custo de manutenção.
- **Referências arquiteturais:**
  - Tipos de memória e session state persistido: `docs/agno-documentation/agno-docs-main/agents/memory.mdx:11`, `docs/agno-documentation/agno-docs-main/agents/memory.mdx:13`
  - Nosso modelo de conversas/mensagens: `docs/architecture/data-dictionary.md:87`, `docs/architecture/data-dictionary.md:100`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/memory/services/short_term_memory.py`
  - `agent-runtime/src/modules/memory/services/memory_cleanup.py`
  - `agent-runtime/src/modules/centurion/services/centurion_service.py`
  - `agent-runtime/src/modules/centurion/repository/conversation_repository.py`
  - `agent-runtime/src/modules/centurion/repository/message_repository.py`
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/common/infrastructure/agno/storage.py` — driver storage (Postgres) mapeando `conversation_id/session_id`.
  - `agent-runtime/src/common/infrastructure/agno/memory.py` — integração do MemoryManager (user memories + summaries).
- **Conexões diretas:**
  - Agno Agent ↔ Storage/Memory ↔ Postgres.
- **Conexões indiretas:**
  - RAG/knowledge base se beneficia de summaries e user memories para retrieval.
- **Relações com o código:**
  - Alinha memória “de verdade” (Agno) com `core.conversations/messages`, evitando duplicação de mecanismos e inconsistências.
- **Áreas de impacto:** runtime, DB, performance (context windows).

---

## EPIC F4-E3: Tool Hooks (políticas, logging, segurança) para TODAS as tool calls

### 1) Definição & Justificativa

- **O que:** Implementar tool hooks para:
  - validação (schema, permissões, rate limits),
  - logging (tempo, payload size, outcomes),
  - bloqueios (denylist SSRF, host allowlist),
  - auditoria/metrics.
- **Por que:** Tool calls são “o lugar” onde incidentes acontecem (SSRF, leaks, timeouts). Agno oferece hooks nativos: `docs/agno-documentation/agno-docs-main/tools/hooks.mdx:6`.
- **Referências arquiteturais:**
  - Agno tool hooks e pre/post hooks: `docs/agno-documentation/agno-docs-main/tools/hooks.mdx:6`, `docs/agno-documentation/agno-docs-main/tools/hooks.mdx:125`
  - Runtime executa Tools & MCP: `docs/architecture/arch-micro-agent-runtime.md:89`, `docs/architecture/arch-micro-agent-runtime.md:157`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/tools/services/tool_executor.py`
  - `agent-runtime/src/modules/tools/services/schema_validator.py`
  - `agent-runtime/src/modules/tools/services/mcp_tool_adapter.py`
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/tools/agno_hooks/security_hooks.py` — SSRF/allowlist/timeouts.
  - `agent-runtime/src/modules/tools/agno_hooks/logging_hooks.py` — métricas e logs estruturados.
  - `agent-runtime/src/modules/tools/agno_hooks/audit_hooks.py` — audit logs (Fase 1).
- **Conexões diretas:**
  - Agno Agent/Team → tool hooks → ToolExecutor.
- **Conexões indiretas:**
  - Observabilidade e compliance dependem desses hooks para rastrear ações sensíveis.
- **Relações com o código:**
  - Centraliza políticas de segurança e telemetria de tools, evitando que cada tool implemente seu próprio “mini-framework”.
- **Áreas de impacto:** segurança, runtime, observabilidade, auditoria.

---

## EPIC F4-E4: MCP “nativo” via Agno MCPTools (e MultiMCPTools quando aplicável)

### 1) Definição & Justificativa

- **O que:** Reorganizar integração MCP para usar `MCPTools` como context manager, conectando servidores MCP configurados por centurion e expondo isso como tools reais no Agent.
- **Por que:** Agno já resolve boa parte do plumbing; usar corretamente reduz código “custom” e melhora confiabilidade/cleanup.
- **Referências arquiteturais:**
  - Agno MCPTools: `docs/agno-documentation/agno-docs-main/tools/mcp/mcp.mdx:17`, `docs/agno-documentation/agno-docs-main/tools/mcp/mcp.mdx:32`
  - `core.mcp_servers` no data dictionary: `docs/architecture/data-dictionary.md:141`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/tools/services/mcp_registry.py`
  - `agent-runtime/src/modules/tools/services/mcp_tool_adapter.py`
  - `backoffice-api/src/modules/mcp/*` (CRUD de servidores MCP por centurion)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/tools/services/agno_mcp_bridge.py` — cria MCPTools dinamicamente a partir do DB.
- **Conexões diretas:**
  - Agent Runtime ↔ MCP servers (externos) via MCPTools.
- **Conexões indiretas:**
  - Media Tools e qualificação podem depender de MCP para consultas (ex.: catálogos).
- **Relações com o código:**
  - Remove plumbing custom, reduz risco de leak/cleanup e torna MCP um “cidadão de primeira classe” do Agent.
- **Áreas de impacto:** runtime, segurança, extensibilidade.

---

<a id="fase-5"></a>
# Fase 5 — Centurions vNext: Qualificação Inteligente + Media Tools

> Objetivo: transformar Centurion em SDR estratégico, configurável pelo dono (critérios/pesos, explicabilidade, escolha de mídia contextual e sequências).

## EPIC F5-E1: DSL de critérios de qualificação (custom) + pesos + thresholds (por Centurion)

### 1) Definição & Justificativa

- **O que:** Permitir que o admin defina critérios do zero e pesos, por Centurion:
  - critérios booleanos (“tem nome?”),
  - critérios fuzzy (“orçamento adequado?”),
  - critérios extraídos da conversa (“urgência”, “intenção”, “objeções”),
  - pesos e threshold final.
- **Por que:** É requisito explícito do sistema de qualificação inteligente e alavanca a LLM para interpretar nuances (não só checklists).
- **Referências arquiteturais:**
  - `core.centurion_configs.qualification_rules` já existe no modelo: `docs/architecture/data-dictionary.md:60`
  - Runtime qualifica e dispara handoff por critérios: `docs/architecture/arch-micro-agent-runtime.md:42`, `docs/architecture/arch-micro-agent-runtime.md:496`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `supabase/migrations/00006_core_centurion_configs.sql` (evoluir `qualification_rules` e campos relacionados)
  - `backoffice-api/src/modules/centurions/dto/create-centurion.dto.ts`
  - `backoffice-api/src/modules/centurions/services/centurions.service.ts`
  - `agent-runtime/src/modules/centurion/services/qualification_service.py`
  - `agent-runtime/src/modules/centurion/services/prompt_builder.py`
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/centurions/dto/qualification-rules.dto.ts` — schema tipado para UI/API.
  - `agent-runtime/src/modules/centurion/qualification/criteria_engine.py` — “engine” híbrido (LLM + deterministic checks).
  - `agent-runtime/src/modules/centurion/agno_models/criteria_eval_models.py` — structured output para avaliação.
- **Conexões diretas:**
  - Backoffice UI → API → `core.centurion_configs` → runtime.
- **Conexões indiretas:**
  - Follow-up rules podem depender do status/score (ex.: “se score > 0.7, agendar follow-up X”).
- **Relações com o código:**
  - A “engine” de qualificação vira o núcleo do Centurion e passa a dirigir handoff/followups/seleção de mídia.
- **Áreas de impacto:** DB, UI, runtime, métricas.

---

## EPIC F5-E2: “Explainability” e auditoria de qualificação (evidências por critério)

### 1) Definição & Justificativa

- **O que:** Persistir, por avaliação:
  - score final,
  - score por critério,
  - evidências (trechos/IDs de mensagens),
  - decisão (qualified / not qualified / needs follow-up),
  - versão do centurion config.
- **Por que:** Sem isso, não dá para melhorar o sistema nem auditar por que o lead foi marcado.
- **Referências arquiteturais:**
  - `core.leads` tem `qualification_score`/`qualification_data`: `docs/architecture/data-dictionary.md:74`
  - Agent Runtime avalia qualificação: `docs/architecture/arch-micro-agent-runtime.md:84`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `supabase/migrations/00005_core_leads.sql` (expandir `qualification_data`)
  - `agent-runtime/src/modules/centurion/services/qualification_service.py`
  - `backoffice-api/src/modules/leads/*` (endpoints para visualizar “por que”)
  - `backoffice-web/src/modules/leads/*` (UI de análise)
- **Novos arquivos a serem criados:**
  - `supabase/migrations/0008x_lead_qualification_events.sql` — tabela “append-only” para avaliações históricas.
  - `backoffice-web/src/modules/leads/components/qualification-explainability.tsx`
- **Conexões diretas:**
  - Runtime → DB (persistência de avaliações).
- **Conexões indiretas:**
  - Métricas comparativas por centurion e por empresa.
- **Relações com o código:**
  - Cria um “feedback loop” para ajustar configs e comparar performance de Centurions, sem depender de logs soltos.
- **Áreas de impacto:** DB, UI, analytics, auditoria.

---

## EPIC F5-E3: Media Tools (biblioteca por Centurion e/ou global) + seleção contextual + sequências

### 1) Definição & Justificativa

- **O que:** Implementar “Media Tools”:
  - upload e catalogação de mídias (áudio, imagem, vídeo, doc),
  - associação por `company_id` e opcionalmente `centurion_id`,
  - tags e “gatilhos” (condições),
  - sequências (playbooks) com ordem/tempos/condições,
  - decisão pela LLM (structured) de qual mídia enviar e quando.
- **Por que:** É requisito para “SDR estratégico” (prova social, cases, objeções). E o Evolution Manager explicitamente tem capability de envio de mídia: `docs/architecture/arch-micro-evolution-manager.md:63`.
- **Referências arquiteturais:**
  - Mensagens “picadas” e humanização: `docs/architecture/arch-micro-agent-runtime.md:41`
  - Evento `message.sent` permite múltiplas mensagens: `docs/architecture/event-catalog.md:91`
  - Evolution Manager suporta `SendMedia`: `docs/architecture/arch-micro-evolution-manager.md:63`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/tools/*` (ou novo módulo específico de media)
  - `backoffice-api/src/modules/centurions/*` (vincular playbooks ao centurion)
  - `agent-runtime/src/modules/centurion/services/response_builder.py`
  - `agent-runtime/src/modules/channels/services/media_downloader.py` (se reuso)
  - `evolution-manager/src/modules/messages/*` (envio de mídia por evento `message.sent`)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/media/media.module.ts`
  - `backoffice-api/src/modules/media/controllers/media-assets.controller.ts`
  - `backoffice-api/src/modules/media/services/media-assets.service.ts`
  - `backoffice-web/src/modules/media/*` (UI de upload, tags, playbooks)
  - `supabase/migrations/0008x_media_assets.sql` — tabelas `core.media_assets`, `core.media_playbooks`, `core.media_playbook_steps`.
  - `agent-runtime/src/modules/centurion/media/media_tool.py` — tool do Agno para consultar/selecionar mídia.
  - `agent-runtime/src/modules/centurion/agno_models/media_plan_models.py` — structured output para “plano de mídia”.
- **Conexões diretas:**
  - Backoffice Web → Backoffice API (upload/CRUD) → Storage/DB.
  - Runtime → tool MediaTools → DB/Storage → publicação `message.sent`.
- **Conexões indiretas:**
  - RAG pode indexar transcrições/descrições de mídia como contexto.
- **Relações com o código:**
  - Conecta “conteúdo” (assets/playbooks) ao pipeline de mensagens; vira alavanca direta de conversão e personalização.
- **Áreas de impacto:** DB, storage, UI, runtime, evolution-manager.

---

<a id="fase-6"></a>
# Fase 6 — Multi-canal (Instagram/Telegram) e Orquestração de Conteúdo

> Objetivo: sair de “WhatsApp-first” para “multi-canal real” com o mesmo pipeline (event envelope + adapters + media + qualificação).

## EPIC F6-E1: Normalização de canais via adapters (WhatsApp/IG/TG) e roteamento único

### 1) Definição & Justificativa

- **O que:** Consolidar adapters e roteamento para inbound/outbound:
  - normalizar payloads para `message.received`,
  - suportar mídia e metadados por canal,
  - roteamento único no runtime.
- **Por que:** A arquitetura do Agent Runtime assume multi-canal: `docs/architecture/arch-micro-agent-runtime.md:20`. Sem normalização, cada canal vira um “fork” difícil de manter.
- **Referências arquiteturais:**
  - Agent Runtime recebe mensagens multi-canal: `docs/architecture/arch-micro-agent-runtime.md:20`
  - Canais e eventos `message.received`: `docs/architecture/event-catalog.md:61`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/channels/adapters/base_adapter.py`
  - `agent-runtime/src/modules/channels/adapters/instagram_adapter.py`
  - `agent-runtime/src/modules/channels/adapters/telegram_adapter.py`
  - `agent-runtime/src/modules/channels/services/channel_router.py`
  - `evolution-manager/src/modules/webhooks/*` (mantém WA como producer)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/channels/contracts/events.py` — tipos canônicos de inbound/outbound.
  - `docs/architecture/arch-micro-agent-runtime-channel-contracts.md` — contrato multi-canal formalizado (com exemplos).
- **Conexões diretas:**
  - Adapters → router → CenturionService.
- **Conexões indiretas:**
  - Media Tools deve respeitar capacidades do canal (ex.: vídeo/áudio).
- **Relações com o código:**
  - Evita forks por canal ao impor contrato canônico e roteamento único, reduzindo custo de manutenção.
- **Áreas de impacto:** runtime, eventos, compatibilidade entre canais.

---

<a id="fase-7"></a>
# Fase 7 — Segurança, Compliance e Runbooks (Operação Sustentável)

> Objetivo: fechar fronteiras (webhooks, tool calls, microserviços internos), padronizar observabilidade e ter runbooks executáveis.

## EPIC F7-E1: Segurança de tool calls (SSRF, allowlist, quotas, payload limits) e sandbox

### 1) Definição & Justificativa

- **O que:** Implementar política de segurança para tools:
  - allowlist de hosts e protocolos,
  - bloqueio de ranges internos (SSRF),
  - timeouts e quotas por company/centurion,
  - limites de payload e tamanho de mídia.
- **Por que:** Tooling é uma superfície crítica e tende a ser o primeiro vetor de incidente. Agno tool hooks são o mecanismo ideal para enforcement: `docs/agno-documentation/agno-docs-main/tools/hooks.mdx:6`.
- **Referências arquiteturais:**
  - Tool hooks (Agno): `docs/agno-documentation/agno-docs-main/tools/hooks.mdx:6`
  - Runtime executa tools/MCP: `docs/architecture/arch-micro-agent-runtime.md:89`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/tools/services/tool_executor.py`
  - `agent-runtime/src/modules/channels/services/media_downloader.py`
  - `agent-runtime/src/modules/channels/services/stt_service.py`
  - `agent-runtime/src/modules/channels/services/vision_service.py`
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/common/security/egress_policy.py`
  - `agent-runtime/src/common/security/payload_limits.py`
- **Conexões diretas:**
  - ToolExecutor → HTTP clients.
- **Conexões indiretas:**
  - Media Tools e MCP dependem dessas políticas para operação segura.
- **Relações com o código:**
  - Estabelece “guardrails” para qualquer expansão de tools/media sem abrir vetores de SSRF/leak/custo ilimitado.
- **Áreas de impacto:** segurança, runtime, custo, confiabilidade.

---

## EPIC F7-E2: Runbooks operacionais (incidentes e health) + dashboards mínimos

### 1) Definição & Justificativa

- **O que:** Criar runbooks para incidentes previsíveis:
  - schema não exposto (fila e drain),
  - drift de migrations,
  - credenciais inválidas por empresa,
  - runtime travado em debounce/processing,
  - falhas de webhook e reprocessamento.
- **Por que:** Sem runbook, a operação vira “tentativa e erro”. O sistema é distribuído (Redis + múltiplos serviços): `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md:145`.
- **Referências arquiteturais:**
  - Event-driven e serviços distribuídos: `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md:145`
  - Eventos de debounce para observabilidade: `docs/architecture/event-catalog.md:166`

### 2) Impacto Técnico

- **Arquivos a serem modificados:**
  - `docs/architecture/event-catalog.md` (se necessário expandir para observabilidade)
- **Novos arquivos a serem criados:**
  - `docs/runbooks/runbook-schema-exposure.md`
  - `docs/runbooks/runbook-agent-runtime-stuck-processing.md`
  - `docs/runbooks/runbook-integrations-validation.md`
  - `docs/runbooks/runbook-webhooks.md`
- **Conexões diretas:**
  - Operação (on-call) ↔ logs/metrics ↔ ações corretivas.
- **Conexões indiretas:**
  - Deploy/CI usam drift control; observabilidade usa correlation.
- **Relações com o código:**
  - Formaliza como operar fluxos cross-service, reduzindo MTTR e evitando “soluções manuais” não reproduzíveis.
- **Áreas de impacto:** operação, confiabilidade, tempo de resolução de incidentes.
