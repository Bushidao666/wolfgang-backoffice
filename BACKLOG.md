# Backlog de Desenvolvimento (EPICs) — Backoffice Multi-Tenant da Holding

> Este documento é um backlog técnico **extenso e rastreável**, organizado em **fases progressivas** e estruturado em tarefas do tipo **EPIC**.  
> Ele foi derivado diretamente dos documentos em `docs/architecture/` e `docs/business-context/` e serve como “mapa técnico” para implementação end‑to‑end.

## Como ler este backlog

- **Formato por EPIC:** cada EPIC contém (1) **Definição & Justificativa** e (2) **Impacto Técnico**, incluindo arquivos, conexões e áreas afetadas.
- **Referências por linha:** as referências apontam para os documentos e **linhas específicas** que fundamentam a decisão.
- **Paths com globs:** padrões como `/**` representam múltiplos arquivos dentro do diretório.  
- **Estado do repositório:** este repo já contém os serviços e infraestrutura do monorepo. Para status auditado por EPIC/TASK, ver `INDICE_BACKLOG.md` e `BACKLOG_DETALHADO.md`.

## Organização por fases (alinhada ao Escopo V1)

O cronograma e as fases do V1 estão descritos em `docs/business-context/05-escopo-v1.md#L315` e `docs/business-context/05-escopo-v1.md#L359`. Este backlog segue a mesma sequência e adiciona uma **Fase 0** (setup) para viabilizar o desenvolvimento local.

- **Fase 0:** Setup base (repo, ambiente, contratos/eventos, padrões cross‑cutting)
- **Fase 1:** Fundação (schema CORE, governança, provisionamento, segurança/RLS)
- **Fase 2:** Multi‑Canal (WhatsApp/Evolution + Instagram + Telegram)
- **Fase 3:** Centurions avançados (STT, vision, debounce, chunking, mídia)
- **Fase 4:** Memória (curto prazo, RAG/pgvector, grafo)
- **Fase 5:** Tools & Extensibilidade (tools, MCP, base de conhecimento)
- **Fase 6:** Qualificação (follow‑ups, captação via formulário)
- **Fase 7:** Handoff & CRM + Contratos (deals, Autentique)
- **Fase 8:** Dashboard & Marketing (métricas, pixels, Facebook CAPI)
- **Fase 9:** Refinamento (testes, observabilidade, deploy/validação)
- **Roadmap:** Pós‑V1 (V1.1 / V2 / V3+)

---

## Fase 0 — Setup base (pré‑Fase 1 do V1)

### EPIC-001 — Bootstrap do repositório, serviços e ambiente local

#### 1. Definição & Justificativa
- **O que:** Criar a base do repositório para suportar múltiplos serviços (`backoffice-web`, `backoffice-api`, `agent-runtime`, `evolution-manager`, `autentique-service`, `facebook-capi`) e um ambiente local com `docker-compose.yml` e `.env.example`.
- **Por que:** A arquitetura define uma solução distribuída por serviços com Redis e Supabase/PostgreSQL; sem padronização de estrutura, variáveis de ambiente e ambiente local, o desenvolvimento da V1 fica bloqueado.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L149` (stack: Next.js/Nest.js/Python + Supabase + Redis)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L319` (Catálogo de serviços e estruturas internas)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1751` (variáveis de ambiente por serviço)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1807` (Docker Compose para desenvolvimento)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1594` (naming conventions para serviços/diretórios)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (opcional: ajustar paths caso a estrutura real diverja)
- **Novos arquivos a serem criados:**
  - `docker-compose.yml` — Orquestração local (serviços + Redis)
  - `.env.example` — Template de variáveis (`SUPABASE_*`, `REDIS_URL`, chaves de APIs externas)
  - `backoffice-web/**` — Serviço frontend (Next.js) conforme estrutura definida
  - `backoffice-api/**` — Serviço backend principal (Nest.js) conforme estrutura definida
  - `agent-runtime/**` — Serviço IA (Python/Agno) conforme estrutura definida
  - `evolution-manager/**` — Serviço WhatsApp (Nest.js) conforme estrutura definida
  - `autentique-service/**` — Serviço de contratos (Nest.js) conforme estrutura definida
  - `facebook-capi/**` — Serviço CAPI (Nest.js) conforme estrutura definida
- **Conexões diretas:**
  - `docker-compose.yml` ↔ todos os serviços (ports, env, depends_on)
  - Serviços ↔ Redis (`REDIS_URL`)
  - Serviços ↔ Supabase/PostgreSQL (`SUPABASE_URL`, `DATABASE_URL`)
- **Conexões indiretas:**
  - Convenções e env vars impactam CI/CD, deploy e observabilidade (tudo depende de configuração consistente).
- **Relações com o código:**
  - Define a base para todos os EPICs seguintes; paths citados no backlog assumem esta estrutura.
- **Áreas de impacto:**
  - Infra local (Docker), configuração (env), organização do código (monorepo multi-serviço).

---

### EPIC-002 — Contratos de integração: catálogo de eventos, payloads e padrões cross-cutting

#### 1. Definição & Justificativa
- **O que:** Formalizar contratos entre serviços (eventos Redis, payloads, nomes de canais) e estabelecer padrões mínimos replicáveis por serviço (logging estruturado, error handling, estratégia de testes).
- **Por que:** A arquitetura privilegia comunicação event-driven via Redis; sem contratos explícitos, integrações quebram, geram drift entre serviços e dificultam depuração e testes.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1312` (event-driven via Redis Pub/Sub como padrão preferido)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1346` (tabela de canais/payloads: `message.received`, `message.sent`, `lead.created`, etc.)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1634` (pirâmide/estratégia de testes)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1659` (logging estruturado com contexto)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1672` (hierarquia de erros e handler global)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (se a versão implementada ajustar payloads/canais)
  - `docs/architecture/arch-micro-*.md` (se ajustes de contratos forem necessários)
- **Novos arquivos a serem criados:**
  - `docs/architecture/event-catalog.md` — Catálogo executável de eventos (nome, schema JSON, exemplos, DLQ, idempotência)
  - `packages/contracts/**` — Tipos/DTOs compartilhados (ex.: `InboundMessage`, `LeadQualifiedEvent`) para reduzir drift
  - `packages/contracts/src/events/**` — Schemas (JSON Schema/Zod) para validação de payloads
  - `packages/contracts/src/channels.ts` — Constantes de canais Redis (`message.received`, etc.)
  - `packages/contracts/src/errors/**` — Erros compartilhados (opcional) para padronização
- **Conexões diretas:**
  - Todos os serviços ↔ `packages/contracts` (tipos/schemas)
  - Producers/consumers ↔ Redis (publicar/assinar usando as mesmas chaves/canais)
- **Conexões indiretas:**
  - WebSocket/real‑time (Backoffice Web) depende de eventos padronizados para refletir estados em tempo real.
  - Observabilidade depende de contexto consistente nos logs (company_id, lead_id, centurion_id).
- **Relações com o código:**
  - Requisito base para EPICs de mensageria, handoff, marketing e contratos; reduz retrabalho e divergência.
- **Áreas de impacto:**
  - Mensageria (Redis Pub/Sub), validação (DTO/schema), qualidade (testes), observabilidade (logs/erros).

---

## Fase 1 — Fundação (CORE, governança, provisionamento, segurança)

### EPIC-003 — Modelo de dados CORE + migrations + pgvector (fundação do banco)

#### 1. Definição & Justificativa
- **O que:** Implementar o schema `core` no PostgreSQL (Supabase) com as tabelas essenciais da V1 (empresas, leads, conversas/mensagens, configs de Centurion, instâncias/canais, templates/contratos, pixels, etc.) e habilitar `pgvector` para RAG.
- **Por que:** O domínio exige “leads sempre nascem no CORE” e isolamento multi-tenant com banco único + schemas; sem o CORE não há qualificação, métricas nem handoff.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L71` (leads sempre em `core.leads`)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1114` (visão geral de schemas e tabelas do CORE)
  - `docs/business-context/03-modelo-de-entidades.md#L34` (`core.companies`)
  - `docs/business-context/03-modelo-de-entidades.md#L69` (`core.leads`)
  - `docs/business-context/05-escopo-v1.md#L278` (DoD técnico: `pgvector` configurado)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `docs/business-context/03-modelo-de-entidades.md` (se divergências forem descobertas durante implementação)
- **Novos arquivos a serem criados:**
  - `supabase/migrations/**` — SQL versionado do schema `core` (tabelas, índices, extensões)
  - `supabase/seed.sql` — Seed mínimo (opcional) para desenvolvimento/QA
  - `supabase/README.md` — Como rodar migrations e validar RLS localmente
- **Conexões diretas:**
  - `backoffice-api` ↔ Postgres/Supabase (CRUD administrativo do CORE)
  - `agent-runtime` ↔ Postgres/Supabase (persistência e memória)
- **Conexões indiretas:**
  - Todas as features de UI e integrações dependem do CORE (cascata em: métricas, handoff, contratos, marketing).
- **Relações com o código:**
  - Base para módulos `companies`, `leads`, `centurions`, `instances`, `contracts`, `marketing`, `metrics`.
- **Áreas de impacto:**
  - Banco de dados (schemas/tabelas/índices/extensões), persistência, performance de queries.

---

### EPIC-004 — Segurança multi-tenant: JWT claims, roles e RLS (inclui storage)

#### 1. Definição & Justificativa
- **O que:** Implementar autenticação/autorização com JWT (claims padronizadas), hierarquia de roles e políticas de Row Level Security (RLS) por schema/tabela, incluindo segurança de Storage (uploads).
- **Por que:** O sistema é multi-tenant com isolamento obrigatório; falhas em RLS/JWT são risco crítico (empresa A enxergar dados de empresa B).
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L82` (isolamento multi-tenant via RLS)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1531` (modelo de claims JWT)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1555` (exemplo de policy RLS)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1575` (Storage security por `company_id`)
  - `docs/business-context/02-mapa-de-atores.md#L357` (hierarquia de roles e matriz de permissões)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `supabase/migrations/**` (adicionar/ajustar policies e grants)
  - `backoffice-api/src/common/guards/jwt-auth.guard.ts`
  - `backoffice-api/src/common/guards/roles.guard.ts`
  - `backoffice-web/src/middleware.ts` (auth guard e RBAC no frontend)
  - `agent-runtime/src/common/middleware/auth.py` (validação de JWT para endpoints HTTP, quando aplicável)
- **Novos arquivos a serem criados:**
  - `supabase/migrations/**_rls.sql` — Policies por tabela (`company_id` scope + exceções `super_admin/backoffice_admin`)
  - `supabase/migrations/**_storage_policies.sql` — Policies para buckets (ex.: base de conhecimento, arquivos de deals)
  - `backoffice-api/src/common/decorators/current-user.decorator.ts` — Resolver claims do JWT
  - `backoffice-api/src/common/decorators/roles.decorator.ts` — Declaração de roles por rota
- **Conexões diretas:**
  - Backoffice Web ↔ Backoffice API (auth + RBAC)
  - Backoffice API ↔ Supabase Auth/Postgres (claims/JWT + RLS)
- **Conexões indiretas:**
  - Todo acesso a dados do CORE passa a ser filtrado por `company_id` (impacto transversal em repositórios e queries).
  - Integrações (webhooks) exigem validação de assinatura/segredo (segurança service‑to‑service).
- **Relações com o código:**
  - Pré-requisito para qualquer CRUD e qualquer consulta do CORE; “segurança primeiro” para evitar rework.
- **Áreas de impacto:**
  - Banco (RLS), APIs (guards), UI (gates de rota), storage (uploads), auditoria/acesso.

---

### EPIC-005 — Backoffice API: bootstrap (Nest.js) + infraestrutura Supabase/Redis + OpenAPI

#### 1. Definição & Justificativa
- **O que:** Criar o serviço `backoffice-api` (Nest.js) com estrutura base, módulos de infraestrutura (Supabase/Redis), EventBus e documentação OpenAPI/Swagger.
- **Por que:** O backoffice web deve consumir uma API única; a arquitetura define a Backoffice API como gateway de orquestração e CRUD do CORE.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L428` (SVC‑002: Backoffice API SRP)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L439` (estrutura interna `backoffice-api/`)
  - `docs/architecture/arch-micro-backoffice-api.md#L15` (propósito e responsabilidade)
  - `docs/architecture/arch-micro-backoffice-api.md#L67` (capacidades principais do módulo)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1753` (env vars do Backoffice API)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `docker-compose.yml` (incluir/ajustar `backoffice-api` e dependências)
  - `.env.example` (incluir variáveis do serviço)
- **Novos arquivos a serem criados:**
  - `backoffice-api/package.json` — Dependências e scripts
  - `backoffice-api/src/main.ts` — Bootstrap HTTP
  - `backoffice-api/src/app.module.ts` — Root module
  - `backoffice-api/src/config/**` — `database.config.ts`, `redis.config.ts`, `supabase.config.ts`
  - `backoffice-api/src/infrastructure/supabase/**` — `supabase.module.ts`, `supabase.service.ts`
  - `backoffice-api/src/infrastructure/redis/**` — `redis.module.ts`, `redis.service.ts`
  - `backoffice-api/src/infrastructure/messaging/event-bus.service.ts` — Pub/Sub + padrões de eventos
  - `backoffice-api/src/common/**` — filtros/guards/pipes/interceptors base
  - `backoffice-api/src/modules/**` — módulos vazios (stubs) para fases seguintes
- **Conexões diretas:**
  - `backoffice-api` ↔ Postgres/Supabase (CRUD do CORE)
  - `backoffice-api` ↔ Redis (cache + pub/sub + subscriptions)
  - `backoffice-api` ↔ serviços especializados (REST: `evolution-manager`, `agent-runtime`, `autentique-service`, `facebook-capi`)
- **Conexões indiretas:**
  - `backoffice-web` depende integralmente da API; mudanças de contrato impactam UI e BFF.
- **Relações com o código:**
  - Base para módulos de domínio: `auth`, `companies`, `centurions`, `instances`, `leads`, `contracts`, `marketing`, `metrics`.
- **Áreas de impacto:**
  - APIs (REST/GraphQL), integrações, cache, documentação, observabilidade (logs/erros).

---

### EPIC-006 — Governança: empresas, usuários e provisionamento automático de schemas

#### 1. Definição & Justificativa
- **O que:** Implementar governança do multi-tenant: CRUD de empresas, gestão de usuários por empresa, mapeamento `empresa → schema` e provisionamento automático de schema (clonando `_template_base`).
- **Por que:** É requisito P0 do V1; sem “criar empresa em um clique”, não existe escalabilidade operacional nem isolamento consistente.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L32` (Governança & Empresas: CRUD + provisionamento + usuários + mapping)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1131` (schema `_template_base` e schemas por empresa)
  - `docs/architecture/arch-micro-backoffice-api.md#L216` (endpoints de `companies` e gestão de usuários)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L84` (isolamento via `company_id` + RLS)
  - `docs/business-context/03-modelo-de-entidades.md#L34` (definição de `core.companies` e invariantes)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/app.module.ts` (registrar módulos `companies`/`users`/`auth`)
  - `backoffice-api/src/infrastructure/supabase/supabase.service.ts` (helpers para migrations/provisionamento)
  - `supabase/migrations/**` (criar funções, triggers e tabelas de mapping)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/companies/**` — controllers/services/repository/domain/dto/interfaces
  - `backoffice-api/src/modules/users/**` — gestão de usuários, convites, vínculo empresa↔usuário
  - `backoffice-api/src/modules/auth/**` — login/refresh/logout/me conforme endpoints
  - `supabase/migrations/**_template_schema.sql` — criação de `_template_base` e tabelas base (`deals`, `services`, `equipe`, etc.)
  - `supabase/migrations/**_schema_provisioning.sql` — função: `provision_company_schema(company_slug)` + grants/RLS
- **Conexões diretas:**
  - `backoffice-api` ↔ Supabase Auth (criar/vincular usuários; obter `auth.users`)
  - `backoffice-api` ↔ Postgres (criar schema por empresa; inserir mapping em `core.company_crms`)
- **Conexões indiretas:**
  - Handoff e Front Operacional dependem do schema provisionado (efeito em cascata nos EPICs de deals).
- **Relações com o código:**
  - `companies` é a “raiz” do multi-tenant; define `schema_name` usado por handoff, deals e relatórios.
- **Áreas de impacto:**
  - Banco (schemas dinâmicos), APIs (CRUD + provisioning), segurança (grants/RLS), auditoria.

---

### EPIC-007 — Backoffice Web: bootstrap (Next.js) + auth + UI de governança (empresas/usuários)

#### 1. Definição & Justificativa
- **O que:** Criar o frontend `backoffice-web` (Next.js 14) com rotas de autenticação, layout de dashboard e as telas essenciais de governança (empresas e usuários).
- **Por que:** O dono da holding opera via UI; a V1 exige criar empresas, configurar Centurions e monitorar o sistema sem depender de ferramentas técnicas.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L319` (SVC‑001: Backoffice Web SRP)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L330` (estrutura interna `backoffice-web/`)
  - `docs/architecture/arch-micro-backoffice-web.md#L15` (propósito do módulo)
  - `docs/architecture/arch-micro-backoffice-web.md#L408` (middleware auth guard)
  - `docs/business-context/05-escopo-v1.md#L41` (entregável: criar empresa com schema provisionado)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `docker-compose.yml` (incluir/ajustar `backoffice-web`)
  - `.env.example` (incluir `NEXT_PUBLIC_API_URL` e keys do Supabase se usadas no frontend)
- **Novos arquivos a serem criados:**
  - `backoffice-web/package.json` — Dependências e scripts
  - `backoffice-web/src/app/(auth)/**` — `login/`, `forgot-password/`
  - `backoffice-web/src/app/(dashboard)/**` — `empresas/`, `layout.tsx`, `page.tsx`
  - `backoffice-web/src/modules/empresas/**` — componentes/hooks/services/types
  - `backoffice-web/src/lib/auth/**` — helpers de sessão/JWT
  - `backoffice-web/src/lib/api/**` — API client (fetch/axios) + interceptors
  - `backoffice-web/src/components/ui/**` — design system (ShadcnUI)
  - `backoffice-web/src/middleware.ts` — guard de rotas e RBAC
- **Conexões diretas:**
  - `backoffice-web` ↔ `backoffice-api` (REST/GraphQL para operar governança)
  - `backoffice-web` ↔ Supabase (opcional: login/session no client, dependendo da estratégia)
- **Conexões indiretas:**
  - Módulos futuros (centurions/instancias/leads/metricas) dependem do shell, auth e API client.
- **Relações com o código:**
  - Define padrões de UI (layout, loading/error states) reaproveitados nas demais features.
- **Áreas de impacto:**
  - UI/UX, autenticação, integração com API, estrutura de frontend.

---

## Fase 2 — Multi‑Canal (WhatsApp/Evolution + Instagram + Telegram)

### EPIC-008 — Evolution Manager (WhatsApp): instâncias, webhooks e mensageria via Redis

#### 1. Definição & Justificativa
- **O que:** Implementar o serviço `evolution-manager` para gerenciar instâncias WhatsApp, processar webhooks da Evolution API e publicar eventos (`message.received`, status) no Redis; também consumir `message.sent` para envio outbound.
- **Por que:** WhatsApp é canal principal P0 e a arquitetura isola a complexidade da Evolution API em um serviço especializado.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L783` (SVC‑004: Evolution Manager SRP)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L896` (webhooks processados e ações)
  - `docs/architecture/arch-micro-evolution-manager.md#L15` (propósito/responsabilidade)
  - `docs/architecture/arch-micro-evolution-manager.md#L953` (tipos de webhook suportados)
  - `docs/business-context/05-escopo-v1.md#L49` (integração WhatsApp P0)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `docker-compose.yml` (incluir/ajustar `evolution-manager`, variáveis `EVOLUTION_API_*`, `WEBHOOK_SECRET`)
  - `.env.example` (incluir variáveis do serviço)
- **Novos arquivos a serem criados:**
  - `evolution-manager/package.json` — Dependências e scripts
  - `evolution-manager/src/main.ts` / `evolution-manager/src/app.module.ts` — bootstrap Nest.js
  - `evolution-manager/src/modules/instances/**` — controllers/services/repository/domain/dto/events
  - `evolution-manager/src/modules/messages/**` — envio de mensagens e DTOs
  - `evolution-manager/src/infrastructure/evolution/**` — `evolution.client.ts` + mapeamento endpoints
  - `evolution-manager/src/infrastructure/redis/**` — publisher/subscriber para Pub/Sub
  - `evolution-manager/src/infrastructure/supabase/**` — persistência de instâncias e status
- **Conexões diretas:**
  - `evolution-manager` ↔ Evolution API (REST + webhooks)
  - `evolution-manager` ↔ Redis (publish `message.received`, subscribe `message.sent`)
  - `evolution-manager` ↔ Postgres/Supabase (estado de instância, QR code, histórico mínimo)
- **Conexões indiretas:**
  - `agent-runtime` depende dos eventos para iniciar processamento; falhas aqui travam a qualificação.
  - `backoffice-api/web` dependem dos estados para UI operacional (QR/status).
- **Relações com o código:**
  - Produz a “entrada” do pipeline SDR (inbound WhatsApp) e recebe a “saída” (outbound picado).
- **Áreas de impacto:**
  - Integração externa (WhatsApp/Evolution), mensageria, confiabilidade (retry/rate limit), persistência de estado.

---

### EPIC-009 — Instâncias (API + Web): conectar/desconectar, QR code e updates em tempo real

#### 1. Definição & Justificativa
- **O que:** Implementar o módulo `instances` na Backoffice API (commands para Evolution Manager) e a UI de instâncias no Backoffice Web (QR code, status, reconexão), incluindo updates via WebSocket/subscribe de eventos.
- **Por que:** V1 exige operação de instâncias por canal e reconexão via QR; o fluxo precisa ser simples para o dono (sem acessar Evolution diretamente).
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L609` (endpoints: `/instances/:id/connect`, `/disconnect`)
  - `docs/architecture/arch-micro-backoffice-api.md#L241` (endpoints do Instances Module)
  - `docs/architecture/arch-micro-backoffice-api.md#L521` (fluxo `InstancesService` ↔ Evolution Manager)
  - `docs/architecture/arch-micro-backoffice-web.md#L1094` (fluxo UI de conexão de instância via QR + WS)
  - `docs/business-context/05-escopo-v1.md#L52` (status de instâncias e reconexão QR como P0)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/app.module.ts` (registrar `instances` e client do Evolution)
  - `backoffice-web/src/app/(dashboard)/**` (adicionar rotas e navegação de instâncias)
  - `backoffice-web/src/lib/api/**` (adicionar endpoints `/instances`)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/instances/**` — controllers/services/dto + integração REST com `evolution-manager`
  - `backoffice-api/src/infrastructure/clients/evolution-manager.client.ts` — client HTTP (connect/disconnect/status/send)
  - `backoffice-api/src/infrastructure/messaging/subscribers/**` — subscriber de eventos `instance.connected`, `qrcode.ready`
  - `backoffice-web/src/modules/instancias/**` — UI (cards, modal QR, hooks TanStack Query)
  - `backoffice-web/src/lib/ws/**` — WS client e handlers de eventos (invalidate queries, toasts)
- **Conexões diretas:**
  - `backoffice-api` ↔ `evolution-manager` (REST commands)
  - `backoffice-api` ↔ Redis (subscribe eventos de status)
  - `backoffice-web` ↔ `backoffice-api` (REST)
  - `backoffice-web` ↔ WebSocket gateway (eventos em tempo real)
- **Conexões indiretas:**
  - `agent-runtime` usa `instance_id`/`channel_instance_id` para rotear mensagens corretamente.
- **Relações com o código:**
  - O módulo `instances` conecta governança (empresa) com operação (canal ativo) e com a IA (roteamento).
- **Áreas de impacto:**
  - UI (QR/status), APIs (instances), mensageria (eventos de status), operação (reconexão).

---

### EPIC-010 — Instagram e Telegram: ingestão multi‑canal e unificação em `core.channel_instances`

#### 1. Definição & Justificativa
- **O que:** Implementar ingestão de mensagens via Instagram DM e Telegram Bot, normalizando payloads para o mesmo contrato de evento (`message.received`) e persistindo/gerenciando instâncias em `core.channel_instances`.
- **Por que:** V1 exige multi‑canal (WhatsApp, Instagram, Telegram) com processamento uniforme pela IA e visibilidade no dashboard.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L50` (integração Instagram P0)
  - `docs/business-context/05-escopo-v1.md#L51` (integração Telegram P0)
  - `docs/business-context/03-modelo-de-entidades.md#L198` (`core.channel_instances`: rastrear instâncias multi‑canal)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L175` (canais externos: Instagram/Telegram no contexto)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L683` (adapters `whatsapp/instagram/telegram` no Agent Runtime)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `supabase/migrations/**` (garantir `core.channel_instances` e índices por `company_id`/`channel_type`)
  - `packages/contracts/src/channels.ts` (adicionar/confirmar suporte multi‑canal)
  - `agent-runtime/src/common/infrastructure/messaging/pubsub.py` (routing por canal)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/channels/adapters/instagram_adapter.py` — normalização e envio outbound (se aplicável)
  - `agent-runtime/src/modules/channels/adapters/telegram_adapter.py` — normalização e envio outbound (se aplicável)
  - `agent-runtime/src/api/routes/webhooks.py` — endpoints HTTP de webhook (Instagram/Telegram) quando necessário
  - `backoffice-api/src/modules/instances/channels/**` — CRUD/config para instâncias IG/TG (tokens/credentials)
  - `backoffice-web/src/modules/instancias/channels/**` — UI para conectar/configurar IG/TG
- **Conexões diretas:**
  - Instagram Graph API ↔ nossos webhooks (recebimento) e endpoints de envio (quando usado)
  - Telegram Bot API ↔ nossos webhooks/long polling (estratégia definida) e envio de mensagens
  - `agent-runtime` ↔ Redis (publicar/consumir eventos normalizados)
- **Conexões indiretas:**
  - Métricas e dashboard consolidado dependem de normalização de eventos por canal (`channel_type`).
- **Relações com o código:**
  - Reusa o pipeline `message.received → debounce → LLM → message.sent`, mudando apenas o adapter.
- **Áreas de impacto:**
  - Integrações externas (IG/TG), ingestão multi‑canal, persistência de instâncias, UX de configuração.

---

## Fase 3 — Centurions avançados (STT, vision, debounce, chunking, mídia)

### EPIC-011 — Agent Runtime: bootstrap + pipeline end‑to‑end (texto) via Redis

#### 1. Definição & Justificativa
- **O que:** Criar o serviço `agent-runtime` (Python + Agno) com subscriber Redis para `message.received`, processamento de mensagens de texto, persistência básica e publicação de `message.sent` e `lead.created`.
- **Por que:** O Agent Runtime é o “cérebro” do SDR 100% IA; sem pipeline base não existe qualificação nem resposta automática.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L619` (SVC‑003: executar Centurions e orquestrar IA)
  - `docs/architecture/arch-micro-agent-runtime.md#L33` (princípio SDR 100% IA e responsabilidades)
  - `docs/architecture/arch-micro-agent-runtime.md#L274` (Redis Subscriber Pattern)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1348` (canal `message.received` e payload)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1349` (canal `message.sent` e payload)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `docker-compose.yml` (incluir/ajustar `agent-runtime` e variáveis de LLM)
  - `.env.example` (incluir `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`, etc.)
  - `supabase/migrations/**` (garantir tabelas mínimas para persistência: `leads`, `conversations`, `messages`)
- **Novos arquivos a serem criados:**
  - `agent-runtime/pyproject.toml` ou `agent-runtime/requirements.txt` — dependências
  - `agent-runtime/src/common/config/settings.py` — configuração (env)
  - `agent-runtime/src/common/infrastructure/cache/redis_client.py` — client Redis
  - `agent-runtime/src/common/infrastructure/database/supabase_client.py` — client Supabase/Postgres
  - `agent-runtime/src/common/infrastructure/messaging/pubsub.py` — subscribe/publish
  - `agent-runtime/src/modules/centurion/handlers/message_handler.py` — consumer principal de `message.received`
  - `agent-runtime/src/modules/centurion/services/centurion_service.py` — orquestração (texto)
  - `agent-runtime/src/modules/handoff/events/lead_created_event.py` — evento `lead.created`
- **Conexões diretas:**
  - `agent-runtime` ↔ Redis (subscribe `message.received`, publish `message.sent`, `lead.created`)
  - `agent-runtime` ↔ Postgres/Supabase (persistência de lead/conversa/mensagem)
- **Conexões indiretas:**
  - `evolution-manager` consome `message.sent` para enviar outbound; falha aqui afeta o canal.
  - `facebook-capi` (futuro) consome `lead.created` e `lead.qualified`.
- **Relações com o código:**
  - É o núcleo de execução de Centurions; será estendido por debounce/chunking/multimodal/memórias/tools.
- **Áreas de impacto:**
  - IA (LLM), mensageria Redis, persistência, performance/latência do ciclo conversacional.

---

### EPIC-012 — Centurions: CRUD/config avançada (API + Web) + sincronização com runtime

#### 1. Definição & Justificativa
- **O que:** Implementar CRUD de Centurions no Backoffice API e Backoffice Web (prompt, personalidade, regras de qualificação, capacidades, ferramentas), e garantir que alterações disparem eventos para o Agent Runtime recarregar configurações.
- **Por que:** V1 exige que o dono configure a IA por empresa; o runtime deve refletir mudanças sem deploy/manual drift.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L64` (CRUD de Centurions como core P0)
  - `docs/business-context/03-modelo-de-entidades.md#L132` (tabela `core.centurion_configs` e capacidades)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1241` (campos de configuração e ferramentas em `core.centurion_configs`)
  - `docs/architecture/arch-micro-backoffice-api.md#L229` (endpoints do módulo `centurions`)
  - `docs/architecture/arch-micro-backoffice-web.md#L1124` (fluxo UI: configuração de Centurion)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/app.module.ts` (registrar `centurions`)
  - `backoffice-web/src/app/(dashboard)/**` (rotas `centurions/`)
  - `agent-runtime/src/modules/centurion/repository/centurion_repository.py` (cache/reload)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/centurions/**` — controllers/services/repository/domain/dto/interfaces
  - `backoffice-api/src/modules/centurions/events/centurion-config-updated.event.ts` — evento interno/Redis
  - `backoffice-web/src/modules/centurions/**` — prompt editor, criteria builder, tool picker, test chat
  - `agent-runtime/src/modules/centurion/repository/centurion_repository.py` — leitura de config por `company_id`
  - `agent-runtime/src/common/infrastructure/messaging/subscribers/centurion_config_subscriber.py` — recarregar em tempo real (opcional)
- **Conexões diretas:**
  - `backoffice-web` ↔ `backoffice-api` (`/centurions/*`)
  - `backoffice-api` ↔ Postgres/Supabase (`core.centurion_configs`)
  - `backoffice-api` ↔ Redis (publish `centurion.config.updated` ou equivalente)
  - `agent-runtime` ↔ Redis (subscribe atualização) e Postgres (recarregar config)
- **Conexões indiretas:**
  - Qualificação, tools, memórias e mídia dependem de campos de config; mudanças afetam comportamento do LLM.
- **Relações com o código:**
  - Centraliza “controle” (API/UI) e “execução” (runtime) do Centurion; é o ponto de acoplamento intencional via eventos.
- **Áreas de impacto:**
  - UI de configuração, banco (configs), runtime (cache e reload), mensageria (eventos).

---

### EPIC-013 — Humanização conversacional: debounce + chunking (mensagens picadas) + tracking

#### 1. Definição & Justificativa
- **O que:** Implementar as regras obrigatórias do motor conversacional: (a) **debounce** para agrupar mensagens inbound e (b) **chunking** para enviar respostas em múltiplas mensagens, com tracking de status/ids do provedor.
- **Por que:** É regra de negócio (não opcional) para UX humana; evita “responder cada ping” e evita “blocão” de texto.
- **Referências arquiteturais:**
  - `docs/business-context/contexto_negócio.md#L630` (debounce obrigatório)
  - `docs/business-context/contexto_negócio.md#L635` (chunking obrigatório + tracking)
  - `docs/business-context/04-ciclo-de-vida.md#L88` (estado de debounce da conversa)
  - `docs/architecture/arch-micro-agent-runtime.md#L303` (Debounce Pattern no runtime)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L777` (mensagens picadas + debounce como capacidade)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/centurion/handlers/message_handler.py` (acumular/encaminhar lotes após debounce)
  - `agent-runtime/src/modules/centurion/services/centurion_service.py` (gerar chunks + delays)
  - `evolution-manager/src/modules/messages/services/messages.service.ts` (suportar envio picado + retry/delay)
  - `supabase/migrations/**` (garantir campos de debounce e pending queue em `core.conversations`)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/centurion/handlers/debounce_handler.py` — controle de janelas de debounce
  - `agent-runtime/src/modules/centurion/services/response_builder.py` — chunking/humanização + delays
  - `packages/contracts/src/events/message_sent.ts` — payload com `messages[]` (chunks) e metadados
  - `backoffice-api/src/modules/leads/services/timeline.service.ts` — timeline/estado (opcional) para depuração
- **Conexões diretas:**
  - `agent-runtime` ↔ Redis (buffer state + publish `message.sent`)
  - `evolution-manager` ↔ Evolution API (enviar N mensagens com delay)
- **Conexões indiretas:**
  - Métricas (tempo de resposta) e qualidade do SDR dependem de debounce/chunking.
  - Persistência em `core.messages` deve suportar múltiplas mensagens outbound com `channel_message_id`.
- **Relações com o código:**
  - Integra diretamente com `Conversation` (estado) e adapters de canal; influencia quase todo o pipeline de mensagens.
- **Áreas de impacto:**
  - UX conversacional (tempo e formato), mensageria, persistência, confiabilidade (retry/rate limit).

---

### EPIC-014 — Multimodal inbound (STT + Vision) com persistência de transcrição/descrição

#### 1. Definição & Justificativa
- **O que:** Implementar processamento de **áudio (STT)** e **imagem (vision)** no Agent Runtime, enriquecendo o contexto do LLM e persistindo transcrição/descrição em `core.messages`.
- **Por que:** Leads enviam áudio/imagem; a V1 exige compreensão multimodal e isso impacta diretamente a taxa de qualificação.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L66` (STT como P0)
  - `docs/business-context/05-escopo-v1.md#L67` (Vision como P0)
  - `docs/business-context/contexto_negócio.md#L640` (multimodal inbound obrigatório)
  - `docs/business-context/03-modelo-de-entidades.md#L277` (`core.messages.audio_transcription` e `image_description`)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L771` (processamento multi‑modal como capacidade)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/channels/adapters/whatsapp_adapter.py` (detectar mídia e baixar/stream)
  - `agent-runtime/src/modules/centurion/services/centurion_service.py` (pipeline: pré-processar mídia → texto/descrição)
  - `supabase/migrations/**` (garantir campos de mídia e índices relevantes)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/channels/services/media_downloader.py` — download/stream seguro de mídia
  - `agent-runtime/src/modules/channels/services/stt_service.py` — STT (provider abstrato + fallback)
  - `agent-runtime/src/modules/channels/services/vision_service.py` — Vision (provider abstrato + fallback)
  - `agent-runtime/src/modules/centurion/dto/media_dtos.py` — DTOs para áudio/imagem
- **Conexões diretas:**
  - `agent-runtime` ↔ provider STT/Vision (OpenAI/Anthropic/outros)
  - `agent-runtime` ↔ storage/URLs de mídia (Evolution/IG/TG)
- **Conexões indiretas:**
  - Memórias (RAG/grafo) se beneficiam do texto extraído; melhora recall e qualificação.
- **Relações com o código:**
  - Estende `Message` e `ConversationService`; afeta prompt/context assembly e logging.
- **Áreas de impacto:**
  - IA multimodal, custo de processamento, latência, persistência, observabilidade (métricas por tipo).

---

### EPIC-015 — Envio de mídias + sequências configuráveis (`core.media_sequences`)

#### 1. Definição & Justificativa
- **O que:** Permitir que o Centurion envie mídias (áudio/imagem/vídeo) seguindo sequências configuráveis por empresa/agente e gatilhos (palavra-chave, estágio, manual, time-based).
- **Por que:** V1 exige comunicação rica e playbooks configuráveis (ex.: enviar catálogo/áudio explicativo no momento certo).
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L68` (envio de mídias como P0)
  - `docs/business-context/05-escopo-v1.md#L69` (sequência de mídias configurável como P0)
  - `docs/business-context/03-modelo-de-entidades.md#L497` (tabela `core.media_sequences`)
  - `docs/business-context/03-modelo-de-entidades.md#L150` (capabilidades `can_send_*` / `can_process_*` em Centurion)
  - `docs/business-context/contexto_negócio.md#L646` (multimodal outbound conforme playbook)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/centurions/**` (expor CRUD de `media_sequences` por centurion)
  - `backoffice-web/src/modules/centurions/**` (UI para editar sequências e gatilhos)
  - `agent-runtime/src/modules/centurion/services/centurion_service.py` (resolver gatilhos e acionar envios)
  - `evolution-manager/src/modules/messages/services/messages.service.ts` (envio de mídia com retry/rate limit)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/centurions/submodules/media-sequences/**` — CRUD e validação
  - `agent-runtime/src/modules/channels/services/media_sender.py` — enviar mídia por canal
  - `agent-runtime/src/modules/centurion/services/media_sequence_service.py` — resolver sequência + delays
  - `packages/contracts/src/events/media_sent.ts` — evento opcional de tracking de mídia
- **Conexões diretas:**
  - `agent-runtime` ↔ `evolution-manager` (via Redis/`message.sent` contendo mídia ou comandos específicos)
  - `backoffice-api` ↔ Postgres (`core.media_sequences`)
- **Conexões indiretas:**
  - Métricas e auditoria devem capturar envios de mídia (para análise e troubleshooting).
- **Relações com o código:**
  - Conecta config (Centurion) com execução (runtime) e delivery (Evolution/IG/TG).
- **Áreas de impacto:**
  - Banco (media_sequences), UI (builder), runtime (gatilhos), canal (envio de mídia), confiabilidade.

---

## Fase 4 — Memória (curto prazo, RAG/pgvector, grafo)

### EPIC-016 — Memória curta: `core.conversations`/`core.messages` + estado no Redis

#### 1. Definição & Justificativa
- **O que:** Implementar memória de curto prazo com persistência de conversas e mensagens no CORE e estado de execução/latência no Redis (janela de debounce, contexto atual, histórico recente).
- **Por que:** A qualificação depende de contexto conversacional; sem memória curta consistente, debounce/chunking e decisões do agente ficam instáveis.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L82` (memória curta como P0)
  - `docs/business-context/03-modelo-de-entidades.md#L234` (`core.conversations` com estado de debounce/pending queue)
  - `docs/business-context/03-modelo-de-entidades.md#L266` (`core.messages` com mídia/transcrição)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1275` (curto prazo em Redis + histórico/contexto)
  - `docs/business-context/04-ciclo-de-vida.md#L119` (regra: novas mensagens resetam timer de debounce)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `supabase/migrations/**` (criar/ajustar tabelas e índices de conversas/mensagens)
  - `agent-runtime/src/modules/centurion/services/conversation_service.py` (load/save + cache)
  - `agent-runtime/src/common/infrastructure/cache/redis_client.py` (keys e TTLs)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/centurion/repository/conversation_repository.py` — persistência
  - `agent-runtime/src/modules/centurion/repository/message_repository.py` — persistência
  - `agent-runtime/src/modules/memory/services/short_term_memory.py` — montagem de contexto para LLM
- **Conexões diretas:**
  - `agent-runtime` ↔ Postgres (`core.conversations`, `core.messages`)
  - `agent-runtime` ↔ Redis (cache do estado e buffers de debounce)
- **Conexões indiretas:**
  - Leads UI/timeline e auditoria dependem do histórico persistido; marketing e contratos dependem de dados corretos do lead.
- **Relações com o código:**
  - Base para memórias longas e grafo (extração pós-conversa) e para métricas (contadores por conversa).
- **Áreas de impacto:**
  - Banco (histórico), cache (Redis), runtime (estado), UX (resposta correta/consistente).

---

### EPIC-017 — Memória longa (RAG): `core.lead_memories` + embeddings (pgvector)

#### 1. Definição & Justificativa
- **O que:** Implementar memória de longo prazo com RAG: extrair fatos/preferências, gerar embeddings e persistir em `core.lead_memories` para busca semântica e resumo consolidado.
- **Por que:** A V1 exige “lembrar do lead mesmo dias depois”; RAG aumenta qualidade da conversa e reduz repetição/perda de contexto.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L83` (memória longa RAG como P0)
  - `docs/business-context/03-modelo-de-entidades.md#L296` (tabela `core.lead_memories` com `embeddings vector`)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1280` (longo prazo: Postgres + RAG)
  - `docs/business-context/04-ciclo-de-vida.md#L83` (RAG atualiza após cada conversa)
  - `docs/business-context/05-escopo-v1.md#L278` (DoD: `pgvector` configurado)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `supabase/migrations/**` (habilitar extensão `vector`, índices e tabelas)
  - `agent-runtime/src/modules/memory/services/long_term_memory.py` (persistir e consultar fatos/embeddings)
  - `agent-runtime/src/modules/centurion/services/centurion_service.py` (injetar contexto RAG no prompt)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/memory/adapters/rag_adapter.py` — wrapper de busca semântica (pgvector)
  - `agent-runtime/src/modules/memory/services/fact_extractor.py` — extrair fatos pós-conversa
  - `agent-runtime/src/modules/memory/services/embedding_service.py` — gerar embeddings (provider abstrato)
- **Conexões diretas:**
  - `agent-runtime` ↔ Postgres/pgvector (armazenar e buscar embeddings)
  - `agent-runtime` ↔ provider de embeddings (OpenAI/Anthropic/outros)
- **Conexões indiretas:**
  - Knowledge base (EPIC‑021) reutiliza a pipeline de chunking/embeddings; custos e tuning são compartilhados.
- **Relações com o código:**
  - Impacta diretamente o “prompt assembly” do LLM e a qualidade de qualificação.
- **Áreas de impacto:**
  - Banco (pgvector), IA (embeddings), performance (indexação/latência), custo e relevância de contexto.

---

### EPIC-018 — Memória de grafo: `core.lead_graphs` + enriquecimento de relações

#### 1. Definição & Justificativa
- **O que:** Implementar memória de grafo persistida em `core.lead_graphs` (nós/relacionamentos/contexto estruturado) e um pipeline de enriquecimento a partir de conversas.
- **Por que:** Algumas decisões do agente exigem contexto estruturado (pessoas, interesses, produtos, eventos) e não apenas texto; melhora coerência em longas jornadas.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L84` (memória de grafo como P0)
  - `docs/business-context/03-modelo-de-entidades.md#L330` (tabela `core.lead_graphs`)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1285` (grafo: Neo4j/PostgreSQL)
  - `docs/business-context/04-ciclo-de-vida.md#L84` (grafo enriquecido com entidades extraídas)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1293` (grafo entra no contexto do LLM)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `supabase/migrations/**` (criar/ajustar `core.lead_graphs`)
  - `agent-runtime/src/modules/memory/services/graph_memory.py` (persistir/consultar grafo)
  - `agent-runtime/src/modules/centurion/services/centurion_service.py` (injetar contexto do grafo)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/memory/adapters/graph_adapter.py` — API para ler/escrever nós/arestas
  - `agent-runtime/src/modules/memory/services/entity_extractor.py` — extrair entidades e relações (LLM/tool)
- **Conexões diretas:**
  - `agent-runtime` ↔ Postgres (persistência do grafo em JSONB)
- **Conexões indiretas:**
  - Handoff/deals podem usar atributos estruturados para preencher snapshot do deal (ex.: endereço, serviço, valor).
- **Relações com o código:**
  - Complementa RAG e memória curta; aumenta consistência do agente em diálogos complexos.
- **Áreas de impacto:**
  - IA (extração), banco (JSONB), qualidade da qualificação, enriquecimento de dados.

---

## Fase 5 — Tools & Extensibilidade (tools, MCP, base de conhecimento)

### EPIC-019 — Tools configuráveis: CRUD (`core.tool_configs`) + execução segura no runtime

#### 1. Definição & Justificativa
- **O que:** Implementar configuração de tools por Centurion (endpoints, schemas, auth) e execução segura no Agent Runtime durante a conversa, com timeouts, retries e auditoria.
- **Por que:** O Centurion precisa executar ações externas (agenda, CRM, busca) para qualificação real; V1 requer extensibilidade.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L95` (tools configuráveis como P0)
  - `docs/business-context/03-modelo-de-entidades.md#L426` (tabela `core.tool_configs`)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L775` (Tools/MCP como capacidade do Centurion)
  - `docs/architecture/arch-micro-agent-runtime.md#L89` (operação `ExecuteTool`)
  - `docs/business-context/05-escopo-v1.md#L244` (DoD: IA executa tools configuradas)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/centurions/**` (referenciar tools habilitadas)
  - `agent-runtime/src/modules/tools/services/tool_executor.py` (execução HTTP, validação, retries)
  - `agent-runtime/src/modules/centurion/services/centurion_service.py` (decidir quando chamar tool)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/tools/**` — CRUD de `tool_configs` por centurion
  - `backoffice-web/src/modules/centurions/tools/**` — UI de configuração (endpoint, schemas, auth)
  - `agent-runtime/src/modules/tools/domain/tool.py` — entidade/VO de tool
  - `agent-runtime/src/modules/tools/services/schema_validator.py` — validar input/output (JSON Schema)
- **Conexões diretas:**
  - `agent-runtime` ↔ serviços externos (HTTP) conforme `tool_configs.endpoint`
  - `backoffice-api` ↔ Postgres (`core.tool_configs`)
- **Conexões indiretas:**
  - Observabilidade deve capturar `tool_execution_duration_seconds` e falhas por tool (impacta SLO e custos).
- **Relações com o código:**
  - Integra com prompt (tool calling), com memórias (uso de contexto) e com follow-ups/handoff (ações).
- **Áreas de impacto:**
  - Integrações externas, segurança (auth configs), auditoria, confiabilidade (timeouts/retries).

---

### EPIC-020 — Servidores MCP: CRUD (`core.mcp_servers`) + sync de tools + uso pelo Agent Runtime

#### 1. Definição & Justificativa
- **O que:** Implementar configuração e gestão de servidores MCP por empresa/Centurion, sincronizar catálogo de tools disponíveis e permitir execução via MCP no Agent Runtime.
- **Por que:** MCP é o mecanismo de extensibilidade padronizado; V1 exige conexão e uso de servidores MCP.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L96` (servidores MCP como P0)
  - `docs/business-context/03-modelo-de-entidades.md#L464` (tabela `core.mcp_servers`)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1248` (`mcp_servers` em `core.centurion_configs`)
  - `docs/architecture/arch-micro-agent-runtime.md#L673` (tool calling → registry/MCP no runtime)
  - `docs/business-context/05-escopo-v1.md#L245` (DoD: IA conecta e usa MCP)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/centurions/**` (vincular MCPs ao Centurion)
  - `agent-runtime/src/modules/tools/services/mcp_client.py` (client MCP + timeouts)
  - `agent-runtime/src/modules/tools/services/tool_executor.py` (rotear para MCP quando aplicável)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/mcp/**` — CRUD de MCP servers + sync periódico de tools
  - `backoffice-web/src/modules/centurions/mcp/**` — UI para conectar MCP, credenciais e status
  - `agent-runtime/src/modules/tools/services/mcp_registry.py` — cache de tools disponíveis por MCP
- **Conexões diretas:**
  - `agent-runtime` ↔ MCP servers (HTTP/WebSocket conforme protocolo MCP)
  - `backoffice-api` ↔ Postgres (`core.mcp_servers`) e ↔ MCP servers (sync)
- **Conexões indiretas:**
  - Failures de MCP devem degradar graciosamente (fallback) para não travar conversa/qualificação.
- **Relações com o código:**
  - Complementa EPIC‑019: tools podem vir de endpoints HTTP ou MCP; UI/unificação deve ser coerente.
- **Áreas de impacto:**
  - Extensibilidade (MCP), segurança de credenciais, confiabilidade e observabilidade.

---

### EPIC-021 — Base de conhecimento (RAG Upload): `knowledge_*` + chunking + retrieval + UI

#### 1. Definição & Justificativa
- **O que:** Implementar base de conhecimento por empresa/Centurion: upload de documentos, processamento (chunking + embeddings), persistência em `core.knowledge_*` e retrieval semântico pelo Agent Runtime.
- **Por que:** V1 exige que a IA consulte conhecimento personalizado (produtos, FAQ, regras do negócio) para responder e qualificar corretamente.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L97` (base de conhecimento RAG upload como P0)
  - `docs/business-context/03-modelo-de-entidades.md#L361` (tabelas `core.knowledge_bases`/`documents`/`chunks`)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1282` (knowledge base entra no contexto do LLM)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1575` (política de storage por `company_id`)
  - `docs/business-context/05-escopo-v1.md#L246` (DoD: IA consulta base de conhecimento RAG)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `supabase/migrations/**` (tabelas `knowledge_*`, índices ivfflat, policies de storage)
  - `agent-runtime/src/modules/memory/services/long_term_memory.py` (integrar retrieval de KB ao contexto)
  - `backoffice-web/src/modules/centurions/**` (vincular `knowledge_base_id` na UI)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/knowledge-base/**` — upload, CRUD, jobs de processamento, status
  - `backoffice-web/src/modules/knowledge-base/**` — UI de upload, lista de docs, status de processamento
  - `agent-runtime/src/modules/memory/adapters/knowledge_base_adapter.py` — busca semântica em `knowledge_chunks`
  - `agent-runtime/src/modules/memory/services/document_processor.py` — extrair texto, chunking, embeddings
  - `supabase/storage/buckets/**` (ou migrations equivalentes) — buckets para documentos KB
- **Conexões diretas:**
  - `backoffice-api` ↔ storage (upload de arquivos) e Postgres (metadados/status)
  - `agent-runtime` ↔ Postgres/pgvector (consulta semântica)
- **Conexões indiretas:**
  - Custo/latência de embeddings impactam throughput do sistema; jobs assíncronos evitam travar UI.
- **Relações com o código:**
  - Reusa infra de embeddings (EPIC‑017) e complementa prompt/context assembly do Agent Runtime.
- **Áreas de impacto:**
  - Storage, processamento assíncrono, banco (pgvector), IA (retrieval), UX (upload/status).

---

## Fase 6 — Qualificação (follow‑ups, captação via formulário)

### EPIC-022 — Follow-ups automáticos: configs + scheduler + logs + UI

#### 1. Definição & Justificativa
- **O que:** Implementar regras de follow-up configuráveis por Centurion, scheduler/worker para execução e logs de follow-ups; expor CRUD e UI para configuração.
- **Por que:** V1 exige reengajamento automático de leads sem resposta para maximizar conversão sem SDR humano.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L106` (follow-ups automáticos P0)
  - `docs/business-context/03-modelo-de-entidades.md#L526` (`core.follow_up_configs`)
  - `docs/business-context/03-modelo-de-entidades.md#L557` (`core.follow_up_logs`)
  - `docs/business-context/04-ciclo-de-vida.md#L21` (estados `follow_up_pending`/`follow_up_sent`)
  - `docs/business-context/05-escopo-v1.md#L258` (DoD: follow-ups automáticos enviados)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `agent-runtime/src/modules/handoff/services/handoff_service.py` (se follow-up e handoff compartilham agendamento)
  - `agent-runtime/src/modules/centurion/services/conversation_service.py` (detectar “no response” e agendar)
  - `backoffice-api/src/modules/centurions/**` (expor configs de follow-up por centurion)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/handlers/proactive_handler.py` — worker de follow-ups
  - `agent-runtime/src/modules/followups/services/followup_service.py` — regras, tentativas, templates
  - `backoffice-api/src/modules/followups/**` — CRUD de follow-ups (configs + logs)
  - `backoffice-web/src/modules/centurions/followups/**` — UI de configuração e visualização de logs
- **Conexões diretas:**
  - `agent-runtime` ↔ Redis (fila/scheduler/locks) e Postgres (`follow_up_*`)
  - `agent-runtime` ↔ canal outbound (via `message.sent`/Evolution/etc.)
- **Conexões indiretas:**
  - Métricas de eficácia do follow-up impactam dashboards e tuning de prompts (feedback loop).
- **Relações com o código:**
  - Liga ciclo de vida do lead (estados) com automações temporais e envio de mensagens.
- **Áreas de impacto:**
  - Automações, mensageria, persistência (logs), UX (configuração), observabilidade.

---

### EPIC-023 — Captação via formulário + abordagem proativa (webhook → lead → mensagem)

#### 1. Definição & Justificativa
- **O que:** Implementar endpoint/webhook de captação via formulário para criar lead no CORE e disparar abordagem proativa do Centurion, respeitando estados do ciclo de vida.
- **Por que:** V1 exige capturar leads de landing pages e iniciar conversa automaticamente (SDR 100% IA).
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L123` (captura via formulário P0)
  - `docs/business-context/05-escopo-v1.md#L124` (abordagem proativa P0)
  - `docs/business-context/04-ciclo-de-vida.md#L18` (estado `proactive_contacted`)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L73` (leads nascem no CORE)
  - `docs/business-context/05-escopo-v1.md#L235` (DoD: formulário dispara abordagem proativa)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/leads/**` (adicionar endpoint de ingestão de formulário)
  - `agent-runtime/src/modules/centurion/handlers/message_handler.py` (distinguir inbound vs proactive)
  - `supabase/migrations/**` (garantir colunas de tracking/UTM e índices)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/leads/controllers/forms.controller.ts` — `POST /leads/forms` (ou similar)
  - `backoffice-api/src/modules/leads/dto/create-form-lead.dto.ts` — payload do formulário (inclui UTM)
  - `agent-runtime/src/handlers/proactive_handler.py` — envio proativo (pode ser reutilizado do EPIC‑022)
  - `packages/contracts/src/events/lead_created.ts` — evento `lead.created` com UTM/fingerprint
- **Conexões diretas:**
  - Form provider ↔ Backoffice API (webhook)
  - Backoffice API ↔ Postgres (criar lead no CORE)
  - Agent Runtime ↔ canal outbound (enviar primeira mensagem)
- **Conexões indiretas:**
  - Marketing/CAPI depende de UTM/fingerprint corretos para atribuição.
- **Relações com o código:**
  - Reusa o mesmo pipeline de qualificação; muda apenas a origem do lead (form vs canal de chat).
- **Áreas de impacto:**
  - APIs (webhook), banco (tracking), automações (proactive), métricas de conversão.

---

## Fase 7 — Handoff & CRM + Contratos

### EPIC-024 — Handoff & Deals: `core → <empresa>.deals` + `core.deals_index` + estados do pipeline

#### 1. Definição & Justificativa
- **O que:** Implementar handoff quando lead é qualificado: criar deal no schema da empresa com `core_lead_id`, atualizar `core.deals_index` e suportar estados básicos do deal.
- **Por que:** É o entregável central do SDR IA: lead qualificado vira oportunidade operável pelo time de vendas (front operacional).
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L135` (handoff `core.leads → empresa.deals` como P0)
  - `docs/business-context/03-modelo-de-entidades.md#L656` (`core.deals_index` e regra de sincronização)
  - `docs/business-context/03-modelo-de-entidades.md#L689` (tabela `<empresa>.deals` com referência obrigatória ao CORE)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L75` (pipeline: captação → core.leads → qualificação → handoff → deals)
  - `docs/business-context/04-ciclo-de-vida.md#L57` (transição `qualified → handoff_done`)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `supabase/migrations/**` (tabelas no `_template_base`, triggers para `deals_index`, grants/RLS)
  - `agent-runtime/src/modules/handoff/services/handoff_service.py` (criar deal e registrar handoff)
  - `backoffice-api/src/modules/leads/**` (expor estado e histórico do handoff no lead)
- **Novos arquivos a serem criados:**
  - `agent-runtime/src/modules/handoff/events/lead_qualified_event.py` — evento `lead.qualified`
  - `supabase/migrations/**_deals_index_triggers.sql` — triggers `<empresa>.deals → core.deals_index`
  - `backoffice-api/src/modules/deals/**` — endpoints para listar/consultar deals (visão do dono e/ou front)
  - `packages/contracts/src/events/lead_qualified.ts` — payload do evento `lead.qualified` (score/criteria)
- **Conexões diretas:**
  - `agent-runtime` ↔ Postgres (criar deal em schema dinâmico + atualizar índice)
  - `agent-runtime` ↔ Redis (publish `lead.qualified`)
  - `backoffice-api` ↔ Postgres (consultas do índice e leads)
- **Conexões indiretas:**
  - Contratos e marketing dependem do deal/estado; dashboards dependem do índice consolidado.
- **Relações com o código:**
  - É a ponte entre CORE e operação por empresa; reforça o princípio “leads nascem no CORE”.
- **Áreas de impacto:**
  - Banco (schemas por empresa + triggers), runtime (handoff), APIs (deals), operação (front de vendas).

---

### EPIC-025 — Contratos (Autentique): templates, geração, webhooks e status

#### 1. Definição & Justificativa
- **O que:** Implementar integração com Autentique para geração de contratos a partir de templates, envio para assinatura, processamento de webhooks e persistência de status; expor UI para templates e acompanhamento.
- **Por que:** V1 inclui contratos (P1) e DoD exige rastrear assinatura; contratos assinados disparam eventos de conversão (Purchase) para marketing.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L148` (templates de contrato P1)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L908` (SVC‑005: Autentique Service SRP)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L973` (fluxo: API → Autentique → webhook signed)
  - `docs/business-context/03-modelo-de-entidades.md#L601` (`core.contract_templates`)
  - `docs/business-context/03-modelo-de-entidades.md#L627` (`core.contracts`)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/contracts/**` (orquestrar criação/listagem/cancelamento de contratos)
  - `backoffice-web/src/app/(dashboard)/**` (rotas `contratos/`)
  - `supabase/migrations/**` (tabelas `contract_templates`/`contracts` + RLS)
- **Novos arquivos a serem criados:**
  - `autentique-service/package.json` — Dependências e scripts
  - `autentique-service/src/modules/contracts/**` — controllers/services/repository/domain/events
  - `autentique-service/src/infrastructure/autentique/**` — `autentique.client.ts` + assinatura
  - `autentique-service/src/modules/contracts/controllers/webhooks.controller.ts` — `POST /webhooks/autentique`
  - `backoffice-web/src/modules/contratos/**` — UI de templates + status de contratos
- **Conexões diretas:**
  - `backoffice-api` ↔ `autentique-service` (REST `POST /contracts`, `GET /contracts`)
  - `autentique-service` ↔ Autentique (REST + webhooks)
  - `autentique-service` ↔ Redis (publish `contract.created`, `contract.signed`)
- **Conexões indiretas:**
  - `facebook-capi` consome `contract.signed` para enviar `Purchase`; dashboards agregam conversões.
- **Relações com o código:**
  - Integra com deals (contrato vinculado a `deal_index_id`) e com marketing (evento Purchase).
- **Áreas de impacto:**
  - Integração externa (Autentique), banco (contratos/templates), mensageria (eventos), UI (acompanhamento).

---

## Fase 8 — Dashboard & Marketing (métricas, pixels, Facebook CAPI)

### EPIC-026 — Pixels e tracking no CORE: `core.pixel_configs` + logs de eventos de marketing

#### 1. Definição & Justificativa
- **O que:** Implementar CRUD de pixels por empresa e persistência de eventos/diagnósticos de tracking no CORE (para auditoria e troubleshooting).
- **Por que:** V1 inclui marketing básico (P1) e a arquitetura prevê pixel configs e logs para garantir entrega e rastreabilidade.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L160` (CRUD de pixels por empresa P1)
  - `docs/business-context/03-modelo-de-entidades.md#L578` (tabela `core.pixel_configs`)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1125` (pixel configs e marketing events no CORE)
  - `docs/architecture/arch-micro-facebook-capi.md#L68` (capacidade `ConfigurePixel`)
  - `docs/business-context/05-escopo-v1.md#L269` (DoD: eventos de conversão enviados ao Facebook)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/marketing/**` (endpoints para `pixel_configs`)
  - `backoffice-web/src/modules/marketing/**` (UI de configuração do pixel por empresa)
  - `supabase/migrations/**` (tabelas/policies para `pixel_configs` e event logs)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/marketing/controllers/pixels.controller.ts` — CRUD do pixel
  - `backoffice-api/src/modules/marketing/dto/**` — DTOs de pixel e filtros
  - `backoffice-web/src/modules/marketing/pixels/**` — forms, validação, status
  - `supabase/migrations/**_marketing_events.sql` — tabela `core.marketing_events` (separada) para logs (se adotado)
- **Conexões diretas:**
  - `backoffice-api` ↔ Postgres (`core.pixel_configs`)
  - `backoffice-web` ↔ `backoffice-api` (configuração)
- **Conexões indiretas:**
  - `facebook-capi` depende de `pixel_configs` válidos para enviar eventos; falhas aqui viram queda de atribuição.
- **Relações com o código:**
  - Serve de fonte de verdade para `facebook-capi` e para painéis de marketing.
- **Áreas de impacto:**
  - Banco (configs/logs), UI (marketing), integração CAPI (config).

---

### EPIC-027 — Facebook CAPI Service: fila, hashing, deduplicação e dispatch confiável

#### 1. Definição & Justificativa
- **O que:** Implementar o serviço `facebook-capi` para consumir eventos (lead created/qualified, contract signed), enfileirar/processar com retry/backoff, normalizar e hashear user data e enviar para Meta Conversions API.
- **Por que:** Tracking server‑side exige confiabilidade e conformidade (hashing); eventos não podem ser perdidos (fila) e devem respeitar rate limits.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1001` (SVC‑006: Facebook CAPI Service SRP)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1096` (eventos suportados: Lead/CompleteRegistration/Purchase)
  - `docs/architecture/arch-micro-facebook-capi.md#L178` (Redis channels escutados)
  - `docs/architecture/arch-micro-facebook-capi.md#L209` (mapeamento eventos → CAPI)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1350` (canal `lead.created` e consumidores)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `docker-compose.yml` (incluir `facebook-capi`, vars de Redis e Meta)
  - `.env.example` (incluir `META_*`/`pixel_id`/`access_token`/`test_event_code`)
  - `packages/contracts/src/channels.ts` (garantir canais `lead.created`, `lead.qualified`, `contract.signed`)
- **Novos arquivos a serem criados:**
  - `facebook-capi/package.json` — Dependências e scripts
  - `facebook-capi/src/modules/events/**` — subscriber, services, repository, DTOs
  - `facebook-capi/src/modules/pixels/**` — endpoints de config (opcional se centralizado no API)
  - `facebook-capi/src/infrastructure/facebook/facebook.client.ts` — client Meta CAPI
  - `facebook-capi/src/infrastructure/redis/queue.service.ts` — fila/worker (retry/backoff/DLQ)
  - `facebook-capi/src/infrastructure/supabase/**` — persistência de logs/dedup
- **Conexões diretas:**
  - `facebook-capi` ↔ Redis (subscribe eventos, queue)
  - `facebook-capi` ↔ Meta Conversions API (REST)
  - `facebook-capi` ↔ Postgres (logs, dedup, configs)
- **Conexões indiretas:**
  - Autentique e Agent Runtime influenciam a qualidade do tracking (payloads corretos e timing).
- **Relações com o código:**
  - Consome eventos do domínio (lead/contract) e produz side effects externos (conversão).
- **Áreas de impacto:**
  - Integração externa (Meta), segurança/compliance (hash), confiabilidade (fila), observabilidade (event logs).

---

### EPIC-028 — Dashboard & Métricas: agregação, cache e atualizações em tempo real

#### 1. Definição & Justificativa
- **O que:** Implementar métricas consolidadas por empresa e global (holding) na Backoffice API, cache em Redis e UI de dashboards no Backoffice Web, com updates em tempo real/near real-time.
- **Por que:** V1 exige visibilidade consolidada e status de canais/Centurions; sem métricas, o dono não consegue operar e ajustar a IA.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L172` (dashboard e métricas P0)
  - `docs/architecture/arch-micro-backoffice-api.md#L554` (MetricsService: agregação + cache Redis)
  - `docs/architecture/arch-micro-backoffice-web.md#L67` (feature Dashboard)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L512` (módulo `metrics` no Backoffice API)
  - `docs/business-context/05-escopo-v1.md#L284` (dashboard em tempo real/near real-time)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/app.module.ts` (registrar módulo `metrics`)
  - `backoffice-web/src/app/(dashboard)/**` (rotas `metricas/`)
  - `packages/contracts/src/events/**` (eventos que atualizam métricas/timeline)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/metrics/**` — controllers/services/dto (overview, por empresa, por Centurion)
  - `backoffice-api/src/infrastructure/redis/cache.service.ts` — helper de cache TTL
  - `backoffice-api/src/infrastructure/ws/**` — gateway WS para notificar UI (ou SSE)
  - `backoffice-web/src/modules/metricas/**` — UI (cards, charts, filtros, polling/WS)
- **Conexões diretas:**
  - `backoffice-api` ↔ Postgres (queries agregadas)
  - `backoffice-api` ↔ Redis (cache + subscribe eventos para invalidar cache)
  - `backoffice-web` ↔ WS/SSE (updates) + REST (queries)
- **Conexões indiretas:**
  - Quaisquer mudanças no modelo de eventos ou no ciclo do lead afetam a agregação (cascata).
- **Relações com o código:**
  - Amarra dados de todos os serviços (Agent Runtime, Evolution, Autentique, CAPI) numa visão operacional.
- **Áreas de impacto:**
  - Performance (agregação + cache), UX (dashboards), observabilidade (KPIs), operação (alertas/status).

---

## Fase 9 — Refinamento (testes, observabilidade, deploy/validação)

### EPIC-029 — Testes: unit/integration/e2e + testes críticos de isolamento RLS

#### 1. Definição & Justificativa
- **O que:** Implementar estratégia de testes por serviço (unit/integration/e2e), testes de contratos de eventos e testes automatizados de RLS (isolamento multi-tenant).
- **Por que:** Multi-tenancy e integrações event-driven são áreas de alto risco; testes são o mecanismo principal para evitar regressões críticas.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1634` (estrutura e pirâmide de testes)
  - `docs/business-context/05-escopo-v1.md#L273` (DoD técnico: RLS funciona)
  - `docs/business-context/05-escopo-v1.md#L294` (risco: falha de RLS → mitigação: testes automatizados)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1694` (checklist de conformidade)
  - `docs/architecture/arch-micro-facebook-capi.md#L1092` (padrões técnicos: deduplicação/batching/test events)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/**` (adicionar suites de testes e fixtures)
  - `evolution-manager/**` (adicionar testes de webhooks/transformações)
  - `agent-runtime/**` (testes de debounce/chunking/memórias/tools)
  - `facebook-capi/**` (testes de mapping/hashing/retry)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/**/__tests__/**` — unit/integration/e2e (conforme padrão)
  - `supabase/tests/rls/**` — testes específicos de policies (A não vê B)
  - `packages/contracts/src/__tests__/**` — validação de schemas/payloads
  - `infra/test-data/**` — seeds e datasets sintéticos (multi‑tenant)
- **Conexões diretas:**
  - Testes de integração ↔ Postgres/Redis (containers locais)
- **Conexões indiretas:**
  - Testes e2e exercitam fluxo completo: webhook → runtime → outbound → handoff → CAPI.
- **Relações com o código:**
  - Protege contratos de eventos e regras de negócio (debounce/chunking/ciclo de vida).
- **Áreas de impacto:**
  - Qualidade, segurança (RLS), confiabilidade de integrações, tempo de deploy.

---

### EPIC-030 — Observabilidade, auditoria, hardening e deploy (produção)

#### 1. Definição & Justificativa
- **O que:** Implementar observabilidade (logs estruturados, métricas Prometheus, tracing), auditoria de operações sensíveis, hardening (rate limiting, retry, idempotência) e pipeline de deploy/validação (staging/prod).
- **Por que:** A V1 precisa operar com confiabilidade; integrações externas (WhatsApp/Autentique/Meta) e IA demandam monitoramento ativo e resposta rápida a incidentes.
- **Referências arquiteturais:**
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1659` (logging pattern com contexto)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1672` (error handling padronizado)
  - `docs/architecture/arch-micro-agent-runtime.md#L1461` (métricas Prometheus sugeridas)
  - `docs/business-context/05-escopo-v1.md#L282` (operacional: front trabalha deals, operação contínua)
  - `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md#L1807` (Docker Compose dev como base operacional)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/common/**` (interceptors/filters para logs, errors, request-id)
  - `evolution-manager/src/common/**` (rate limiting, retry, validação webhook)
  - `agent-runtime/src/common/config/logging.py` (logs estruturados)
  - `facebook-capi/src/infrastructure/redis/queue.service.ts` (DLQ, retry/backoff, métricas)
  - `docker-compose.yml` (profiling, exporters, healthchecks)
- **Novos arquivos a serem criados:**
  - `infra/observability/**` — configs (Prometheus/Grafana/OpenTelemetry) e dashboards
  - `infra/runbooks/**` — runbooks (WhatsApp ban, falha Autentique, fila CAPI, incidentes RLS)
  - `infra/deploy/**` — manifests/compose prod (ou helm/k8s), secrets guidelines
  - `backoffice-api/src/infrastructure/audit/**` — auditoria (quem fez o quê, quando, company_id)
  - `agent-runtime/src/api/routes/metrics.py` — endpoint `/metrics` (Prometheus)
- **Conexões diretas:**
  - Serviços ↔ stack de observabilidade (Prometheus/Grafana/OTel)
  - Serviços ↔ Redis/DB (health checks e métricas de fila/latência)
- **Conexões indiretas:**
  - Hardening de integrações reduz incidentes e melhora KPIs técnicos (uptime/latência).
- **Relações com o código:**
  - Envolve todos os serviços e padroniza operação (SLOs, alertas, correlação por request/event id).
- **Áreas de impacto:**
  - Observabilidade, confiabilidade, segurança operacional, deploy, governança de incidentes.

---

## Roadmap Pós‑V1 (itens diferidos / evolução)

### EPIC-031 — V1.1: UX, tuning de prompts e métricas adicionais

#### 1. Definição & Justificativa
- **O que:** Iterar após V1 com melhorias de UX no dashboard, ajustes de prompts com feedback real e métricas adicionais por Centurion.
- **Por que:** V1 valida operação; V1.1 consolida eficiência e reduz fricções sem ampliar escopo estrutural.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L404` (roadmap V1.1)
  - `docs/business-context/05-escopo-v1.md#L406` (melhorias UX)
  - `docs/business-context/05-escopo-v1.md#L408` (métricas adicionais por Centurion)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-web/src/modules/metricas/**` (UX e novos gráficos)
  - `backoffice-api/src/modules/metrics/**` (novas agregações)
  - `backoffice-web/src/modules/centurions/**` (fluxos de edição/teste de prompt)
- **Novos arquivos a serem criados:**
  - `infra/experiments/**` — experimentos controlados (prompt tuning, A/B simples)
- **Conexões diretas:**
  - UI ↔ API (novas métricas)
- **Conexões indiretas:**
  - Melhorias de prompts impactam qualificação, follow-ups e handoff (KPIs).
- **Relações com o código:**
  - Refina módulos existentes sem alterar arquitetura macro.
- **Áreas de impacto:**
  - UX, métricas, produtividade operacional, qualidade da IA.

---

### EPIC-032 — V2: remarketing avançado, relatórios customizados, múltiplos CRMs e experimentação

#### 1. Definição & Justificativa
- **O que:** Expandir para V2 com remarketing avançado, automações/configurações mais ricas, relatórios customizados e suporte a múltiplos CRMs/integrações externas (ex.: HubSpot/Pipedrive), além de framework de experimentação (A/B prompts).
- **Por que:** Após validar V1, o ganho marginal vem de otimização, integrações e personalização por vertical.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L197` (itens diferidos para V2)
  - `docs/business-context/05-escopo-v1.md#L201` (remarketing avançado)
  - `docs/business-context/05-escopo-v1.md#L203` (relatórios customizados)
  - `docs/business-context/05-escopo-v1.md#L206` (integrações com CRMs externos)
  - `docs/business-context/05-escopo-v1.md#L410` (roadmap V2)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-api/src/modules/marketing/**` (remarketing e segmentação)
  - `agent-runtime/src/modules/tools/**` (conectores CRM)
  - `backoffice-web/src/modules/metricas/**` (relatórios customizados)
- **Novos arquivos a serem criados:**
  - `backoffice-api/src/modules/crm-integrations/**` — conectores e mapeamentos por CRM
  - `packages/connectors/**` — SDK interno de conectores (hubspot, pipedrive, etc.)
  - `infra/experiments/ab-testing/**` — framework de A/B para prompts/rules
- **Conexões diretas:**
  - Serviços ↔ CRMs externos (API keys, webhooks, rate limits)
- **Conexões indiretas:**
  - Mudanças em deals/handoff afetam métricas e marketing; necessidade de migrações e compatibilidade.
- **Relações com o código:**
  - Amplia bounded contexts (marketing/CRM) e exige contracts e observabilidade maduros.
- **Áreas de impacto:**
  - Integrações externas, dados/relatórios, experimentação, escalabilidade operacional.

---

### EPIC-033 — V3+: white-label, app mobile, multi-idioma e canais adicionais

#### 1. Definição & Justificativa
- **O que:** Evoluir para V3+ com white‑label para fronts, app mobile, multi‑idioma e canais adicionais (ex.: email), além de expansão de marketplace/templates.
- **Por que:** São features estratégicas de escala e distribuição, mas não necessárias para validar V1.
- **Referências arquiteturais:**
  - `docs/business-context/05-escopo-v1.md#L210` (diferido para V3+)
  - `docs/business-context/05-escopo-v1.md#L214` (app mobile)
  - `docs/business-context/05-escopo-v1.md#L216` (multi-idioma)
  - `docs/business-context/05-escopo-v1.md#L417` (roadmap V3)

#### 2. Impacto Técnico
- **Arquivos a serem modificados:**
  - `backoffice-web/**` (temas/branding, i18n)
  - `packages/contracts/**` (novos canais e contratos)
  - `agent-runtime/src/modules/channels/**` (novos adapters)
- **Novos arquivos a serem criados:**
  - `apps/mobile/**` — app mobile (se optar por monorepo)
  - `backoffice-web/src/i18n/**` — internacionalização
  - `agent-runtime/src/modules/channels/adapters/email_adapter.py` — canal email (se adotado)
- **Conexões diretas:**
  - Novos canais ↔ provedores externos (email/SMS/etc.)
- **Conexões indiretas:**
  - Requer maturidade de observabilidade/segurança para operação em escala.
- **Relações com o código:**
  - Expande camada de apresentação e canais; reforça necessidade de contratos e modularidade.
- **Áreas de impacto:**
  - Produto (white-label/mobile), internacionalização, integrações adicionais, governança e suporte.
