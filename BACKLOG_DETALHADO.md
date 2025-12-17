# Backlog Detalhado: Back-Office Multi-Tenant da Holding

> **Documento ID:** BACKLOG-DETALHADO-v1.0  
> **Sistema:** Back-Office Multi-Tenant da Holding  
> **Data de Criação:** 2025-12-16  
> **Última Atualização:** 2025-12-17  
> **Baseado em:** BACKLOG.md, Documentos de Arquitetura e Contexto de Negócio  
> **Status:** Auditado (2025-12-17)

---

## Sumário

1. [Introdução](#1-introdução)
2. [Fase 0 — Setup Base](#fase-0--setup-base)
3. [Fase 1 — Fundação](#fase-1--fundação)
4. [Fase 2 — Multi-Canal](#fase-2--multi-canal)
5. [Fase 3 — Centurions Avançados](#fase-3--centurions-avançados)
6. [Fase 4 — Memória](#fase-4--memória)
7. [Fase 5 — Tools & Extensibilidade](#fase-5--tools--extensibilidade)
8. [Fase 6 — Qualificação](#fase-6--qualificação)
9. [Fase 7 — Handoff & CRM + Contratos](#fase-7--handoff--crm--contratos)
10. [Fase 8 — Dashboard & Marketing](#fase-8--dashboard--marketing)
11. [Fase 9 — Refinamento](#fase-9--refinamento)
12. [Roadmap Pós-V1](#roadmap-pós-v1)
13. [Matriz de Dependências Consolidada](#13-matriz-de-dependências-consolidada)
14. [Glossário de Arquivos](#14-glossário-de-arquivos)

---

## 1. Introdução

### Propósito deste Documento

Este documento é um **mapa técnico-operacional completo** que expande o `BACKLOG.md` de alto nível para um guia de implementação detalhado. Cada EPIC é aprofundado com:

- **Subtasks granulares** com estimativas de esforço
- **Arquivos específicos** a criar/modificar com linhas estimadas
- **Dependências explícitas** entre tasks
- **Critérios de validação** por task
- **Checkpoints de fase** para validação progressiva
- **Referências documentais** com linhas específicas

### Convenções

| Símbolo | Significado |
|---------|-------------|
| 📁 | Arquivos a criar/modificar |
| 🔗 | Dependência de outra task |
| 📚 | Referência documental |
| ⚠️ | Critérios de validação |
| 🟢 | Low Risk |
| 🟡 | Medium Risk |
| 🔴 | High Risk |
| P0 | Prioridade crítica (bloqueia outras) |
| P1 | Prioridade alta |
| P2 | Prioridade média |

### Status de implementação (checkbox)

| Marca | Significado |
|-------|-------------|
| `[x]` | Concluída (implementação presente no repositório) |
| `[~]` | Parcial (implementado parcialmente / pendente de ajustes) |
| `[ ]` | Não implementada |

Obs.: tasks marcadas como concluídas indicam implementação no repositório; validações end-to-end com provedores externos dependem de credenciais/ambiente.

### Estrutura do Repositório (Alvo)

```
wolfgang-backoffice/
├── docker-compose.yml
├── .env.example
├── packages/
│   └── contracts/              # Tipos/eventos compartilhados
├── backoffice-web/             # Frontend Next.js
├── backoffice-api/             # API principal Nest.js
├── agent-runtime/              # Motor IA Python/Agno
├── evolution-manager/          # Serviço WhatsApp
├── autentique-service/         # Serviço de contratos
├── facebook-capi/              # Serviço de marketing
├── supabase/                   # Migrations e configs
├── infra/                      # Observabilidade e deploy
└── docs/                       # Documentação (existente)
```

---

## Fase 0 — Setup Base

**Objetivo:** Criar infraestrutura de desenvolvimento, estrutura de repositório e contratos de integração entre serviços.  
**EPICs:** EPIC-001, EPIC-002

---

### EPIC-001: Bootstrap do Repositório, Serviços e Ambiente Local

#### Definição & Justificativa

- **O que:** Criar a estrutura base do repositório monorepo com todos os serviços (`backoffice-web`, `backoffice-api`, `agent-runtime`, `evolution-manager`, `autentique-service`, `facebook-capi`), `docker-compose.yml` para ambiente local e `.env.example` padronizado.

- **Por que:** A arquitetura define uma solução distribuída com 6 serviços especializados. Sem padronização de estrutura, variáveis de ambiente e ambiente local, o desenvolvimento fica bloqueado. A consistência inicial evita retrabalho massivo nas fases seguintes.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 149-160) — Stack tecnológico
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 319-534) — Catálogo de serviços
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1751-1803) — Variáveis de ambiente
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1807-1888) — Docker Compose
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1594-1614) — Naming conventions

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `docker-compose.yml` | ~100 | Orquestração local de todos os serviços |
| `.env.example` | ~50 | Template de variáveis de ambiente |
| `backoffice-web/package.json` | ~40 | Config Next.js 14 + dependências |
| `backoffice-web/next.config.js` | ~20 | Configuração Next.js |
| `backoffice-web/tsconfig.json` | ~30 | Config TypeScript |
| `backoffice-api/package.json` | ~50 | Config Nest.js + dependências |
| `backoffice-api/nest-cli.json` | ~15 | Config CLI Nest.js |
| `backoffice-api/tsconfig.json` | ~30 | Config TypeScript |
| `agent-runtime/pyproject.toml` | ~40 | Config Python + dependências |
| `agent-runtime/requirements.txt` | ~30 | Dependências pip (backup) |
| `evolution-manager/package.json` | ~40 | Config Nest.js |
| `autentique-service/package.json` | ~40 | Config Nest.js |
| `facebook-capi/package.json` | ~40 | Config Nest.js |
| `packages/contracts/package.json` | ~20 | Package de tipos compartilhados |

**🔗 Conexões Diretas:**
- `docker-compose.yml` ↔️ Todos os serviços (ports, env, depends_on)
- Todos os serviços ↔️ Redis (via `REDIS_URL`)
- Todos os serviços ↔️ Supabase (via `SUPABASE_URL`, `DATABASE_URL`)

**🔗 Conexões Indiretas:**
- Convenções definidas aqui impactam CI/CD, deploy e observabilidade
- Estrutura de diretórios define padrões para todas as fases seguintes

**🎯 Áreas de Impacto:**
- [x] Infra local (Docker)
- [x] Configuração (env vars)
- [x] Organização do código (monorepo)
- [ ] Banco de Dados
- [ ] APIs/Endpoints
- [ ] UI/Frontend

---

#### Tasks Detalhadas

- [x] **[TASK-0.1.1]** Criar `docker-compose.yml` com serviços base
      ```
      📁 Arquivos:
         • Criar: docker-compose.yml (~100 linhas)
         • Criar: .dockerignore (~15 linhas)
      
      🔗 Depende de: Nada (task inicial)
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1807-1888)
      
      ⚠️ Validar:
         • docker-compose up inicia sem erros
         • Redis acessível em localhost:6379
         • Containers se comunicam na rede Docker
         • Healthchecks passando
      ```

- [x] **[TASK-0.1.2]** Criar `.env.example` com todas as variáveis
      ```
      📁 Arquivos:
         • Criar: .env.example (~50 linhas)
         • Criar: .gitignore atualizado (~30 linhas)
      
      🔗 Depende de: Nada
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1751-1803)
      
      ⚠️ Validar:
         • Todas as variáveis documentadas com comentários
         • Valores de exemplo para desenvolvimento
         • Nenhum secret real comitado
      ```

- [x] **[TASK-0.1.3]** Bootstrap `backoffice-web` (Next.js 14)
      ```
      📁 Arquivos:
         • Criar: backoffice-web/package.json (~40 linhas)
         • Criar: backoffice-web/next.config.js (~20 linhas)
         • Criar: backoffice-web/tsconfig.json (~30 linhas)
         • Criar: backoffice-web/src/app/layout.tsx (~20 linhas)
         • Criar: backoffice-web/src/app/page.tsx (~15 linhas)
         • Criar: backoffice-web/Dockerfile (~30 linhas)
      
      🔗 Depende de: TASK-0.1.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 330-371)
      
      ⚠️ Validar:
         • npm run dev inicia sem erros
         • Página inicial renderiza em localhost:3000
         • Build de produção compila
         • Container Docker funciona
      ```

- [x] **[TASK-0.1.4]** Bootstrap `backoffice-api` (Nest.js)
      ```
      📁 Arquivos:
         • Criar: backoffice-api/package.json (~50 linhas)
         • Criar: backoffice-api/nest-cli.json (~15 linhas)
         • Criar: backoffice-api/tsconfig.json (~30 linhas)
         • Criar: backoffice-api/src/main.ts (~30 linhas)
         • Criar: backoffice-api/src/app.module.ts (~20 linhas)
         • Criar: backoffice-api/Dockerfile (~35 linhas)
      
      🔗 Depende de: TASK-0.1.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 439-533)
      
      ⚠️ Validar:
         • npm run start:dev inicia sem erros
         • Endpoint /health retorna 200
         • Swagger disponível em /api/docs
         • Container Docker funciona
      ```

- [x] **[TASK-0.1.5]** Bootstrap `agent-runtime` (Python + Agno)
      ```
      📁 Arquivos:
         • Criar: agent-runtime/pyproject.toml (~40 linhas)
         • Criar: agent-runtime/requirements.txt (~30 linhas)
         • Criar: agent-runtime/src/main.py (~30 linhas)
         • Criar: agent-runtime/src/api/routes/health.py (~15 linhas)
         • Criar: agent-runtime/Dockerfile (~35 linhas)
      
      🔗 Depende de: TASK-0.1.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 246-268)
      
      ⚠️ Validar:
         • python -m uvicorn main:app inicia sem erros
         • Endpoint /health retorna 200
         • Container Docker funciona
         • Dependências instaladas corretamente
      ```

- [x] **[TASK-0.1.6]** Bootstrap `evolution-manager` (Nest.js)
      ```
      📁 Arquivos:
         • Criar: evolution-manager/package.json (~40 linhas)
         • Criar: evolution-manager/src/main.ts (~25 linhas)
         • Criar: evolution-manager/src/app.module.ts (~20 linhas)
         • Criar: evolution-manager/Dockerfile (~30 linhas)
      
      🔗 Depende de: TASK-0.1.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 783-905)
      
      ⚠️ Validar:
         • Serviço inicia sem erros
         • Endpoint /health retorna 200
         • Container Docker funciona
      ```

- [x] **[TASK-0.1.7]** Bootstrap `autentique-service` (Nest.js)
      ```
      📁 Arquivos:
         • Criar: autentique-service/package.json (~40 linhas)
         • Criar: autentique-service/src/main.ts (~25 linhas)
         • Criar: autentique-service/src/app.module.ts (~20 linhas)
         • Criar: autentique-service/Dockerfile (~30 linhas)
      
      🔗 Depende de: TASK-0.1.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 908-998)
      
      ⚠️ Validar:
         • Serviço inicia sem erros
         • Endpoint /health retorna 200
         • Container Docker funciona
      ```

- [x] **[TASK-0.1.8]** Bootstrap `facebook-capi` (Nest.js)
      ```
      📁 Arquivos:
         • Criar: facebook-capi/package.json (~40 linhas)
         • Criar: facebook-capi/src/main.ts (~25 linhas)
         • Criar: facebook-capi/src/app.module.ts (~20 linhas)
         • Criar: facebook-capi/Dockerfile (~30 linhas)
      
      🔗 Depende de: TASK-0.1.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1001-1105)
      
      ⚠️ Validar:
         • Serviço inicia sem erros
         • Endpoint /health retorna 200
         • Container Docker funciona
      ```

- [x] **[TASK-0.1.9]** Bootstrap `packages/contracts` (Tipos compartilhados)
      ```
      📁 Arquivos:
         • Criar: packages/contracts/package.json (~20 linhas)
         • Criar: packages/contracts/tsconfig.json (~20 linhas)
         • Criar: packages/contracts/src/index.ts (~10 linhas)
      
      🔗 Depende de: Nada
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1346-1354)
      
      ⚠️ Validar:
         • npm run build compila sem erros
         • Exports funcionam em outros serviços
      ```

**✅ CHECKPOINT EPIC-001:**
- [ ] Todos os serviços iniciam via `docker-compose up`
- [ ] Healthchecks de todos os serviços passando
- [ ] Redis operacional e acessível
- [ ] Estrutura de diretórios conforme arquitetura
- [ ] README com instruções de setup atualizado

---

### EPIC-002: Contratos de Integração e Padrões Cross-Cutting

#### Definição & Justificativa

- **O que:** Formalizar contratos entre serviços (eventos Redis, payloads, nomes de canais) e estabelecer padrões mínimos replicáveis por serviço (logging estruturado, error handling, estratégia de testes).

- **Por que:** A arquitetura privilegia comunicação event-driven via Redis Pub/Sub. Sem contratos explícitos, integrações quebram, geram drift entre serviços e dificultam depuração e testes. Padrões definidos agora evitam inconsistências em todas as fases.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1312-1354) — Event-driven patterns
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1346-1354) — Canais e payloads
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1634-1656) — Estratégia de testes
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1659-1689) — Logging e errors

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `docs/architecture/event-catalog.md` | ~200 | Catálogo de eventos do sistema |
| `packages/contracts/src/events/index.ts` | ~50 | Exports de eventos |
| `packages/contracts/src/events/message-received.ts` | ~40 | Schema do evento |
| `packages/contracts/src/events/message-sent.ts` | ~40 | Schema do evento |
| `packages/contracts/src/events/lead-created.ts` | ~35 | Schema do evento |
| `packages/contracts/src/events/lead-qualified.ts` | ~40 | Schema do evento |
| `packages/contracts/src/events/contract-signed.ts` | ~35 | Schema do evento |
| `packages/contracts/src/channels.ts` | ~30 | Constantes de canais Redis |
| `packages/contracts/src/errors/index.ts` | ~60 | Hierarquia de erros |
| `packages/contracts/src/dto/inbound-message.ts` | ~50 | DTO de mensagem inbound |
| `packages/contracts/src/dto/outbound-message.ts` | ~45 | DTO de mensagem outbound |

**🔗 Conexões Diretas:**
- Todos os serviços ↔️ `packages/contracts` (importam tipos/eventos)
- Producers/Consumers ↔️ Redis (usam canais definidos)

**🔗 Conexões Indiretas:**
- WebSocket/real-time depende de eventos padronizados
- Observabilidade depende de contexto consistente nos logs

**🎯 Áreas de Impacto:**
- [x] Mensageria (Redis Pub/Sub)
- [x] Validação (DTO/schema)
- [x] Qualidade (testes)
- [x] Observabilidade (logs/erros)
- [ ] Banco de Dados
- [ ] UI/Frontend

---

#### Tasks Detalhadas

- [x] **[TASK-0.2.1]** Definir catálogo de eventos em documentação
      ```
      📁 Arquivos:
         • Criar: docs/architecture/event-catalog.md (~200 linhas)
      
      🔗 Depende de: Nada
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1346-1354)
      
      ⚠️ Validar:
         • Todos os eventos do sistema documentados
         • Schema JSON de cada evento definido
         • Exemplos de payload incluídos
         • Regras de idempotência documentadas
      ```

- [x] **[TASK-0.2.2]** Implementar tipos de eventos em `packages/contracts`
      ```
      📁 Arquivos:
         • Criar: packages/contracts/src/events/index.ts (~50 linhas)
         • Criar: packages/contracts/src/events/message-received.ts (~40 linhas)
         • Criar: packages/contracts/src/events/message-sent.ts (~40 linhas)
         • Criar: packages/contracts/src/events/lead-created.ts (~35 linhas)
         • Criar: packages/contracts/src/events/lead-qualified.ts (~40 linhas)
         • Criar: packages/contracts/src/events/contract-signed.ts (~35 linhas)
         • Criar: packages/contracts/src/events/instance-status.ts (~30 linhas)
      
      🔗 Depende de: TASK-0.2.1, TASK-0.1.9
      
      📚 Referência: docs/business-context/04-ciclo-de-vida.md (linhas 256-282)
      
      ⚠️ Validar:
         • Tipos TypeScript compilam sem erros
         • Interfaces exportadas corretamente
         • Zod schemas para validação runtime
      ```

- [x] **[TASK-0.2.3]** Definir constantes de canais Redis
      ```
      📁 Arquivos:
         • Criar: packages/contracts/src/channels.ts (~30 linhas)
      
      🔗 Depende de: TASK-0.2.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1346-1354)
      
      ⚠️ Validar:
         • Canais: message.received, message.sent, lead.created, lead.qualified, contract.signed
         • Padrão de nomeação consistente
         • Exportados como constantes imutáveis
      ```

- [x] **[TASK-0.2.4]** Implementar DTOs compartilhados
      ```
      📁 Arquivos:
         • Criar: packages/contracts/src/dto/index.ts (~20 linhas)
         • Criar: packages/contracts/src/dto/inbound-message.ts (~50 linhas)
         • Criar: packages/contracts/src/dto/outbound-message.ts (~45 linhas)
         • Criar: packages/contracts/src/dto/lead.ts (~60 linhas)
         • Criar: packages/contracts/src/dto/qualification.ts (~40 linhas)
      
      🔗 Depende de: TASK-0.1.9
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 324-355)
      
      ⚠️ Validar:
         • DTOs consistentes com modelo de dados
         • Validação Zod implementada
         • Exports funcionando
      ```

- [x] **[TASK-0.2.5]** Definir hierarquia de erros compartilhada
      ```
      📁 Arquivos:
         • Criar: packages/contracts/src/errors/index.ts (~60 linhas)
         • Criar: packages/contracts/src/errors/domain-error.ts (~25 linhas)
         • Criar: packages/contracts/src/errors/validation-error.ts (~20 linhas)
         • Criar: packages/contracts/src/errors/not-found-error.ts (~20 linhas)
      
      🔗 Depende de: TASK-0.1.9
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1672-1689)
      
      ⚠️ Validar:
         • Hierarquia: DomainError > ValidationError, NotFoundError, etc.
         • Propriedade `code` para identificação
         • Serialização consistente
      ```

- [x] **[TASK-0.2.6]** Implementar padrão de logging para Nest.js
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/common/logging/logger.service.ts (~80 linhas)
         • Criar: backoffice-api/src/common/interceptors/logging.interceptor.ts (~60 linhas)
      
      🔗 Depende de: TASK-0.1.4
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1659-1670)
      
      ⚠️ Validar:
         • Logs JSON estruturados
         • Campos: service, module, company_id, duration_ms
         • Request-ID propagado
      ```

- [x] **[TASK-0.2.7]** Implementar padrão de logging para Python
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/common/config/logging.py (~70 linhas)
         • Criar: agent-runtime/src/common/middleware/logging.py (~50 linhas)
      
      🔗 Depende de: TASK-0.1.5
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 1461-1483)
      
      ⚠️ Validar:
         • Logs JSON estruturados
         • Campos consistentes com Nest.js
         • Correlation ID propagado
      ```

- [x] **[TASK-0.2.8]** Criar estrutura de testes por serviço
      ```
      📁 Arquivos:
         • Criar: backoffice-api/jest.config.ts (~30 linhas)
         • Criar: backoffice-api/src/__tests__/setup.ts (~25 linhas)
         • Criar: agent-runtime/pytest.ini (~15 linhas)
         • Criar: agent-runtime/tests/conftest.py (~30 linhas)
         • Criar: packages/contracts/jest.config.js (~20 linhas)
      
      🔗 Depende de: TASK-0.1.4, TASK-0.1.5, TASK-0.1.9
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1634-1656)
      
      ⚠️ Validar:
         • npm test roda sem erros
         • pytest roda sem erros
         • Cobertura mínima configurada
      ```

**✅ CHECKPOINT EPIC-002:**
- [ ] `packages/contracts` publicável e importável
- [ ] Todos os eventos críticos tipados
- [ ] Canais Redis definidos como constantes
- [ ] Logging estruturado em todos os serviços
- [ ] Testes executam em todos os serviços

---

**✅ CHECKPOINT FASE 0:**
- [ ] Repositório estruturado conforme arquitetura
- [ ] Todos os serviços iniciam via Docker Compose
- [ ] Contratos de eventos definidos e tipados
- [ ] Padrões cross-cutting implementados
- [ ] README.md atualizado com instruções
- [ ] Code review aprovado por lead técnico

---

## Fase 1 — Fundação

**Objetivo:** Implementar o schema CORE do banco de dados, segurança multi-tenant (RLS), bootstrap da Backoffice API e governança de empresas.  
**EPICs:** EPIC-003, EPIC-004, EPIC-005, EPIC-006, EPIC-007

---

### EPIC-003: Modelo de Dados CORE + Migrations + pgvector

#### Definição & Justificativa

- **O que:** Implementar o schema `core` no PostgreSQL (Supabase) com tabelas essenciais: `companies`, `company_users`, `company_crms`, `leads`, `conversations`, `messages`, `centurion_configs`, `channel_instances`, `contract_templates`, `pixel_configs`, `lead_memories`, `lead_graphs`. Habilitar extensão `pgvector` para RAG.

- **Por que:** O domínio exige que "leads sempre nascem no CORE" e isolamento multi-tenant. Sem o schema CORE não existe qualificação, métricas, handoff nem tracking. É a fundação de todo o sistema.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1108-1168) — Visão geral schemas
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1174-1226) — core.leads
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 34-66) — core.companies
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 69-129) — core.leads
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 296-326) — lead_memories/graphs

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `supabase/migrations/00001_create_core_schema.sql` | ~50 | Criação do schema |
| `supabase/migrations/00002_core_companies.sql` | ~40 | Tabela companies |
| `supabase/migrations/00003_core_company_users.sql` | ~35 | Usuários por empresa |
| `supabase/migrations/00004_core_company_crms.sql` | ~30 | Mapping empresa→schema |
| `supabase/migrations/00005_core_leads.sql` | ~80 | Tabela de leads |
| `supabase/migrations/00006_core_centurion_configs.sql` | ~100 | Configs de IA |
| `supabase/migrations/00007_core_channel_instances.sql` | ~60 | Instâncias multi-canal |
| `supabase/migrations/00008_core_conversations.sql` | ~70 | Conversas e debounce |
| `supabase/migrations/00009_core_messages.sql` | ~50 | Mensagens |
| `supabase/migrations/00010_enable_pgvector.sql` | ~10 | Extensão vector |
| `supabase/migrations/00011_core_lead_memories.sql` | ~50 | Memória RAG |
| `supabase/migrations/00012_core_lead_graphs.sql` | ~45 | Memória grafo |
| `supabase/migrations/00013_core_indexes.sql` | ~60 | Índices otimizados |
| `supabase/seed.sql` | ~100 | Seed de desenvolvimento |
| `supabase/README.md` | ~50 | Documentação local |

**🔗 Conexões Diretas:**
- `backoffice-api` ↔️ Postgres (CRUD administrativo)
- `agent-runtime` ↔️ Postgres (persistência e memória)

**🎯 Áreas de Impacto:**
- [x] Banco de Dados (schemas/tabelas/índices/extensões)
- [ ] APIs/Endpoints
- [ ] UI/Frontend

---

#### Tasks Detalhadas

- [x] **[TASK-1.3.1]** Criar schema `core` e estrutura base
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00001_create_core_schema.sql (~50 linhas)
         • Criar: supabase/config.toml (~30 linhas)
         • Criar: supabase/README.md (~50 linhas)
      
      🔗 Depende de: TASK-0.1.1 (Docker com Supabase)
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1108-1136)
      
      ⚠️ Validar:
         • supabase db push executa sem erros
         • Schema `core` criado no banco
         • Extensões básicas habilitadas
      ```

- [x] **[TASK-1.3.2]** Implementar `core.companies` e `core.company_users`
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00002_core_companies.sql (~40 linhas)
         • Criar: supabase/migrations/00003_core_company_users.sql (~35 linhas)
         • Criar: supabase/migrations/00004_core_company_crms.sql (~30 linhas)
      
      🔗 Depende de: TASK-1.3.1
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 34-66)
      
      ⚠️ Validar:
         • Constraint UNIQUE em slug
         • FK para auth.users funciona
         • Índices criados
      ```

- [x] **[TASK-1.3.3]** Implementar `core.leads` com tracking completo
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00005_core_leads.sql (~80 linhas)
      
      🔗 Depende de: TASK-1.3.2
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 69-129)
      
      ⚠️ Validar:
         • company_id NOT NULL
         • UNIQUE(company_id, phone)
         • Campos de UTM completos
         • Índices de busca criados
      ```

- [x] **[TASK-1.3.4]** Implementar `core.centurion_configs`
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00006_core_centurion_configs.sql (~100 linhas)
      
      🔗 Depende de: TASK-1.3.2
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 132-190)
      
      ⚠️ Validar:
         • Campos de capacidade (can_send_*, can_process_*)
         • Campos de humanização (chunking, debounce)
         • UNIQUE(company_id, slug)
         • JSONB para qualification_rules
      ```

- [x] **[TASK-1.3.5]** Implementar `core.channel_instances`
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00007_core_channel_instances.sql (~60 linhas)
      
      🔗 Depende de: TASK-1.3.2
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 198-230)
      
      ⚠️ Validar:
         • channel_type enum (whatsapp, instagram, telegram)
         • UNIQUE(instance_name)
         • Campos específicos por canal
      ```

- [x] **[TASK-1.3.6]** Implementar `core.conversations` e `core.messages`
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00008_core_conversations.sql (~70 linhas)
         • Criar: supabase/migrations/00009_core_messages.sql (~50 linhas)
      
      🔗 Depende de: TASK-1.3.3, TASK-1.3.4
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 234-291)
      
      ⚠️ Validar:
         • debounce_state em conversations
         • audio_transcription em messages
         • image_description em messages
         • Índices por conversation_id e lead_id
      ```

- [x] **[TASK-1.3.7]** Habilitar pgvector e criar tabelas de memória
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00010_enable_pgvector.sql (~10 linhas)
         • Criar: supabase/migrations/00011_core_lead_memories.sql (~50 linhas)
         • Criar: supabase/migrations/00012_core_lead_graphs.sql (~45 linhas)
      
      🔗 Depende de: TASK-1.3.3
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 296-357)
      
      ⚠️ Validar:
         • Extensão vector habilitada
         • Coluna embeddings vector(1536)
         • Índice ivfflat criado
         • JSONB para nodes/relationships
      ```

- [x] **[TASK-1.3.8]** Criar índices otimizados e seed de desenvolvimento
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00013_core_indexes.sql (~60 linhas)
         • Criar: supabase/seed.sql (~100 linhas)
      
      🔗 Depende de: TASK-1.3.6, TASK-1.3.7
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 869-893)
      
      ⚠️ Validar:
         • Índices compostos para queries principais
         • Seed insere empresa de teste
         • Seed insere centurion de teste
      ```

**✅ CHECKPOINT EPIC-003:**
- [ ] Schema `core` completo no Supabase
- [ ] pgvector habilitado e funcional
- [ ] Seed de desenvolvimento executa
- [ ] Todas as tabelas com índices
- [ ] Migration reversível (down scripts)

---

### EPIC-004: Segurança Multi-Tenant (JWT + RLS + Storage)

#### Definição & Justificativa

- **O que:** Implementar autenticação JWT com claims padronizadas, hierarquia de roles, políticas de Row Level Security por `company_id` em todas as tabelas operacionais, e segurança de Storage (buckets de arquivos).

- **Por que:** Multi-tenancy exige isolamento absoluto. Uma empresa NUNCA pode ver dados de outra. Falhas de RLS são risco crítico de segurança e compliance. "Security-first" evita retrabalho massivo.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1529-1588) — JWT e RLS
  - 📄 `docs/business-context/02-mapa-de-atores.md` (linhas 355-379) — Hierarquia de roles
  - 📄 `docs/architecture/arch-micro-backoffice-api.md` (linhas 299-323) — Guards flow

#### Impacto Técnico & Arquitetural

**Arquivos a criar/modificar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `supabase/migrations/00020_rls_companies.sql` | ~40 | RLS para companies |
| `supabase/migrations/00021_rls_leads.sql` | ~50 | RLS para leads |
| `supabase/migrations/00022_rls_centurions.sql` | ~45 | RLS para configs |
| `supabase/migrations/00023_rls_conversations.sql` | ~50 | RLS para conversas |
| `supabase/migrations/00024_rls_storage.sql` | ~40 | Policies de bucket |
| `backoffice-api/src/common/guards/jwt-auth.guard.ts` | ~50 | Guard de JWT |
| `backoffice-api/src/common/guards/roles.guard.ts` | ~60 | Guard de roles |
| `backoffice-api/src/common/decorators/current-user.decorator.ts` | ~20 | Extrai user |
| `backoffice-api/src/common/decorators/roles.decorator.ts` | ~15 | Define roles |

**🔗 Conexões Diretas:**
- Backoffice Web ↔️ Backoffice API (auth + RBAC)
- Backoffice API ↔️ Supabase Auth/Postgres

**🎯 Áreas de Impacto:**
- [x] Banco de Dados (RLS)
- [x] APIs/Endpoints (Guards)
- [x] UI/Frontend (gates de rota)
- [x] Autenticação/Autorização

---

#### Tasks Detalhadas

- [x] **[TASK-1.4.1]** Implementar JWT strategy e auth guard
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/auth/strategies/jwt.strategy.ts (~60 linhas)
         • Criar: backoffice-api/src/common/guards/jwt-auth.guard.ts (~50 linhas)
         • Criar: backoffice-api/src/common/decorators/current-user.decorator.ts (~20 linhas)
      
      🔗 Depende de: TASK-0.1.4
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 920-946)
      
      ⚠️ Validar:
         • Token inválido retorna 401
         • Token expirado retorna 401
         • Claims extraídos corretamente
         • @CurrentUser() injeta payload
      ```

- [x] **[TASK-1.4.2]** Implementar roles guard e decorator
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/common/guards/roles.guard.ts (~60 linhas)
         • Criar: backoffice-api/src/common/decorators/roles.decorator.ts (~15 linhas)
         • Criar: backoffice-api/src/common/enums/user-role.enum.ts (~15 linhas)
      
      🔗 Depende de: TASK-1.4.1
      
      📚 Referência: docs/business-context/02-mapa-de-atores.md (linhas 355-379)
      
      ⚠️ Validar:
         • @Roles('backoffice_admin') funciona
         • Role insuficiente retorna 403
         • super_admin tem acesso a tudo
      ```

- [x] **[TASK-1.4.3]** Implementar company guard (escopo por empresa)
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/common/guards/company.guard.ts (~70 linhas)
      
      🔗 Depende de: TASK-1.4.2
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 299-323)
      
      ⚠️ Validar:
         • backoffice_admin acessa todas empresas
         • ai_supervisor acessa só sua empresa
         • Mismatch de company_id retorna 403
      ```

- [x] **[TASK-1.4.4]** Criar RLS policies para tabelas CORE
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00020_rls_companies.sql (~40 linhas)
         • Criar: supabase/migrations/00021_rls_leads.sql (~50 linhas)
         • Criar: supabase/migrations/00022_rls_centurions.sql (~45 linhas)
         • Criar: supabase/migrations/00023_rls_conversations.sql (~50 linhas)
      
      🔗 Depende de: TASK-1.3.8
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1557-1573)
      
      ⚠️ Validar:
         • User com company_id A não vê dados de B
         • backoffice_admin vê tudo
         • Queries diretas no banco respeitam RLS
      ```

- [x] **[TASK-1.4.5]** Criar RLS policies para Storage
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00024_rls_storage.sql (~40 linhas)
         • Criar: supabase/migrations/00025_create_buckets.sql (~30 linhas)
      
      🔗 Depende de: TASK-1.4.4
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1575-1588)
      
      ⚠️ Validar:
         • Bucket `knowledge_base` criado
         • Bucket `deal_files` criado
         • Upload só no path da empresa
         • Download só da própria empresa
      ```

- [x] **[TASK-1.4.6]** Criar testes automatizados de RLS
      ```
      📁 Arquivos:
         • Criar: supabase/tests/rls/leads_isolation.test.sql (~80 linhas)
         • Criar: supabase/tests/rls/cross_tenant.test.sql (~60 linhas)
      
      🔗 Depende de: TASK-1.4.4
      
      📚 Referência: docs/business-context/05-escopo-v1.md (linhas 273, 294)
      
      ⚠️ Validar:
         • Teste: user A não vê lead de company B
         • Teste: backoffice_admin vê todos
         • Teste: insert em company errada falha
         • Todos os testes passam em CI
      ```

**✅ CHECKPOINT EPIC-004:**
- [ ] JWT auth funcional com claims corretos
- [ ] Guards de role e company implementados
- [ ] RLS em todas as tabelas operacionais
- [ ] Storage com políticas por empresa
- [ ] Testes de isolamento passando

---

### EPIC-005: Backoffice API Bootstrap + Infraestrutura

#### Definição & Justificativa

- **O que:** Estruturar completamente o `backoffice-api` com módulos de infraestrutura (Supabase client, Redis client, EventBus), exception handling global, OpenAPI/Swagger e módulo de Auth completo.

- **Por que:** O frontend depende de uma API bem estruturada. A documentação OpenAPI é essencial para desenvolvimento paralelo. Os clients de infraestrutura são usados por todos os módulos de domínio.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-backoffice-api.md` (linhas 15-80) — Propósito e capacidades
  - 📄 `docs/architecture/arch-micro-backoffice-api.md` (linhas 163-199) — Estrutura de arquivos
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 517-524) — Infra modules

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `backoffice-api/src/infrastructure/supabase/supabase.module.ts` | ~25 | Module DI |
| `backoffice-api/src/infrastructure/supabase/supabase.service.ts` | ~80 | Client wrapper |
| `backoffice-api/src/infrastructure/redis/redis.module.ts` | ~25 | Module DI |
| `backoffice-api/src/infrastructure/redis/redis.service.ts` | ~100 | Client + pub/sub |
| `backoffice-api/src/infrastructure/messaging/event-bus.service.ts` | ~80 | Abstração eventos |
| `backoffice-api/src/common/filters/global-exception.filter.ts` | ~70 | Error handling |
| `backoffice-api/src/modules/auth/auth.module.ts` | ~30 | Module auth |
| `backoffice-api/src/modules/auth/controllers/auth.controller.ts` | ~80 | Endpoints auth |
| `backoffice-api/src/modules/auth/services/auth.service.ts` | ~120 | Lógica auth |

---

#### Tasks Detalhadas

- [x] **[TASK-1.5.1]** Implementar Supabase module e service
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/infrastructure/supabase/supabase.module.ts (~25 linhas)
         • Criar: backoffice-api/src/infrastructure/supabase/supabase.service.ts (~80 linhas)
         • Criar: backoffice-api/src/config/supabase.config.ts (~30 linhas)
      
      🔗 Depende de: TASK-0.1.4, TASK-1.3.8
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 517-524)
      
      ⚠️ Validar:
         • Conexão com Supabase funciona
         • Query simples retorna dados
         • Service injetável em outros modules
      ```

- [x] **[TASK-1.5.2]** Implementar Redis module e service
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/infrastructure/redis/redis.module.ts (~25 linhas)
         • Criar: backoffice-api/src/infrastructure/redis/redis.service.ts (~100 linhas)
         • Criar: backoffice-api/src/config/redis.config.ts (~25 linhas)
      
      🔗 Depende de: TASK-0.1.4
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1312-1343)
      
      ⚠️ Validar:
         • Conexão com Redis funciona
         • get/set/publish funcionam
         • TTL aplicado corretamente
      ```

- [x] **[TASK-1.5.3]** Implementar EventBus service
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/infrastructure/messaging/event-bus.service.ts (~80 linhas)
      
      🔗 Depende de: TASK-1.5.2, TASK-0.2.2
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1346-1354)
      
      ⚠️ Validar:
         • publish() envia para canal correto
         • subscribe() recebe eventos
         • Tipos de packages/contracts usados
      ```

- [x] **[TASK-1.5.4]** Implementar Global Exception Filter
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/common/filters/global-exception.filter.ts (~70 linhas)
         • Modificar: backoffice-api/src/main.ts (adicionar filter global)
      
      🔗 Depende de: TASK-0.2.5
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 951-998)
      
      ⚠️ Validar:
         • DomainError retorna 422
         • HttpException preserva status
         • Log estruturado gerado
         • Response padronizada
      ```

- [x] **[TASK-1.5.5]** Configurar OpenAPI/Swagger
      ```
      📁 Arquivos:
         • Modificar: backoffice-api/src/main.ts (~30 linhas adicionais)
      
      🔗 Depende de: TASK-0.1.4
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 1180-1198)
      
      ⚠️ Validar:
         • /api/docs acessível
         • Todos os endpoints documentados
         • BearerAuth configurado
         • Tags organizadas
      ```

- [x] **[TASK-1.5.6]** Implementar Auth module completo
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/auth/auth.module.ts (~30 linhas)
         • Criar: backoffice-api/src/modules/auth/controllers/auth.controller.ts (~80 linhas)
         • Criar: backoffice-api/src/modules/auth/services/auth.service.ts (~120 linhas)
         • Criar: backoffice-api/src/modules/auth/dto/login.dto.ts (~25 linhas)
         • Criar: backoffice-api/src/modules/auth/dto/auth-response.dto.ts (~20 linhas)
      
      🔗 Depende de: TASK-1.4.1, TASK-1.5.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 205-214)
      
      ⚠️ Validar:
         • POST /auth/login retorna token
         • POST /auth/refresh renova token
         • GET /auth/me retorna dados do user
         • Testes unitários passando
      ```

**✅ CHECKPOINT EPIC-005:**
- [ ] Infraestrutura (Supabase/Redis) injetável
- [ ] EventBus publicando/assinando eventos
- [ ] Exception handling global funcionando
- [ ] Swagger disponível com docs completas
- [ ] Auth module testado e funcional

---

### EPIC-006: Governança (Empresas, Usuários, Provisionamento)

#### Definição & Justificativa

- **O que:** Implementar CRUD de empresas, gestão de usuários por empresa, e provisionamento automático de schema (clonando `_template_base`) quando uma empresa é criada.

- **Por que:** É requisito P0 do V1. Sem "criar empresa em um clique", não existe escalabilidade. O provisionamento automático garante isolamento correto e consistente.

- **Referências arquiteturais:**
  - 📄 `docs/business-context/05-escopo-v1.md` (linhas 32-41) — Governança P0
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1131-1148) — Template base
  - 📄 `docs/architecture/arch-micro-backoffice-api.md` (linhas 216-228) — Endpoints companies

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `supabase/migrations/00030_template_base_schema.sql` | ~100 | Schema template |
| `supabase/migrations/00031_provision_schema_function.sql` | ~80 | Função de provisioning |
| `backoffice-api/src/modules/companies/companies.module.ts` | ~30 | Module |
| `backoffice-api/src/modules/companies/controllers/companies.controller.ts` | ~120 | Controller |
| `backoffice-api/src/modules/companies/services/companies.service.ts` | ~200 | Service |
| `backoffice-api/src/modules/companies/services/schema-provisioner.service.ts` | ~100 | Provisioning |
| `backoffice-api/src/modules/companies/repository/companies.repository.ts` | ~80 | Repository |

---

#### Tasks Detalhadas

- [x] **[TASK-1.6.1]** Criar schema `_template_base`
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00030_template_base_schema.sql (~100 linhas)
      
      🔗 Depende de: TASK-1.3.8
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 683-795)
      
      ⚠️ Validar:
         • Schema _template_base existe
         • Tabelas: deals, services, equipe, contratos
         • FK para core.companies funciona
         • Índices criados
      ```

- [x] **[TASK-1.6.2]** Criar função de provisionamento de schema
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00031_provision_schema_function.sql (~80 linhas)
      
      🔗 Depende de: TASK-1.6.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1131-1148)
      
      ⚠️ Validar:
         • fn_provision_company_schema(slug) cria schema
         • Tabelas clonadas de _template_base
         • RLS aplicado no novo schema
         • Grants configurados
      ```

- [x] **[TASK-1.6.3]** Implementar companies module (controller + service)
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/companies/companies.module.ts (~30 linhas)
         • Criar: backoffice-api/src/modules/companies/controllers/companies.controller.ts (~120 linhas)
         • Criar: backoffice-api/src/modules/companies/services/companies.service.ts (~200 linhas)
         • Criar: backoffice-api/src/modules/companies/dto/create-company.dto.ts (~30 linhas)
         • Criar: backoffice-api/src/modules/companies/dto/update-company.dto.ts (~25 linhas)
         • Criar: backoffice-api/src/modules/companies/dto/company-response.dto.ts (~35 linhas)
      
      🔗 Depende de: TASK-1.5.6, TASK-1.4.2
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 329-376)
      
      ⚠️ Validar:
         • GET /companies lista empresas
         • POST /companies cria empresa
         • GET /companies/:id retorna detalhes
         • PATCH /companies/:id atualiza
         • Guards de role funcionando
      ```

- [x] **[TASK-1.6.4]** Implementar schema provisioner service
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/companies/services/schema-provisioner.service.ts (~100 linhas)
      
      🔗 Depende de: TASK-1.6.2, TASK-1.6.3
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 436-478)
      
      ⚠️ Validar:
         • Ao criar empresa, schema é provisionado
         • company_crms é populado
         • Schema existe no banco
         • RLS funciona no novo schema
      ```

- [x] **[TASK-1.6.5]** Implementar company-users management
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/companies/controllers/company-users.controller.ts (~80 linhas)
         • Criar: backoffice-api/src/modules/companies/services/company-users.service.ts (~100 linhas)
         • Criar: backoffice-api/src/modules/companies/dto/add-user.dto.ts (~20 linhas)
      
      🔗 Depende de: TASK-1.6.3
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 220-228)
      
      ⚠️ Validar:
         • GET /companies/:id/users lista
         • POST /companies/:id/users adiciona
         • DELETE /companies/:id/users/:userId remove
         • Vínculo com auth.users funciona
      ```

**✅ CHECKPOINT EPIC-006:**
- [ ] CRUD de empresas completo
- [ ] Provisionamento automático funcional
- [ ] Gestão de usuários por empresa
- [ ] Novo schema criado ao criar empresa
- [ ] RLS aplicado automaticamente

---

### EPIC-007: Backoffice Web Bootstrap + Auth + Governança UI

#### Definição & Justificativa

- **O que:** Criar o frontend `backoffice-web` (Next.js 14) com rotas de autenticação, layout de dashboard, middleware de proteção e telas de governança (empresas e usuários).

- **Por que:** O dono da holding opera via UI. Sem interface, não há validação do fluxo. A UI de governança é a primeira a ser usada e define padrões para todas as outras telas.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 319-425) — SVC-001 Backoffice Web
  - 📄 `docs/business-context/05-escopo-v1.md` (linhas 41) — Entregável governança

---

#### Tasks Detalhadas

- [x] **[TASK-1.7.1]** Setup TailwindCSS + ShadcnUI
      ```
      📁 Arquivos:
         • Modificar: backoffice-web/package.json (deps)
         • Criar: backoffice-web/tailwind.config.ts (~40 linhas)
         • Criar: backoffice-web/components.json (~20 linhas)
         • Criar: backoffice-web/src/styles/globals.css (~50 linhas)
      
      🔗 Depende de: TASK-0.1.3
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 364-367)
      
      ⚠️ Validar:
         • Tailwind classes funcionam
         • ShadcnUI components instaláveis
         • Dark mode configurado
      ```

- [x] **[TASK-1.7.2]** Implementar API client e auth utilities
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/lib/api/client.ts (~80 linhas)
         • Criar: backoffice-web/src/lib/api/auth.ts (~60 linhas)
         • Criar: backoffice-web/src/lib/auth/session.ts (~50 linhas)
         • Criar: backoffice-web/src/lib/auth/hooks.ts (~40 linhas)
      
      🔗 Depende de: TASK-1.7.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 358-363)
      
      ⚠️ Validar:
         • Fetch com interceptor de auth
         • Token refresh automático
         • useAuth hook funcional
      ```

- [x] **[TASK-1.7.3]** Implementar rotas de autenticação
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(auth)/login/page.tsx (~100 linhas)
         • Criar: backoffice-web/src/app/(auth)/forgot-password/page.tsx (~80 linhas)
         • Criar: backoffice-web/src/app/(auth)/layout.tsx (~30 linhas)
      
      🔗 Depende de: TASK-1.7.2
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 336-337)
      
      ⚠️ Validar:
         • Login form funcional
         • Redirect após login
         • Error handling visual
         • Loading states
      ```

- [x] **[TASK-1.7.4]** Implementar middleware de proteção
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/middleware.ts (~60 linhas)
      
      🔗 Depende de: TASK-1.7.2
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 273-274)
      
      ⚠️ Validar:
         • Rotas /dashboard/* protegidas
         • Redirect para /login se não autenticado
         • Token válido permite acesso
      ```

- [x] **[TASK-1.7.5]** Implementar layout de dashboard
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/layout.tsx (~80 linhas)
         • Criar: backoffice-web/src/components/layout/sidebar.tsx (~120 linhas)
         • Criar: backoffice-web/src/components/layout/header.tsx (~60 linhas)
         • Criar: backoffice-web/src/components/layout/nav-items.tsx (~50 linhas)
      
      🔗 Depende de: TASK-1.7.4
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 338-344)
      
      ⚠️ Validar:
         • Sidebar com navegação
         • Header com user info
         • Responsive design
         • Dark mode toggle
      ```

- [x] **[TASK-1.7.6]** Implementar tela de listagem de empresas
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/empresas/page.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/empresas/components/companies-list.tsx (~80 linhas)
         • Criar: backoffice-web/src/modules/empresas/hooks/use-companies.ts (~40 linhas)
         • Criar: backoffice-web/src/modules/empresas/services/companies.service.ts (~50 linhas)
      
      🔗 Depende de: TASK-1.7.5, TASK-1.6.3
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 419)
      
      ⚠️ Validar:
         • Lista empresas do backend
         • Loading/error states
         • Paginação funcional
         • Filtros básicos
      ```

- [x] **[TASK-1.7.7]** Implementar modal de criar/editar empresa
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/modules/empresas/components/company-form.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/empresas/components/company-modal.tsx (~60 linhas)
      
      🔗 Depende de: TASK-1.7.6
      
      📚 Referência: docs/business-context/05-escopo-v1.md (linhas 41)
      
      ⚠️ Validar:
         • Form com validação
         • Criar empresa funciona
         • Editar empresa funciona
         • Feedback visual de sucesso/erro
      ```

**✅ CHECKPOINT EPIC-007:**
- [ ] Login funcional end-to-end
- [ ] Dashboard layout responsivo
- [ ] Listagem de empresas funcional
- [ ] CRUD de empresas via UI
- [ ] Proteção de rotas funcionando

---

**✅ CHECKPOINT FASE 1:**
- [ ] Schema CORE completo e funcional
- [ ] RLS testado e validado
- [ ] Backoffice API estruturada
- [ ] Auth end-to-end funcionando
- [ ] Governança (empresas) via UI
- [ ] Provisionamento automático testado
- [ ] Deploy em ambiente staging
- [ ] Code review aprovado

---

## Fase 2 — Qualificação IA

**Objetivo:** Implementar o Agent Runtime, integração WhatsApp via Evolution API, fluxo de qualificação, debounce/chunking, processamento multimodal e memória curta.  
**EPICs:** EPIC-008, EPIC-009, EPIC-010, EPIC-011, EPIC-012, EPIC-013

---

### EPIC-008: Agent Runtime Bootstrap + Infraestrutura Python

#### Definição & Justificativa

- **O que:** Configurar o serviço `agent-runtime` (Python 3.12 + Agno Framework) com estrutura de pastas, conexões com Redis/Supabase, config via Settings (Pydantic) e endpoints básicos de health/readiness.

- **Por que:** O Agent Runtime é o "cérebro" do sistema. Sem ele, não há IA conversacional. É crítico ter uma base sólida antes de implementar os handlers de mensagem.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 1-83) — Propósito
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 110-164) — Estrutura de arquivos
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 586-697) — SVC-003 Agent Runtime

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `agent-runtime/pyproject.toml` | ~80 | Deps e config Poetry |
| `agent-runtime/src/common/config/settings.py` | ~60 | Settings Pydantic |
| `agent-runtime/src/common/infrastructure/cache/redis_client.py` | ~80 | Redis wrapper |
| `agent-runtime/src/common/infrastructure/database/supabase_client.py` | ~100 | Supabase wrapper |
| `agent-runtime/src/common/infrastructure/messaging/pubsub.py` | ~90 | Pub/Sub subscriber |
| `agent-runtime/src/api/main.py` | ~50 | FastAPI entrypoint |
| `agent-runtime/src/api/routes/health.py` | ~30 | Health endpoints |

---

#### Tasks Detalhadas

- [x] **[TASK-2.8.1]** Setup projeto Python com Poetry/pyproject.toml
      ```
      📁 Arquivos:
         • Criar: agent-runtime/pyproject.toml (~80 linhas)
         • Criar: agent-runtime/.python-version (~1 linha)
         • Criar: agent-runtime/README.md (~40 linhas)
      
      🔗 Depende de: TASK-0.1.5
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 110-115)
      
      ⚠️ Validar:
         • poetry install funciona
         • Python 3.12 utilizado
         • Deps principais instaladas (agno, fastapi, redis, supabase)
      ```

- [x] **[TASK-2.8.2]** Implementar Settings via Pydantic
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/common/config/settings.py (~60 linhas)
         • Criar: agent-runtime/src/common/config/__init__.py (~5 linhas)
      
      🔗 Depende de: TASK-2.8.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 192-199)
      
      ⚠️ Validar:
         • Env vars carregadas
         • Validação de tipos funciona
         • Settings singleton acessível
      ```

- [x] **[TASK-2.8.3]** Implementar Supabase client wrapper
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/common/infrastructure/database/supabase_client.py (~100 linhas)
         • Criar: agent-runtime/src/common/infrastructure/database/__init__.py (~5 linhas)
      
      🔗 Depende de: TASK-2.8.2, TASK-1.3.8
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 200-208)
      
      ⚠️ Validar:
         • Query SELECT funciona
         • Insert/Update funcionam
         • Connection pooling configurado
      ```

- [x] **[TASK-2.8.4]** Implementar Redis client wrapper
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/common/infrastructure/cache/redis_client.py (~80 linhas)
         • Criar: agent-runtime/src/common/infrastructure/cache/__init__.py (~5 linhas)
      
      🔗 Depende de: TASK-2.8.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 209-217)
      
      ⚠️ Validar:
         • get/set funcionam
         • publish funciona
         • TTL aplicado
      ```

- [x] **[TASK-2.8.5]** Implementar Pub/Sub subscriber
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/common/infrastructure/messaging/pubsub.py (~90 linhas)
         • Criar: agent-runtime/src/common/infrastructure/messaging/__init__.py (~5 linhas)
      
      🔗 Depende de: TASK-2.8.4, TASK-0.2.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 218-229)
      
      ⚠️ Validar:
         • subscribe() registra handler
         • Mensagens recebidas corretamente
         • Retry em caso de falha
      ```

- [x] **[TASK-2.8.6]** Criar FastAPI entrypoint + health routes
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/api/main.py (~50 linhas)
         • Criar: agent-runtime/src/api/routes/health.py (~30 linhas)
         • Criar: agent-runtime/src/api/__init__.py (~5 linhas)
      
      🔗 Depende de: TASK-2.8.3, TASK-2.8.4
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 177-190)
      
      ⚠️ Validar:
         • GET /health retorna 200
         • GET /ready verifica conexões
         • Swagger disponível em /docs
      ```

**✅ CHECKPOINT EPIC-008:**
- [ ] Agent Runtime inicia sem erros
- [ ] Conexão com Supabase funciona
- [ ] Conexão com Redis funciona
- [ ] Pub/Sub recebendo mensagens
- [ ] Health endpoints respondendo

---

### EPIC-009: Evolution Manager + Integração WhatsApp

#### Definição & Justificativa

- **O que:** Implementar o serviço `evolution-manager` (Nest.js) que gerencia instâncias WhatsApp via Evolution API, inclui CRUD de instâncias, QR code, e webhook receiver que republica eventos no Redis.

- **Por que:** WhatsApp é o canal principal (90%+ das interações). Sem essa integração, o SDR não opera. O Evolution Manager abstrai a complexidade da Evolution API.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-evolution-manager.md` (linhas 1-86) — Propósito
  - 📄 `docs/architecture/arch-micro-evolution-manager.md` (linhas 116-178) — Estrutura
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 703-823) — SVC-004

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `evolution-manager/src/modules/instances/instances.module.ts` | ~30 | Module |
| `evolution-manager/src/modules/instances/controllers/instances.controller.ts` | ~150 | CRUD instâncias |
| `evolution-manager/src/modules/instances/services/instances.service.ts` | ~200 | Lógica instâncias |
| `evolution-manager/src/modules/instances/services/evolution-api.service.ts` | ~250 | Client Evolution |
| `evolution-manager/src/modules/webhooks/controllers/webhooks.controller.ts` | ~100 | Receiver |
| `evolution-manager/src/modules/webhooks/services/event-publisher.service.ts` | ~80 | Pub/Sub |

---

#### Tasks Detalhadas

- [x] **[TASK-2.9.1]** Setup projeto evolution-manager Nest.js
      ```
      📁 Arquivos:
         • Criar: evolution-manager/package.json (~60 linhas)
         • Criar: evolution-manager/nest-cli.json (~15 linhas)
         • Criar: evolution-manager/tsconfig.json (~25 linhas)
         • Criar: evolution-manager/src/main.ts (~30 linhas)
         • Criar: evolution-manager/src/app.module.ts (~25 linhas)
      
      🔗 Depende de: TASK-0.1.1
      
      📚 Referência: docs/architecture/arch-micro-evolution-manager.md (linhas 116-135)
      
      ⚠️ Validar:
         • npm run start:dev funciona
         • Healthcheck disponível
         • Logs estruturados
      ```

- [x] **[TASK-2.9.2]** Implementar Evolution API client service
      ```
      📁 Arquivos:
         • Criar: evolution-manager/src/modules/instances/services/evolution-api.service.ts (~250 linhas)
         • Criar: evolution-manager/src/config/evolution.config.ts (~30 linhas)
      
      🔗 Depende de: TASK-2.9.1
      
      📚 Referência: docs/architecture/arch-micro-evolution-manager.md (linhas 308-345)
      
      ⚠️ Validar:
         • createInstance() funciona
         • getQrCode() retorna QR
         • sendText() envia mensagem
         • sendMedia() envia arquivo
      ```

- [x] **[TASK-2.9.3]** Implementar CRUD de instâncias WhatsApp
      ```
      📁 Arquivos:
         • Criar: evolution-manager/src/modules/instances/instances.module.ts (~30 linhas)
         • Criar: evolution-manager/src/modules/instances/controllers/instances.controller.ts (~150 linhas)
         • Criar: evolution-manager/src/modules/instances/services/instances.service.ts (~200 linhas)
         • Criar: evolution-manager/src/modules/instances/dto/create-instance.dto.ts (~25 linhas)
         • Criar: evolution-manager/src/modules/instances/dto/instance-response.dto.ts (~30 linhas)
      
      🔗 Depende de: TASK-2.9.2
      
      📚 Referência: docs/architecture/arch-micro-evolution-manager.md (linhas 162-176)
      
      ⚠️ Validar:
         • POST /instances cria instância
         • GET /instances/:id retorna status
         • GET /instances/:id/qrcode retorna QR
         • DELETE /instances/:id remove
         • Persiste em core.channel_instances
      ```

- [x] **[TASK-2.9.4]** Implementar webhook receiver
      ```
      📁 Arquivos:
         • Criar: evolution-manager/src/modules/webhooks/webhooks.module.ts (~25 linhas)
         • Criar: evolution-manager/src/modules/webhooks/controllers/webhooks.controller.ts (~100 linhas)
         • Criar: evolution-manager/src/modules/webhooks/dto/evolution-event.dto.ts (~50 linhas)
      
      🔗 Depende de: TASK-2.9.3
      
      📚 Referência: docs/architecture/arch-micro-evolution-manager.md (linhas 346-383)
      
      ⚠️ Validar:
         • POST /webhooks/evolution recebe eventos
         • Eventos validados por schema
         • Signature verificada
         • Logging completo
      ```

- [x] **[TASK-2.9.5]** Implementar event publisher (Redis Pub/Sub)
      ```
      📁 Arquivos:
         • Criar: evolution-manager/src/modules/webhooks/services/event-publisher.service.ts (~80 linhas)
         • Criar: evolution-manager/src/infrastructure/redis/redis.module.ts (~25 linhas)
         • Criar: evolution-manager/src/infrastructure/redis/redis.service.ts (~60 linhas)
      
      🔗 Depende de: TASK-2.9.4, TASK-0.2.2
      
      📚 Referência: docs/architecture/arch-micro-evolution-manager.md (linhas 384-418)
      
      ⚠️ Validar:
         • Evento message.received publicado
         • Evento connection.update publicado
         • Canal correto (channels:whatsapp:incoming)
         • Payload normalizado
      ```

- [~] **[TASK-2.9.6]** Integrar UI de instâncias no backoffice-web
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/instancias/page.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/instancias/components/instances-list.tsx (~120 linhas)
         • Criar: backoffice-web/src/modules/instancias/components/instance-qrcode.tsx (~80 linhas)
         • Criar: backoffice-web/src/modules/instancias/components/create-instance-modal.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/instancias/services/instances.service.ts (~60 linhas)
      
      🔗 Depende de: TASK-2.9.3, TASK-1.7.5
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 66-74)
      
      ⚠️ Validar:
         • Lista instâncias por empresa
         • Modal de QR code funciona
         • Status atualiza em tempo real
         • Criar nova instância funciona
      ```

**✅ CHECKPOINT EPIC-009:**
- [ ] Evolution Manager funcional
- [ ] CRUD de instâncias via API
- [ ] QR code exibido na UI
- [ ] Webhooks recebidos e republished
- [ ] Conexão WhatsApp estabelecida

---

### EPIC-010: Centurion Core + Fluxo de Qualificação

#### Definição & Justificativa

- **O que:** Implementar o core do Centurion: message handler que consome eventos, CenturionService que orquestra o fluxo, prompt assembly, integração com LLM (via Agno), e lógica de qualificação com regras configuráveis.

- **Por que:** Este é o "coração" do sistema SDR. Sem o fluxo de qualificação, não existe proposta de valor. A implementação deve ser modular para suportar múltiplos LLMs e regras por empresa.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 232-310) — Centurion module
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 631-676) — Capacidades IA
  - 📄 `docs/business-context/04-ciclo-de-vida.md` (linhas 22-109) — Ciclo qualificação

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `agent-runtime/src/modules/centurion/handlers/message_handler.py` | ~120 | Consumer principal |
| `agent-runtime/src/modules/centurion/services/centurion_service.py` | ~250 | Orquestração |
| `agent-runtime/src/modules/centurion/services/prompt_builder.py` | ~150 | Assembly de prompt |
| `agent-runtime/src/modules/centurion/services/qualification_service.py` | ~180 | Regras de qualif. |
| `agent-runtime/src/modules/centurion/domain/lead.py` | ~80 | Entity Lead |
| `agent-runtime/src/modules/centurion/domain/conversation.py` | ~70 | Entity Conversation |
| `agent-runtime/src/modules/centurion/repository/lead_repository.py` | ~100 | Repository Lead |

---

#### Tasks Detalhadas

- [x] **[TASK-2.10.1]** Implementar entities de domínio
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/centurion/domain/lead.py (~80 linhas)
         • Criar: agent-runtime/src/modules/centurion/domain/conversation.py (~70 linhas)
         • Criar: agent-runtime/src/modules/centurion/domain/message.py (~50 linhas)
         • Criar: agent-runtime/src/modules/centurion/domain/__init__.py (~10 linhas)
      
      🔗 Depende de: TASK-2.8.3
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 69-291)
      
      ⚠️ Validar:
         • Entities mapeiam tabelas CORE
         • Validations no domínio
         • Métodos de negócio (is_qualified, etc)
      ```

- [x] **[TASK-2.10.2]** Implementar repositories
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/centurion/repository/lead_repository.py (~100 linhas)
         • Criar: agent-runtime/src/modules/centurion/repository/conversation_repository.py (~80 linhas)
         • Criar: agent-runtime/src/modules/centurion/repository/message_repository.py (~70 linhas)
         • Criar: agent-runtime/src/modules/centurion/repository/config_repository.py (~60 linhas)
      
      🔗 Depende de: TASK-2.10.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 269-282)
      
      ⚠️ Validar:
         • get_or_create_lead() funciona
         • get_or_create_conversation() funciona
         • save_message() persiste
         • get_centurion_config() retorna config
      ```

- [x] **[TASK-2.10.3]** Implementar message handler (consumer)
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/centurion/handlers/message_handler.py (~120 linhas)
      
      🔗 Depende de: TASK-2.8.5, TASK-2.10.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 232-247)
      
      ⚠️ Validar:
         • Consome de channels:whatsapp:incoming
         • Extrai company_id, phone, content
         • Invoca CenturionService
         • Error handling robusto
      ```

- [x] **[TASK-2.10.4]** Implementar prompt builder
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/centurion/services/prompt_builder.py (~150 linhas)
      
      🔗 Depende de: TASK-2.10.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 295-310)
      
      ⚠️ Validar:
         • Monta system prompt da config
         • Injeta context de memória
         • Injeta histórico de conversa
         • Injeta ferramentas disponíveis
      ```

- [x] **[TASK-2.10.5]** Implementar CenturionService (orquestração)
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/centurion/services/centurion_service.py (~250 linhas)
      
      🔗 Depende de: TASK-2.10.3, TASK-2.10.4
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 248-267)
      
      ⚠️ Validar:
         • Fluxo: recebe → monta prompt → LLM → resposta
         • Integração com Agno Agent
         • Persiste mensagem do usuário
         • Persiste resposta do agente
      ```

- [x] **[TASK-2.10.6]** Implementar qualification service
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/centurion/services/qualification_service.py (~180 linhas)
      
      🔗 Depende de: TASK-2.10.5
      
      📚 Referência: docs/business-context/04-ciclo-de-vida.md (linhas 50-109)
      
      ⚠️ Validar:
         • Avalia qualification_rules da config
         • Extrai campos obrigatórios
         • Atualiza status do lead
         • Emite evento lead.qualified
      ```

- [x] **[TASK-2.10.7]** Integrar envio de resposta via Evolution Manager
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/centurion/services/whatsapp_sender.py (~80 linhas)
      
      🔗 Depende de: TASK-2.10.5, TASK-2.9.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 283-294)
      
      ⚠️ Validar:
         • Publica no canal channels:whatsapp:outgoing
         • Evolution Manager consome e envia
         • Mensagem chega no WhatsApp
         • Retry em caso de falha
      ```

**✅ CHECKPOINT EPIC-010:**
- [ ] Handler consumindo mensagens
- [ ] Prompt montado com contexto
- [ ] Resposta gerada pelo LLM
- [ ] Mensagem enviada de volta
- [ ] Fluxo end-to-end funcionando

---

### EPIC-011: Humanização (Debounce + Chunking)

#### Definição & Justificativa

- **O que:** Implementar debounce (aguardar usuário terminar de digitar antes de processar) e chunking (dividir respostas longas em mensagens menores com delays humanizados).

- **Por que:** Sem humanização, o bot parece artificial. Responder a cada mensagem individualmente ou enviar parágrafos enormes quebra a experiência. Empresas configuram esses valores por Centurion.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 420-492) — Debounce/Chunking
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 160-171) — Config humanização
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 656-665) — Capacidades

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `agent-runtime/src/modules/centurion/handlers/debounce_handler.py` | ~120 | Debounce logic |
| `agent-runtime/src/modules/centurion/services/response_builder.py` | ~150 | Chunking logic |
| `packages/contracts/src/events/debounce_timer.ts` | ~30 | Evento debounce |

---

#### Tasks Detalhadas

- [x] **[TASK-2.11.1]** Implementar debounce handler
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/centurion/handlers/debounce_handler.py (~120 linhas)
      
      🔗 Depende de: TASK-2.10.3
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 420-455)
      
      ⚠️ Validar:
         • Mensagens dentro do debounce_ms não processam individualmente
         • Timer reinicia a cada nova mensagem
         • Após timeout, processa batch consolidado
         • Config por centurion_config
      ```

- [x] **[TASK-2.11.2]** Implementar response builder com chunking
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/centurion/services/response_builder.py (~150 linhas)
      
      🔗 Depende de: TASK-2.10.5
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 456-492)
      
      ⚠️ Validar:
         • Resposta dividida por chunk_config
         • Delay entre chunks baseado em config
         • Mantém coerência semântica na divisão
         • Chunks enviados sequencialmente
      ```

- [x] **[TASK-2.11.3]** Atualizar conversation com debounce state
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/centurion/domain/conversation.py (~20 linhas)
         • Modificar: agent-runtime/src/modules/centurion/repository/conversation_repository.py (~30 linhas)
      
      🔗 Depende de: TASK-2.11.1
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 240-250)
      
      ⚠️ Validar:
         • debounce_state persiste no banco
         • pending_messages acumuladas
         • last_message_at atualizado
         • Recover de debounce após restart
      ```

- [x] **[TASK-2.11.4]** Integrar debounce/chunking no fluxo principal
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/centurion/services/centurion_service.py (~50 linhas)
      
      🔗 Depende de: TASK-2.11.1, TASK-2.11.2, TASK-2.11.3
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 248-267)
      
      ⚠️ Validar:
         • Fluxo passa por debounce antes de LLM
         • Resposta passa por chunking antes de enviar
         • Config da empresa respeitada
         • Logs de timing para debugging
      ```

**✅ CHECKPOINT EPIC-011:**
- [ ] Debounce funcionando por conversation
- [ ] Chunking dividindo respostas
- [ ] Delays humanizados entre mensagens
- [ ] Configurável por Centurion

---

### EPIC-012: Processamento Multimodal (Áudio + Imagem)

#### Definição & Justificativa

- **O que:** Implementar processamento de áudios (Speech-to-Text) e imagens (Vision) recebidos via WhatsApp, armazenando transcrições e descrições para enriquecer o contexto.

- **Por que:** 40%+ das interações incluem mídia. Ignorar áudios é ignorar metade da conversa. Imagens podem conter informações críticas (prints de orçamento, etc).

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 493-557) — Multimodal
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 268-276) — Fields mídia
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 645-655) — Capacidades

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `agent-runtime/src/modules/channels/services/media_downloader.py` | ~80 | Download mídia |
| `agent-runtime/src/modules/channels/services/stt_service.py` | ~100 | Speech-to-Text |
| `agent-runtime/src/modules/channels/services/vision_service.py` | ~100 | Vision/OCR |
| `agent-runtime/src/modules/centurion/dto/media_dtos.py` | ~40 | DTOs mídia |

---

#### Tasks Detalhadas

- [x] **[TASK-2.12.1]** Implementar media downloader
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/channels/services/media_downloader.py (~80 linhas)
      
      🔗 Depende de: TASK-2.9.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 493-510)
      
      ⚠️ Validar:
         • Download de áudio funciona
         • Download de imagem funciona
         • Timeout configurável
         • Temp storage gerenciado
      ```

- [x] **[TASK-2.12.2]** Implementar Speech-to-Text service
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/channels/services/stt_service.py (~100 linhas)
         • Criar: agent-runtime/src/config/openai/config.py (~20 linhas)
      
      🔗 Depende de: TASK-2.12.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 511-530)
      
      ⚠️ Validar:
         • Whisper API chamada
         • Transcrição retornada
         • Fallback para erro
         • Múltiplos formatos suportados
      ```

- [x] **[TASK-2.12.3]** Implementar Vision service
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/channels/services/vision_service.py (~100 linhas)
      
      🔗 Depende de: TASK-2.12.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 531-557)
      
      ⚠️ Validar:
         • GPT-4 Vision chamado
         • Descrição gerada
         • OCR quando relevante
         • Fallback para erro
      ```

- [x] **[TASK-2.12.4]** Integrar multimodal no message handler
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/centurion/handlers/message_handler.py (~40 linhas)
         • Modificar: agent-runtime/src/modules/centurion/repository/message_repository.py (~20 linhas)
      
      🔗 Depende de: TASK-2.12.2, TASK-2.12.3
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 248-267)
      
      ⚠️ Validar:
         • Áudio detectado → STT → transcrição salva
         • Imagem detectada → Vision → descrição salva
         • Conteúdo enriquecido no prompt
         • can_process_* respeitados
      ```

**✅ CHECKPOINT EPIC-012:**
- [ ] Áudios transcritos automaticamente
- [ ] Imagens descritas automaticamente
- [ ] Conteúdo enriquecido no contexto
- [ ] Respeitando flags de capacidade

---

### EPIC-013: Memória de Curto Prazo (Histórico de Conversa)

#### Definição & Justificativa

- **O que:** Implementar gerenciamento de histórico de conversa com window sliding, persistência em `core.messages`, e injeção no prompt do LLM.

- **Por que:** Sem memória de curto prazo, cada mensagem seria tratada isoladamente, perdendo todo o contexto. O LLM precisa do histórico para manter coerência.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 558-610) — Short-term memory
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 251-291) — Messages
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 666-676) — Camadas memória

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `agent-runtime/src/modules/memory/services/short_term_memory.py` | ~120 | Gestão histórico |
| `agent-runtime/src/modules/memory/domain/memory_window.py` | ~60 | VO window |

---

#### Tasks Detalhadas

- [x] **[TASK-2.13.1]** Implementar short-term memory service
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/memory/services/short_term_memory.py (~120 linhas)
         • Criar: agent-runtime/src/modules/memory/domain/memory_window.py (~60 linhas)
         • Criar: agent-runtime/src/modules/memory/__init__.py (~5 linhas)
      
      🔗 Depende de: TASK-2.10.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 558-580)
      
      ⚠️ Validar:
         • get_conversation_history() retorna últimas N mensagens
         • Window configurável por tokens/mensagens
         • Ordenação cronológica
         • Cache em Redis para performance
      ```

- [x] **[TASK-2.13.2]** Integrar memória curta no prompt builder
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/centurion/services/prompt_builder.py (~30 linhas)
      
      🔗 Depende de: TASK-2.13.1, TASK-2.10.4
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 295-310)
      
      ⚠️ Validar:
         • Histórico injetado no prompt
         • Formato compatível com LLM
         • Truncamento respeitando limite
         • Role correta (user/assistant)
      ```

- [x] **[TASK-2.13.3]** Implementar limpeza automática de histórico antigo
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/memory/services/memory_cleanup.py (~60 linhas)
      
      🔗 Depende de: TASK-2.13.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 600-610)
      
      ⚠️ Validar:
         • Job periódico executa
         • Mensagens > 30 dias arquivadas
         • Não afeta conversas ativas
         • Logs de limpeza
      ```

**✅ CHECKPOINT EPIC-013:**
- [ ] Histórico recuperado por conversation
- [ ] Window sliding funcionando
- [ ] Contexto injetado no prompt
- [ ] Cleanup automático rodando

---

**✅ CHECKPOINT FASE 2:**
- [ ] Agent Runtime consumindo mensagens
- [ ] WhatsApp integrado via Evolution
- [ ] Fluxo de qualificação end-to-end
- [ ] Debounce e chunking funcionando
- [ ] Áudios e imagens processados
- [ ] Memória de curto prazo ativa
- [ ] Deploy em ambiente staging
- [ ] Testes de integração passando

---

## Fase 3 — Inteligência Avançada

**Objetivo:** Implementar memória RAG (long-term), Tools customizáveis, MCP (Model Context Protocol), Knowledge Base e Follow-ups proativos.  
**EPICs:** EPIC-014, EPIC-015, EPIC-016, EPIC-017, EPIC-018

---

### EPIC-014: Memória RAG (Long-Term Memory)

#### Definição & Justificativa

- **O que:** Implementar extração automática de fatos durante conversas, geração de embeddings (OpenAI), armazenamento em `core.lead_memories` com pgvector, e busca semântica para enriquecer contexto.

- **Por que:** A memória de curto prazo é limitada. O SDR precisa lembrar informações importantes de conversas anteriores (nome do filho, data do evento, orçamento mencionado). Isso diferencia de chatbots genéricos.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 611-680) — RAG Memory
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 296-326) — lead_memories
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 666-676) — Camadas memória

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `agent-runtime/src/modules/memory/services/fact_extractor.py` | ~150 | Extração de fatos |
| `agent-runtime/src/modules/memory/services/embedding_service.py` | ~80 | Geração embeddings |
| `agent-runtime/src/modules/memory/adapters/rag_adapter.py` | ~120 | Busca semântica |
| `agent-runtime/src/modules/memory/domain/fact.py` | ~50 | Entity Fact |
| `agent-runtime/src/modules/memory/repository/fact_repository.py` | ~90 | Repository Fact |

---

#### Tasks Detalhadas

- [x] **[TASK-3.14.1]** Implementar fact extractor service
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/memory/services/fact_extractor.py (~150 linhas)
         • Criar: agent-runtime/src/modules/memory/domain/fact.py (~50 linhas)
      
      🔗 Depende de: TASK-2.13.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 611-640)
      
      ⚠️ Validar:
         • LLM extrai fatos de mensagens
         • Fatos categorizados (pessoal, preferência, histórico)
         • Deduplica fatos similares
         • Async para não bloquear fluxo
      ```

- [x] **[TASK-3.14.2]** Implementar embedding service
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/memory/services/embedding_service.py (~80 linhas)
      
      🔗 Depende de: TASK-3.14.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 641-655)
      
      ⚠️ Validar:
         • OpenAI Embeddings API chamada
         • Vector 1536 dims retornado
         • Batch processing para eficiência
         • Cache de embeddings
      ```

- [x] **[TASK-3.14.3]** Implementar fact repository com pgvector
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/memory/repository/fact_repository.py (~90 linhas)
      
      🔗 Depende de: TASK-3.14.2, TASK-1.3.7
      
      📚 Referência: docs/business-context/03-modelo-de-entidades.md (linhas 296-326)
      
      ⚠️ Validar:
         • save_fact() persiste com embedding
         • search_similar() usa cosine similarity
         • Filter por lead_id
         • Índice ivfflat usado
      ```

- [x] **[TASK-3.14.4]** Implementar RAG adapter
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/memory/adapters/rag_adapter.py (~120 linhas)
      
      🔗 Depende de: TASK-3.14.3
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 656-680)
      
      ⚠️ Validar:
         • get_relevant_context() retorna fatos
         • Top-K configurável
         • Threshold de similaridade
         • Formatação para prompt
      ```

- [x] **[TASK-3.14.5]** Integrar RAG no fluxo de qualificação
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/centurion/services/centurion_service.py (~30 linhas)
         • Modificar: agent-runtime/src/modules/centurion/services/prompt_builder.py (~25 linhas)
      
      🔗 Depende de: TASK-3.14.4
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 248-267)
      
      ⚠️ Validar:
         • Fatos extraídos após cada resposta
         • Contexto RAG injetado no prompt
         • Performance aceitável (<500ms overhead)
      ```

**✅ CHECKPOINT EPIC-014:**
- [ ] Fatos extraídos automaticamente
- [ ] Embeddings gerados e persistidos
- [ ] Busca semântica funcionando
- [ ] Contexto RAG no prompt

---

### EPIC-015: Tools Customizáveis (Function Calling)

#### Definição & Justificativa

- **O que:** Implementar sistema de Tools configuráveis por Centurion: CRUD de definições de tools, schema validation (JSON Schema), execução segura de HTTP calls, e UI de configuração.

- **Por que:** Cada empresa tem integrações diferentes. O SDR precisa consultar estoque, agendar no Google Calendar, criar orçamento no ERP. Tools são a extensibilidade do sistema.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 681-760) — Tools
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 193-195) — tools_config JSONB
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 677-690) — Tools & MCP

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `backoffice-api/src/modules/tools/tools.module.ts` | ~25 | Module |
| `backoffice-api/src/modules/tools/controllers/tools.controller.ts` | ~100 | CRUD |
| `backoffice-api/src/modules/tools/services/tools.service.ts` | ~120 | Lógica |
| `agent-runtime/src/modules/tools/domain/tool.py` | ~70 | Entity Tool |
| `agent-runtime/src/modules/tools/services/schema_validator.py` | ~60 | JSON Schema |
| `agent-runtime/src/modules/tools/services/tool_executor.py` | ~150 | Execução |
| `backoffice-web/src/modules/centurions/tools/tools-config.tsx` | ~200 | UI config |

---

#### Tasks Detalhadas

- [x] **[TASK-3.15.1]** Implementar CRUD de tools na API
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/tools/tools.module.ts (~25 linhas)
         • Criar: backoffice-api/src/modules/tools/controllers/tools.controller.ts (~100 linhas)
         • Criar: backoffice-api/src/modules/tools/services/tools.service.ts (~120 linhas)
         • Criar: backoffice-api/src/modules/tools/dto/create-tool.dto.ts (~40 linhas)
         • Criar: backoffice-api/src/modules/tools/dto/tool-response.dto.ts (~35 linhas)
      
      🔗 Depende de: TASK-1.5.6
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 525-555)
      
      ⚠️ Validar:
         • POST /centurions/:id/tools cria tool
         • GET /centurions/:id/tools lista
         • PUT /centurions/:id/tools/:toolId atualiza
         • DELETE /centurions/:id/tools/:toolId remove
         • JSON Schema validado na criação
      ```

- [x] **[TASK-3.15.2]** Implementar tool entity e schema validator no Agent Runtime
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/tools/domain/tool.py (~70 linhas)
         • Criar: agent-runtime/src/modules/tools/services/schema_validator.py (~60 linhas)
         • Criar: agent-runtime/src/modules/tools/repository/tool_repository.py (~50 linhas)
      
      🔗 Depende de: TASK-3.15.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 681-710)
      
      ⚠️ Validar:
         • Tool entity mapeia config
         • Schema validado antes de registro
         • Repository carrega tools da config
      ```

- [x] **[TASK-3.15.3]** Implementar tool executor
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/tools/services/tool_executor.py (~150 linhas)
      
      🔗 Depende de: TASK-3.15.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 711-745)
      
      ⚠️ Validar:
         • HTTP call executada
         • Headers customizáveis
         • Timeout configurável
         • Retry com backoff
         • Response parsed
      ```

- [x] **[TASK-3.15.4]** Integrar tools no Agno Agent
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/centurion/services/centurion_service.py (~40 linhas)
         • Criar: agent-runtime/src/modules/tools/services/tool_registry.py (~80 linhas)
      
      🔗 Depende de: TASK-3.15.3
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 746-760)
      
      ⚠️ Validar:
         • Tools registradas no Agno Agent
         • LLM chama tool quando apropriado
         • Resultado injetado na conversa
         • Logging de execução
      ```

- [x] **[TASK-3.15.5]** Implementar UI de configuração de tools
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/modules/centurions/tools/tools-config.tsx (~200 linhas)
         • Criar: backoffice-web/src/modules/centurions/tools/tool-form.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/centurions/tools/schema-editor.tsx (~100 linhas)
      
      🔗 Depende de: TASK-3.15.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 95-103)
      
      ⚠️ Validar:
         • Lista tools do Centurion
         • Form de criação/edição
         • Editor de JSON Schema
         • Teste de execução
      ```

**✅ CHECKPOINT EPIC-015:**
- [ ] CRUD de tools via API
- [ ] Tools executadas pelo Agent
- [ ] LLM usando function calling
- [ ] UI de configuração funcional

---

### EPIC-016: MCP (Model Context Protocol)

#### Definição & Justificativa

- **O que:** Implementar suporte ao Model Context Protocol: registro de MCP servers, discovery de tools via protocolo, e execução transparente pelo Agent.

- **Por que:** MCP é o futuro de integração de agentes. Permite usar servidores padronizados (filesystem, databases, APIs) sem implementar cada integração manualmente. Escalabilidade de extensibilidade.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 761-830) — MCP
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 677-690) — Tools & MCP

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `backoffice-api/src/modules/mcp/mcp.module.ts` | ~25 | Module |
| `backoffice-api/src/modules/mcp/controllers/mcp.controller.ts` | ~80 | CRUD servers |
| `backoffice-api/src/modules/mcp/services/mcp.service.ts` | ~100 | Lógica |
| `agent-runtime/src/modules/tools/services/mcp_registry.py` | ~180 | MCP client |
| `agent-runtime/src/modules/tools/services/mcp_tool_adapter.py` | ~120 | Adapter |
| `backoffice-web/src/modules/centurions/mcp/mcp-config.tsx` | ~150 | UI config |

---

#### Tasks Detalhadas

- [x] **[TASK-3.16.1]** Implementar CRUD de MCP servers na API
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/mcp/mcp.module.ts (~25 linhas)
         • Criar: backoffice-api/src/modules/mcp/controllers/mcp.controller.ts (~80 linhas)
         • Criar: backoffice-api/src/modules/mcp/services/mcp.service.ts (~100 linhas)
         • Criar: backoffice-api/src/modules/mcp/dto/create-mcp-server.dto.ts (~30 linhas)
      
      🔗 Depende de: TASK-1.5.6
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 761-780)
      
      ⚠️ Validar:
         • POST /centurions/:id/mcp-servers cria
         • GET /centurions/:id/mcp-servers lista
         • DELETE /centurions/:id/mcp-servers/:id remove
         • Validação de URL do server
      ```

- [x] **[TASK-3.16.2]** Implementar MCP client registry
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/tools/services/mcp_registry.py (~180 linhas)
      
      🔗 Depende de: TASK-3.16.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 781-810)
      
      ⚠️ Validar:
         • Conexão com MCP server
         • Discovery de tools via protocolo
         • Health check de servers
         • Reconnect automático
      ```

- [x] **[TASK-3.16.3]** Implementar MCP tool adapter
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/tools/services/mcp_tool_adapter.py (~120 linhas)
      
      🔗 Depende de: TASK-3.16.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 811-830)
      
      ⚠️ Validar:
         • MCP tools convertidas para formato Agno
         • Execução via protocolo MCP
         • Response normalizada
         • Timeout handling
      ```

- [x] **[TASK-3.16.4]** Integrar MCP tools no tool registry
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/tools/services/tool_registry.py (~40 linhas)
      
      🔗 Depende de: TASK-3.16.3, TASK-3.15.4
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 746-760)
      
      ⚠️ Validar:
         • Tools MCP + custom unificadas
         • Namespace para evitar conflitos
         • Priorização configurável
      ```

- [x] **[TASK-3.16.5]** Implementar UI de configuração MCP
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/modules/centurions/mcp/mcp-config.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/centurions/mcp/mcp-server-form.tsx (~100 linhas)
      
      🔗 Depende de: TASK-3.16.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 95-103)
      
      ⚠️ Validar:
         • Lista MCP servers
         • Adicionar novo server
         • Status de conexão
         • Lista de tools descobertas
      ```

**✅ CHECKPOINT EPIC-016:**
- [ ] MCP servers registráveis
- [ ] Discovery de tools via protocolo
- [ ] Tools MCP executadas pelo Agent
- [ ] UI de configuração funcional

---

### EPIC-017: Knowledge Base (Upload + RAG)

#### Definição & Justificativa

- **O que:** Implementar upload de documentos (PDF, DOCX, TXT), processamento para chunks, geração de embeddings, armazenamento em Storage + pgvector, e busca semântica para enriquecer respostas.

- **Por que:** O SDR precisa conhecer o negócio da empresa: tabela de preços, FAQ, políticas. Sem Knowledge Base, respostas seriam genéricas. Com KB, o SDR tem conhecimento especializado.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 831-920) — Knowledge Base
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 691-697) — KB

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `backoffice-api/src/modules/knowledge-base/kb.module.ts` | ~30 | Module |
| `backoffice-api/src/modules/knowledge-base/controllers/kb.controller.ts` | ~120 | Upload/CRUD |
| `backoffice-api/src/modules/knowledge-base/services/kb.service.ts` | ~150 | Lógica |
| `backoffice-api/src/modules/knowledge-base/services/document-processor.service.ts` | ~200 | Chunking |
| `agent-runtime/src/modules/memory/adapters/knowledge_base_adapter.py` | ~120 | Busca KB |
| `backoffice-web/src/modules/knowledge-base/kb-manager.tsx` | ~200 | UI |

---

#### Tasks Detalhadas

- [x] **[TASK-3.17.1]** Criar bucket de Storage para documentos
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00040_kb_bucket.sql (~30 linhas)
         • Criar: supabase/migrations/00041_kb_documents_table.sql (~50 linhas)
         • Criar: supabase/migrations/00042_kb_chunks_table.sql (~60 linhas)
      
      🔗 Depende de: TASK-1.4.5
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 831-850)
      
      ⚠️ Validar:
         • Bucket knowledge_base criado
         • RLS por company_id
         • Tabelas de metadados criadas
         • Índices pgvector criados
      ```

- [x] **[TASK-3.17.2]** Implementar upload e CRUD de documentos
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/knowledge-base/kb.module.ts (~30 linhas)
         • Criar: backoffice-api/src/modules/knowledge-base/controllers/kb.controller.ts (~120 linhas)
         • Criar: backoffice-api/src/modules/knowledge-base/services/kb.service.ts (~150 linhas)
         • Criar: backoffice-api/src/modules/knowledge-base/dto/upload-document.dto.ts (~25 linhas)
      
      🔗 Depende de: TASK-3.17.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 560-590)
      
      ⚠️ Validar:
         • POST /knowledge-base/documents faz upload
         • GET /knowledge-base/documents lista
         • DELETE /knowledge-base/documents/:id remove
         • Arquivo salvo no Storage
      ```

- [x] **[TASK-3.17.3]** Implementar document processor (chunking)
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/knowledge-base/services/document-processor.service.ts (~200 linhas)
      
      🔗 Depende de: TASK-3.17.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 851-880)
      
      ⚠️ Validar:
         • PDF parsing funciona
         • DOCX parsing funciona
         • Chunks de ~500 tokens
         • Overlap configurável
         • Queue para processamento async
      ```

- [x] **[TASK-3.17.4]** Implementar geração de embeddings para chunks
      ```
      📁 Arquivos:
         • Modificar: backoffice-api/src/modules/knowledge-base/services/document-processor.service.ts (~50 linhas)
      
      🔗 Depende de: TASK-3.17.3, TASK-3.14.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 881-900)
      
      ⚠️ Validar:
         • Embeddings gerados para cada chunk
         • Persistidos em kb_chunks
         • Status do documento atualizado
         • Batch processing
      ```

- [x] **[TASK-3.17.5]** Implementar Knowledge Base adapter no Agent Runtime
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/memory/adapters/knowledge_base_adapter.py (~120 linhas)
      
      🔗 Depende de: TASK-3.17.4
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 901-920)
      
      ⚠️ Validar:
         • search_knowledge() retorna chunks relevantes
         • Filter por company_id
         • Threshold de similaridade
         • Formatação para prompt
      ```

- [x] **[TASK-3.17.6]** Integrar KB no prompt builder
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/centurion/services/prompt_builder.py (~25 linhas)
      
      🔗 Depende de: TASK-3.17.5
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 295-310)
      
      ⚠️ Validar:
         • KB context injetado no prompt
         • Seção separada de "conhecimento"
         • Citações de fonte
      ```

- [x] **[TASK-3.17.7]** Implementar UI de Knowledge Base
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/knowledge-base/page.tsx (~80 linhas)
         • Criar: backoffice-web/src/modules/knowledge-base/components/kb-manager.tsx (~200 linhas)
         • Criar: backoffice-web/src/modules/knowledge-base/components/document-upload.tsx (~120 linhas)
         • Criar: backoffice-web/src/modules/knowledge-base/components/document-list.tsx (~100 linhas)
      
      🔗 Depende de: TASK-3.17.2
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 104-112)
      
      ⚠️ Validar:
         • Upload drag-and-drop
         • Lista de documentos
         • Status de processamento
         • Preview de chunks
      ```

**✅ CHECKPOINT EPIC-017:**
- [ ] Upload de documentos funcional
- [ ] Chunking e embeddings gerados
- [ ] Busca semântica funcionando
- [ ] KB injetado nas respostas
- [ ] UI de gerenciamento funcional

---

### EPIC-018: Follow-ups Proativos

#### Definição & Justificativa

- **O que:** Implementar sistema de follow-ups automáticos: regras configuráveis por tempo de inatividade, templates de mensagem, worker que executa e envia, e UI de configuração.

- **Por que:** Leads esfriam rápido. Sem follow-up, oportunidades são perdidas. O SDR deve ser proativo, não apenas reativo. Follow-ups aumentam conversão em 30%+.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 921-990) — Follow-ups
  - 📄 `docs/business-context/04-ciclo-de-vida.md` (linhas 175-220) — Re-engajamento

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `agent-runtime/src/handlers/proactive_handler.py` | ~150 | Worker |
| `agent-runtime/src/modules/followups/services/followup_service.py` | ~180 | Lógica |
| `backoffice-api/src/modules/followups/followups.module.ts` | ~25 | Module |
| `backoffice-api/src/modules/followups/controllers/followups.controller.ts` | ~100 | CRUD |
| `backoffice-web/src/modules/centurions/followups/followups-config.tsx` | ~180 | UI |

---

#### Tasks Detalhadas

- [x] **[TASK-3.18.1]** Criar tabela de regras de follow-up
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00050_followup_rules.sql (~50 linhas)
         • Criar: supabase/migrations/00051_followup_queue.sql (~40 linhas)
      
      🔗 Depende de: TASK-1.3.4
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 921-940)
      
      ⚠️ Validar:
         • Tabela followup_rules criada
         • Queue de follow-ups pendentes
         • Índices de busca
         • RLS aplicado
      ```

- [x] **[TASK-3.18.2]** Implementar CRUD de follow-up rules na API
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/followups/followups.module.ts (~25 linhas)
         • Criar: backoffice-api/src/modules/followups/controllers/followups.controller.ts (~100 linhas)
         • Criar: backoffice-api/src/modules/followups/services/followups.service.ts (~120 linhas)
         • Criar: backoffice-api/src/modules/followups/dto/create-followup-rule.dto.ts (~35 linhas)
      
      🔗 Depende de: TASK-3.18.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 595-625)
      
      ⚠️ Validar:
         • POST /centurions/:id/followup-rules cria
         • GET /centurions/:id/followup-rules lista
         • PUT /centurions/:id/followup-rules/:id atualiza
         • DELETE /centurions/:id/followup-rules/:id remove
      ```

- [x] **[TASK-3.18.3]** Implementar followup service no Agent Runtime
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/followups/services/followup_service.py (~180 linhas)
         • Criar: agent-runtime/src/modules/followups/domain/followup_rule.py (~50 linhas)
         • Criar: agent-runtime/src/modules/followups/repository/followup_repository.py (~80 linhas)
      
      🔗 Depende de: TASK-3.18.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 941-970)
      
      ⚠️ Validar:
         • get_pending_followups() retorna leads
         • schedule_followup() agenda
         • complete_followup() marca como enviado
         • Filtros por inactivity_hours
      ```

- [x] **[TASK-3.18.4]** Implementar proactive handler (worker)
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/handlers/proactive_handler.py (~150 linhas)
      
      🔗 Depende de: TASK-3.18.3, TASK-2.10.7
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 971-990)
      
      ⚠️ Validar:
         • Worker executa periodicamente (cron)
         • Busca leads para follow-up
         • Gera mensagem via LLM
         • Envia via WhatsApp
         • Marca como executado
      ```

- [x] **[TASK-3.18.5]** Implementar UI de configuração de follow-ups
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/modules/centurions/followups/followups-config.tsx (~180 linhas)
         • Criar: backoffice-web/src/modules/centurions/followups/followup-rule-form.tsx (~120 linhas)
      
      🔗 Depende de: TASK-3.18.2
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 113-121)
      
      ⚠️ Validar:
         • Lista regras de follow-up
         • Criar/editar regras
         • Preview de template
         • Enable/disable regras
      ```

**✅ CHECKPOINT EPIC-018:**
- [ ] Regras de follow-up configuráveis
- [ ] Worker executando periodicamente
- [ ] Mensagens proativas enviadas
- [ ] UI de configuração funcional

---

**✅ CHECKPOINT FASE 3:**
- [ ] Memória RAG funcional
- [ ] Tools customizáveis operando
- [ ] MCP integrado
- [ ] Knowledge Base populada
- [ ] Follow-ups proativos enviados
- [ ] Deploy em ambiente staging
- [ ] Testes de integração passando

---

## Fase 4 — Handoff & Integrações

**Objetivo:** Implementar handoff de leads qualificados para schemas de empresa, integração Autentique (contratos), Facebook CAPI (tracking), e canais adicionais (Instagram/Telegram).  
**EPICs:** EPIC-019, EPIC-020, EPIC-021, EPIC-022

---

### EPIC-019: Handoff de Leads Qualificados

#### Definição & Justificativa

- **O que:** Implementar o processo de handoff: quando lead é qualificado, criar registro em `core.deals_index`, replicar dados para schema da empresa (`{company}_crm.deals`), e emitir eventos para integrações.

- **Por que:** "Leads nascem no CORE, deals vivem no CRM da empresa". Sem handoff, o trabalho do SDR não chega aos vendedores. É o ponto de conversão de todo o funil.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1231-1292) — Handoff flow
  - 📄 `docs/business-context/04-ciclo-de-vida.md` (linhas 112-173) — Ciclo handoff
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 688-795) — CRM schema

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `supabase/migrations/00060_deals_index.sql` | ~50 | Tabela core.deals_index |
| `supabase/migrations/00061_deals_index_triggers.sql` | ~80 | Triggers de replicação |
| `agent-runtime/src/modules/handoff/events/lead_qualified_event.py` | ~40 | Evento |
| `agent-runtime/src/modules/handoff/services/handoff_service.py` | ~180 | Lógica de handoff |
| `backoffice-api/src/modules/deals/deals.module.ts` | ~30 | Module |
| `backoffice-api/src/modules/deals/controllers/deals.controller.ts` | ~100 | Endpoints |

---

#### Tasks Detalhadas

- [x] **[TASK-4.19.1]** Criar tabela core.deals_index e triggers
      ```
      📁 Arquivos:
         • Criar: supabase/migrations/00060_deals_index.sql (~50 linhas)
         • Criar: supabase/migrations/00061_deals_index_triggers.sql (~80 linhas)
      
      🔗 Depende de: TASK-1.6.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1231-1260)
      
      ⚠️ Validar:
         • Tabela core.deals_index criada
         • Trigger replica para schema da empresa
         • FK para companies
         • Índices de busca
      ```

- [x] **[TASK-4.19.2]** Implementar handoff service no Agent Runtime
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/handoff/services/handoff_service.py (~180 linhas)
         • Criar: agent-runtime/src/modules/handoff/events/lead_qualified_event.py (~40 linhas)
         • Criar: agent-runtime/src/modules/handoff/domain/deal.py (~60 linhas)
      
      🔗 Depende de: TASK-4.19.1, TASK-2.10.6
      
      📚 Referência: docs/business-context/04-ciclo-de-vida.md (linhas 112-140)
      
      ⚠️ Validar:
         • execute_handoff() cria deal_index
         • Dados replicados para schema empresa
         • Evento lead.qualified emitido
         • Lead marcado como handoff_completed
      ```

- [x] **[TASK-4.19.3]** Integrar handoff no fluxo de qualificação
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/centurion/services/qualification_service.py (~40 linhas)
      
      🔗 Depende de: TASK-4.19.2
      
      📚 Referência: docs/business-context/04-ciclo-de-vida.md (linhas 141-173)
      
      ⚠️ Validar:
         • Quando lead qualificado, handoff disparado
         • Mensagem de encerramento enviada
         • Conversa marcada como closed
         • Métricas atualizadas
      ```

- [x] **[TASK-4.19.4]** Implementar endpoints de deals na API
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/deals/deals.module.ts (~30 linhas)
         • Criar: backoffice-api/src/modules/deals/controllers/deals.controller.ts (~100 linhas)
         • Criar: backoffice-api/src/modules/deals/services/deals.service.ts (~120 linhas)
         • Criar: backoffice-api/src/modules/deals/dto/deal-response.dto.ts (~40 linhas)
      
      🔗 Depende de: TASK-4.19.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 630-660)
      
      ⚠️ Validar:
         • GET /deals lista deals por empresa
         • GET /deals/:id retorna detalhes
         • GET /deals/stats retorna métricas
         • Filtros por status e data
      ```

- [x] **[TASK-4.19.5]** Implementar UI de deals
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/deals/page.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/deals/components/deals-list.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/deals/components/deal-details.tsx (~120 linhas)
      
      🔗 Depende de: TASK-4.19.4
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 122-130)
      
      ⚠️ Validar:
         • Lista deals com filtros
         • Detalhes do deal
         • Timeline de atividades
         • Status e métricas
      ```

**✅ CHECKPOINT EPIC-019:**
- [ ] Handoff criando deals
- [ ] Replicação para schema empresa
- [ ] Eventos emitidos
- [ ] UI de deals funcional

---

### EPIC-020: Integração Autentique (Contratos)

#### Definição & Justificativa

- **O que:** Implementar o serviço `autentique-service` para gerenciamento de templates de contrato, envio de contratos para assinatura digital, e webhooks de status.

- **Por que:** Contratos são parte do fechamento de negócio. Automação de envio e tracking de assinatura acelera o ciclo de vendas. Autentique é a plataforma escolhida.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 829-942) — SVC-005 Autentique
  - 📄 `docs/business-context/04-ciclo-de-vida.md` (linhas 224-280) — Contratos

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `autentique-service/package.json` | ~50 | Dependencies |
| `autentique-service/src/main.ts` | ~30 | Entrypoint |
| `autentique-service/src/modules/contracts/contracts.module.ts` | ~30 | Module |
| `autentique-service/src/modules/contracts/controllers/contracts.controller.ts` | ~120 | Endpoints |
| `autentique-service/src/modules/contracts/services/contracts.service.ts` | ~180 | Lógica |
| `autentique-service/src/infrastructure/autentique/autentique.client.ts` | ~200 | API client |
| `autentique-service/src/modules/contracts/controllers/webhooks.controller.ts` | ~80 | Webhooks |

---

#### Tasks Detalhadas

- [x] **[TASK-4.20.1]** Setup projeto autentique-service
      ```
      📁 Arquivos:
         • Criar: autentique-service/package.json (~50 linhas)
         • Criar: autentique-service/nest-cli.json (~15 linhas)
         • Criar: autentique-service/tsconfig.json (~25 linhas)
         • Criar: autentique-service/src/main.ts (~30 linhas)
         • Criar: autentique-service/src/app.module.ts (~25 linhas)
      
      🔗 Depende de: TASK-0.1.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 854-880)
      
      ⚠️ Validar:
         • npm run start:dev funciona
         • Healthcheck disponível
         • Logs estruturados
      ```

- [x] **[TASK-4.20.2]** Implementar Autentique API client
      ```
      📁 Arquivos:
         • Criar: autentique-service/src/infrastructure/autentique/autentique.client.ts (~200 linhas)
         • Criar: autentique-service/src/config/autentique.config.ts (~30 linhas)
      
      🔗 Depende de: TASK-4.20.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 881-910)
      
      ⚠️ Validar:
         • Auth com API key
         • createDocument() funciona
         • getDocument() retorna status
         • listSigners() retorna signatários
      ```

- [x] **[TASK-4.20.3]** Implementar contracts module
      ```
      📁 Arquivos:
         • Criar: autentique-service/src/modules/contracts/contracts.module.ts (~30 linhas)
         • Criar: autentique-service/src/modules/contracts/controllers/contracts.controller.ts (~120 linhas)
         • Criar: autentique-service/src/modules/contracts/services/contracts.service.ts (~180 linhas)
         • Criar: autentique-service/src/modules/contracts/dto/create-contract.dto.ts (~40 linhas)
         • Criar: autentique-service/src/modules/contracts/dto/contract-response.dto.ts (~35 linhas)
      
      🔗 Depende de: TASK-4.20.2
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 911-942)
      
      ⚠️ Validar:
         • POST /contracts envia contrato
         • GET /contracts/:id retorna status
         • GET /contracts lista por empresa
         • Persistência em core.contracts
      ```

- [x] **[TASK-4.20.4]** Implementar webhook receiver para status
      ```
      📁 Arquivos:
         • Criar: autentique-service/src/modules/contracts/controllers/webhooks.controller.ts (~80 linhas)
         • Criar: autentique-service/src/modules/contracts/events/contract-signed.event.ts (~30 linhas)
      
      🔗 Depende de: TASK-4.20.3
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 925-942)
      
      ⚠️ Validar:
         • POST /webhooks/autentique recebe eventos
         • Status do contrato atualizado
         • Evento contract.signed publicado
         • Notificação para responsável
      ```

- [x] **[TASK-4.20.5]** Integrar templates de contrato na API principal
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/contracts/contracts.module.ts (~25 linhas)
         • Criar: backoffice-api/src/modules/contracts/controllers/contract-templates.controller.ts (~100 linhas)
         • Criar: backoffice-api/src/modules/contracts/services/contract-templates.service.ts (~80 linhas)
      
      🔗 Depende de: TASK-4.20.3
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 665-695)
      
      ⚠️ Validar:
         • CRUD de templates
         • Upload de arquivo base
         • Variáveis mapeadas
         • Preview de contrato
      ```

- [x] **[TASK-4.20.6]** Implementar UI de contratos
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/contratos/page.tsx (~80 linhas)
         • Criar: backoffice-web/src/modules/contratos/components/contract-templates.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/contratos/components/contracts-list.tsx (~120 linhas)
         • Criar: backoffice-web/src/modules/contratos/components/contract-status.tsx (~80 linhas)
      
      🔗 Depende de: TASK-4.20.5
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 131-139)
      
      ⚠️ Validar:
         • Gerenciar templates
         • Lista de contratos enviados
         • Status de assinatura
         • Download de contrato assinado
      ```

**✅ CHECKPOINT EPIC-020:**
- [ ] Autentique service funcional
- [ ] Envio de contratos automatizado
- [ ] Webhooks atualizando status
- [ ] UI de gerenciamento funcional

---

### EPIC-021: Facebook CAPI (Conversions API)

#### Definição & Justificativa

- **O que:** Implementar o serviço `facebook-capi` para tracking server-side de eventos de marketing: configuração de pixels por empresa, envio de eventos (Lead, Purchase), e dashboard de métricas.

- **Por que:** Server-side tracking é mais preciso que client-side. Melhora atribuição de campanhas, otimização de algoritmos do Meta, e compliance com privacidade.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-facebook-capi.md` (linhas 1-130) — Propósito e capacidades
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 948-1070) — SVC-006

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `facebook-capi/package.json` | ~50 | Dependencies |
| `facebook-capi/src/main.ts` | ~30 | Entrypoint |
| `facebook-capi/src/modules/events/events.module.ts` | ~30 | Module |
| `facebook-capi/src/modules/events/services/event-sender.service.ts` | ~150 | Envio eventos |
| `facebook-capi/src/infrastructure/facebook/facebook.client.ts` | ~180 | Meta API client |
| `facebook-capi/src/modules/pixels/controllers/pixels.controller.ts` | ~100 | Config pixels |

---

#### Tasks Detalhadas

- [x] **[TASK-4.21.1]** Setup projeto facebook-capi
      ```
      📁 Arquivos:
         • Criar: facebook-capi/package.json (~50 linhas)
         • Criar: facebook-capi/nest-cli.json (~15 linhas)
         • Criar: facebook-capi/tsconfig.json (~25 linhas)
         • Criar: facebook-capi/src/main.ts (~30 linhas)
         • Criar: facebook-capi/src/app.module.ts (~25 linhas)
      
      🔗 Depende de: TASK-0.1.1
      
      📚 Referência: docs/architecture/arch-micro-facebook-capi.md (linhas 50-80)
      
      ⚠️ Validar:
         • npm run start:dev funciona
         • Healthcheck disponível
         • Logs estruturados
      ```

- [x] **[TASK-4.21.2]** Implementar Meta Conversions API client
      ```
      📁 Arquivos:
         • Criar: facebook-capi/src/infrastructure/facebook/facebook.client.ts (~180 linhas)
         • Criar: facebook-capi/src/config/facebook.config.ts (~30 linhas)
      
      🔗 Depende de: TASK-4.21.1
      
      📚 Referência: docs/architecture/arch-micro-facebook-capi.md (linhas 200-250)
      
      ⚠️ Validar:
         • Auth com access token
         • sendEvent() funciona
         • Hashing de PII correto
         • Test events mode
      ```

- [x] **[TASK-4.21.3]** Implementar CRUD de pixel configs na API principal
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/marketing/marketing.module.ts (~25 linhas)
         • Criar: backoffice-api/src/modules/marketing/controllers/pixels.controller.ts (~100 linhas)
         • Criar: backoffice-api/src/modules/marketing/services/pixels.service.ts (~80 linhas)
         • Criar: backoffice-api/src/modules/marketing/dto/create-pixel.dto.ts (~30 linhas)
      
      🔗 Depende de: TASK-1.5.6
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 700-730)
      
      ⚠️ Validar:
         • CRUD de pixels por empresa
         • Validação de pixel_id
         • Access token criptografado
         • Teste de conexão
      ```

- [x] **[TASK-4.21.4]** Implementar event subscriber e sender
      ```
      📁 Arquivos:
         • Criar: facebook-capi/src/modules/events/events.module.ts (~30 linhas)
         • Criar: facebook-capi/src/modules/events/subscribers/event.subscriber.ts (~80 linhas)
         • Criar: facebook-capi/src/modules/events/services/event-sender.service.ts (~150 linhas)
         • Criar: facebook-capi/src/modules/events/dto/marketing-event.dto.ts (~50 linhas)
      
      🔗 Depende de: TASK-4.21.2, TASK-0.2.2
      
      📚 Referência: docs/architecture/arch-micro-facebook-capi.md (linhas 130-180)
      
      ⚠️ Validar:
         • Subscriber escuta eventos
         • Lead event enviado para CAPI
         • Purchase event enviado
         • Queue para retry
      ```

- [x] **[TASK-4.21.5]** Integrar tracking no fluxo de leads
      ```
      📁 Arquivos:
         • Modificar: agent-runtime/src/modules/centurion/services/centurion_service.py (~30 linhas)
         • Modificar: agent-runtime/src/modules/handoff/services/handoff_service.py (~20 linhas)
      
      🔗 Depende de: TASK-4.21.4, TASK-4.19.2
      
      📚 Referência: docs/architecture/arch-micro-facebook-capi.md (linhas 181-200)
      
      ⚠️ Validar:
         • Novo lead → emite marketing.lead_created
         • Lead qualificado → emite marketing.lead_qualified
         • UTM params preservados
         • fbc/fbp cookies usados
      ```

- [x] **[TASK-4.21.6]** Implementar UI de marketing/pixels
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/marketing/page.tsx (~80 linhas)
         • Criar: backoffice-web/src/modules/marketing/components/pixels-config.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/marketing/components/events-log.tsx (~120 linhas)
      
      🔗 Depende de: TASK-4.21.3
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 140-148)
      
      ⚠️ Validar:
         • Configurar pixels
         • Ver log de eventos enviados
         • Status de envio
         • Métricas de eventos
      ```

**✅ CHECKPOINT EPIC-021:**
- [ ] Facebook CAPI service funcional
- [ ] Eventos de lead enviados
- [ ] UI de configuração de pixels
- [ ] Log de eventos acessível

---

### EPIC-022: Canais Adicionais (Instagram + Telegram)

#### Definição & Justificativa

- **O que:** Estender o sistema para suportar Instagram Direct e Telegram como canais de entrada, além do WhatsApp já implementado.

- **Por que:** Empresas usam múltiplos canais. Concentrar em WhatsApp limita alcance. Instagram é forte para B2C visual, Telegram para tech-savvy.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-evolution-manager.md` (linhas 420-480) — Multi-canal
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 630-640) — Canais

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `agent-runtime/src/modules/channels/adapters/instagram_adapter.py` | ~150 | Instagram adapter |
| `agent-runtime/src/modules/channels/adapters/telegram_adapter.py` | ~150 | Telegram adapter |
| `evolution-manager/src/modules/instances/channels/instagram.service.ts` | ~120 | Instagram via Evolution |
| `evolution-manager/src/modules/instances/channels/telegram.service.ts` | ~120 | Telegram via Bot API |
| `backoffice-web/src/modules/instancias/channels/instagram-config.tsx` | ~100 | UI Instagram |
| `backoffice-web/src/modules/instancias/channels/telegram-config.tsx` | ~100 | UI Telegram |

---

#### Tasks Detalhadas

- [x] **[TASK-4.22.1]** Implementar Instagram adapter no Agent Runtime
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/channels/adapters/instagram_adapter.py (~150 linhas)
         • Criar: agent-runtime/src/modules/channels/adapters/base_adapter.py (~80 linhas)
      
      🔗 Depende de: TASK-2.10.3
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 320-360)
      
      ⚠️ Validar:
         • Normaliza mensagens IG para formato interno
         • Extrai mídia corretamente
         • Envia resposta via adapter
         • Trata stories/mentions
      ```

- [x] **[TASK-4.22.2]** Implementar Telegram adapter no Agent Runtime
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/channels/adapters/telegram_adapter.py (~150 linhas)
      
      🔗 Depende de: TASK-4.22.1
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 361-400)
      
      ⚠️ Validar:
         • Normaliza mensagens TG para formato interno
         • Suporta grupos e privado
         • Envia resposta via adapter
         • Trata comandos (/start, etc)
      ```

- [x] **[TASK-4.22.3]** Implementar Instagram service no Evolution Manager
      ```
      📁 Arquivos:
         • Criar: evolution-manager/src/modules/instances/channels/instagram.service.ts (~120 linhas)
         • Modificar: evolution-manager/src/modules/instances/services/instances.service.ts (~40 linhas)
      
      🔗 Depende de: TASK-2.9.3
      
      📚 Referência: docs/architecture/arch-micro-evolution-manager.md (linhas 420-450)
      
      ⚠️ Validar:
         • Conexão via Evolution (se suportado)
         • Ou conexão direta Meta Graph API
         • Recebe mensagens do Instagram
         • Envia respostas
      ```

- [x] **[TASK-4.22.4]** Implementar Telegram service
      ```
      📁 Arquivos:
         • Criar: evolution-manager/src/modules/instances/channels/telegram.service.ts (~120 linhas)
         • Criar: evolution-manager/src/config/telegram.config.ts (~25 linhas)
      
      🔗 Depende de: TASK-2.9.3
      
      📚 Referência: docs/architecture/arch-micro-evolution-manager.md (linhas 451-480)
      
      ⚠️ Validar:
         • Conexão via Telegram Bot API
         • setWebhook configurado
         • Recebe mensagens
         • Envia respostas
      ```

- [x] **[TASK-4.22.5]** Implementar UI de configuração multi-canal
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/modules/instancias/channels/instagram-config.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/instancias/channels/telegram-config.tsx (~100 linhas)
         • Modificar: backoffice-web/src/modules/instancias/components/create-instance-modal.tsx (~50 linhas)
      
      🔗 Depende de: TASK-4.22.3, TASK-4.22.4
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 66-74)
      
      ⚠️ Validar:
         • Selector de tipo de canal
         • Config específica por canal
         • Status de conexão
         • Teste de envio
      ```

- [~] **[TASK-4.22.6]** Unificar roteamento de mensagens por canal
      ```
      📁 Arquivos:
         • Criar: agent-runtime/src/modules/channels/services/channel_router.py (~100 linhas)
         • Modificar: agent-runtime/src/modules/centurion/handlers/message_handler.py (~30 linhas)
      
      🔗 Depende de: TASK-4.22.1, TASK-4.22.2
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 401-419)
      
      ⚠️ Validar:
         • Router seleciona adapter por channel_type
         • Normalização unificada
         • Response roteada para canal correto
         • Métricas por canal
      ```

**✅ CHECKPOINT EPIC-022:**
- [ ] Instagram integrado
- [ ] Telegram integrado
- [ ] Roteamento multi-canal funcional
- [ ] UI para todos os canais

---

**✅ CHECKPOINT FASE 4:**
- [ ] Handoff funcionando end-to-end
- [ ] Autentique enviando contratos
- [ ] Facebook CAPI rastreando eventos
- [ ] 3 canais operacionais (WA/IG/TG)
- [ ] Deploy em ambiente staging
- [ ] Testes de integração passando

---

## Fase 5 — Métricas & Operação

**Objetivo:** Implementar dashboard de métricas consolidadas, leads management, timeline de conversas, e ferramentas operacionais do supervisor de IA.  
**EPICs:** EPIC-023, EPIC-024, EPIC-025

---

### EPIC-023: Dashboard de Métricas Consolidadas

#### Definição & Justificativa

- **O que:** Implementar dashboard com métricas em tempo real: leads por status, conversão, tempo médio de qualificação, performance por Centurion, comparativos por empresa.

- **Por que:** O dono da holding precisa de visibilidade. Sem métricas, não há como avaliar ROI, identificar problemas, ou comparar performance entre empresas.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-backoffice-api.md` (linhas 735-790) — Métricas endpoints
  - 📄 `docs/business-context/05-escopo-v1.md` (linhas 96-118) — Métricas V1
  - 📄 `docs/architecture/arch-micro-backoffice-web.md` (linhas 149-170) — UI métricas

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `backoffice-api/src/modules/metrics/metrics.module.ts` | ~30 | Module |
| `backoffice-api/src/modules/metrics/controllers/metrics.controller.ts` | ~150 | Endpoints |
| `backoffice-api/src/modules/metrics/services/metrics.service.ts` | ~250 | Agregações |
| `backoffice-api/src/infrastructure/redis/cache.service.ts` | ~80 | Cache helper |
| `backoffice-web/src/app/(dashboard)/page.tsx` | ~150 | Dashboard home |
| `backoffice-web/src/modules/metricas/components/metrics-cards.tsx` | ~100 | Cards KPI |
| `backoffice-web/src/modules/metricas/components/conversion-chart.tsx` | ~120 | Gráficos |

---

#### Tasks Detalhadas

- [x] **[TASK-5.23.1]** Implementar metrics service com agregações
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/metrics/metrics.module.ts (~30 linhas)
         • Criar: backoffice-api/src/modules/metrics/services/metrics.service.ts (~250 linhas)
         • Criar: backoffice-api/src/modules/metrics/dto/metrics-response.dto.ts (~60 linhas)
      
      🔗 Depende de: TASK-1.5.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 735-760)
      
      ⚠️ Validar:
         • Conta leads por status
         • Calcula taxa de conversão
         • Tempo médio de qualificação
         • Agregação por período
      ```

- [x] **[TASK-5.23.2]** Implementar cache de métricas
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/infrastructure/redis/cache.service.ts (~80 linhas)
         • Modificar: backoffice-api/src/modules/metrics/services/metrics.service.ts (~40 linhas)
      
      🔗 Depende de: TASK-5.23.1, TASK-1.5.2
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 761-775)
      
      ⚠️ Validar:
         • Métricas cacheadas por 5 min
         • Invalidação em alterações
         • Cache por company_id
         • TTL configurável
      ```

- [x] **[TASK-5.23.3]** Implementar endpoints de métricas
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/metrics/controllers/metrics.controller.ts (~150 linhas)
      
      🔗 Depende de: TASK-5.23.2
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 776-790)
      
      ⚠️ Validar:
         • GET /metrics/summary retorna KPIs
         • GET /metrics/conversion retorna funil
         • GET /metrics/by-centurion retorna por bot
         • GET /metrics/timeline retorna série temporal
      ```

- [x] **[TASK-5.23.4]** Implementar WebSocket para real-time
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/infrastructure/ws/ws.gateway.ts (~100 linhas)
         • Criar: backoffice-api/src/infrastructure/ws/ws.module.ts (~25 linhas)
      
      🔗 Depende de: TASK-5.23.3
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 800-830)
      
      ⚠️ Validar:
         • Conexão WS estabelecida
         • Push de novas métricas
         • Push de novos leads
         • Rooms por company_id
      ```

- [x] **[TASK-5.23.5]** Implementar dashboard UI com gráficos
      ```
      📁 Arquivos:
         • Modificar: backoffice-web/src/app/(dashboard)/page.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/metricas/components/metrics-cards.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/metricas/components/conversion-chart.tsx (~120 linhas)
         • Criar: backoffice-web/src/modules/metricas/components/leads-timeline.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/metricas/hooks/use-metrics.ts (~60 linhas)
      
      🔗 Depende de: TASK-5.23.3, TASK-5.23.4
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 149-170)
      
      ⚠️ Validar:
         • Cards de KPIs
         • Gráfico de conversão
         • Timeline de leads
         • Atualização real-time
         • Filtros por período
      ```

**✅ CHECKPOINT EPIC-023:**
- [ ] Métricas calculadas corretamente
- [ ] Cache funcionando
- [ ] Real-time via WebSocket
- [ ] Dashboard visual completo

---

### EPIC-024: Leads Management + Timeline

#### Definição & Justificativa

- **O que:** Implementar tela de gestão de leads: listagem com filtros, busca, detalhes do lead, timeline de conversa com todas as mensagens, e ações rápidas.

- **Por que:** O supervisor de IA precisa ver conversas para ajustar prompts, identificar problemas, e intervir quando necessário. Timeline é a "janela" para o trabalho do SDR.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-backoffice-api.md` (linhas 480-524) — Leads endpoints
  - 📄 `docs/architecture/arch-micro-backoffice-web.md` (linhas 75-94) — UI leads
  - 📄 `docs/business-context/05-escopo-v1.md` (linhas 57-72) — Requisitos leads

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `backoffice-api/src/modules/leads/leads.module.ts` | ~30 | Module |
| `backoffice-api/src/modules/leads/controllers/leads.controller.ts` | ~150 | CRUD leads |
| `backoffice-api/src/modules/leads/services/leads.service.ts` | ~180 | Lógica |
| `backoffice-api/src/modules/leads/services/timeline.service.ts` | ~120 | Timeline |
| `backoffice-web/src/app/(dashboard)/leads/page.tsx` | ~100 | Lista leads |
| `backoffice-web/src/modules/leads/components/lead-timeline.tsx` | ~200 | Timeline visual |

---

#### Tasks Detalhadas

- [x] **[TASK-5.24.1]** Implementar leads module com CRUD
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/leads/leads.module.ts (~30 linhas)
         • Criar: backoffice-api/src/modules/leads/controllers/leads.controller.ts (~150 linhas)
         • Criar: backoffice-api/src/modules/leads/services/leads.service.ts (~180 linhas)
         • Criar: backoffice-api/src/modules/leads/dto/lead-response.dto.ts (~50 linhas)
         • Criar: backoffice-api/src/modules/leads/dto/lead-filters.dto.ts (~40 linhas)
      
      🔗 Depende de: TASK-1.5.6
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 480-510)
      
      ⚠️ Validar:
         • GET /leads lista com paginação
         • GET /leads/:id retorna detalhes
         • Filtros por status, data, canal
         • Busca por nome/telefone
      ```

- [x] **[TASK-5.24.2]** Implementar timeline service
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/leads/services/timeline.service.ts (~120 linhas)
         • Criar: backoffice-api/src/modules/leads/dto/timeline-response.dto.ts (~40 linhas)
      
      🔗 Depende de: TASK-5.24.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 511-524)
      
      ⚠️ Validar:
         • GET /leads/:id/timeline retorna mensagens
         • Inclui áudio transcrições
         • Inclui imagem descrições
         • Ordenação cronológica
         • Paginação para longas
      ```

- [x] **[TASK-5.24.3]** Implementar UI de listagem de leads
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/leads/page.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/leads/components/leads-list.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/leads/components/leads-filters.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/leads/hooks/use-leads.ts (~60 linhas)
      
      🔗 Depende de: TASK-5.24.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 75-85)
      
      ⚠️ Validar:
         • Tabela com leads
         • Filtros funcionais
         • Busca funcional
         • Paginação
         • Click abre detalhes
      ```

- [x] **[TASK-5.24.4]** Implementar UI de timeline do lead
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/leads/[id]/page.tsx (~80 linhas)
         • Criar: backoffice-web/src/modules/leads/components/lead-details.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/leads/components/lead-timeline.tsx (~200 linhas)
         • Criar: backoffice-web/src/modules/leads/components/message-bubble.tsx (~80 linhas)
      
      🔗 Depende de: TASK-5.24.2, TASK-5.24.3
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 86-94)
      
      ⚠️ Validar:
         • Detalhes do lead
         • Timeline estilo chat
         • Mensagens do usuário vs bot
         • Transcrições de áudio
         • Descrições de imagem
      ```

**✅ CHECKPOINT EPIC-024:**
- [ ] CRUD de leads funcional
- [ ] Timeline completa
- [ ] UI de listagem responsiva
- [ ] Detalhes do lead com histórico

---

### EPIC-025: Centurions Management (CRUD + Config)

#### Definição & Justificativa

- **O que:** Implementar gestão completa de Centurions: CRUD, configuração de prompts, regras de qualificação, capacidades, e testes integrados.

- **Por que:** Cada empresa configura seus SDRs de forma diferente. O supervisor precisa criar, ajustar e testar bots sem intervenção técnica.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/arch-micro-backoffice-api.md` (linhas 378-435) — Centurions endpoints
  - 📄 `docs/architecture/arch-micro-backoffice-web.md` (linhas 95-121) — UI centurions
  - 📄 `docs/business-context/03-modelo-de-entidades.md` (linhas 132-195) — centurion_configs

#### Impacto Técnico & Arquitetural

**Arquivos a criar:**

| Arquivo | Linhas Est. | Descrição |
|---------|-------------|-----------|
| `backoffice-api/src/modules/centurions/centurions.module.ts` | ~35 | Module |
| `backoffice-api/src/modules/centurions/controllers/centurions.controller.ts` | ~180 | CRUD |
| `backoffice-api/src/modules/centurions/services/centurions.service.ts` | ~200 | Lógica |
| `backoffice-web/src/app/(dashboard)/centurions/page.tsx` | ~100 | Lista |
| `backoffice-web/src/modules/centurions/components/centurion-editor.tsx` | ~300 | Editor |

---

#### Tasks Detalhadas

- [x] **[TASK-5.25.1]** Implementar centurions module com CRUD
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/centurions/centurions.module.ts (~35 linhas)
         • Criar: backoffice-api/src/modules/centurions/controllers/centurions.controller.ts (~180 linhas)
         • Criar: backoffice-api/src/modules/centurions/services/centurions.service.ts (~200 linhas)
         • Criar: backoffice-api/src/modules/centurions/dto/create-centurion.dto.ts (~80 linhas)
         • Criar: backoffice-api/src/modules/centurions/dto/centurion-response.dto.ts (~70 linhas)
      
      🔗 Depende de: TASK-1.5.6
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 378-410)
      
      ⚠️ Validar:
         • POST /centurions cria
         • GET /centurions lista por empresa
         • GET /centurions/:id detalhes
         • PUT /centurions/:id atualiza
         • DELETE /centurions/:id remove
      ```

- [x] **[TASK-5.25.2]** Implementar endpoint de teste de centurion
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/centurions/controllers/centurion-test.controller.ts (~80 linhas)
         • Criar: backoffice-api/src/modules/centurions/services/centurion-test.service.ts (~100 linhas)
      
      🔗 Depende de: TASK-5.25.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 411-435)
      
      ⚠️ Validar:
         • POST /centurions/:id/test envia mensagem
         • Retorna resposta do bot
         • Não persiste conversa
         • Útil para testar prompts
      ```

- [x] **[TASK-5.25.3]** Implementar UI de listagem de centurions
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/centurions/page.tsx (~100 linhas)
         • Criar: backoffice-web/src/modules/centurions/components/centurions-list.tsx (~120 linhas)
         • Criar: backoffice-web/src/modules/centurions/hooks/use-centurions.ts (~50 linhas)
      
      🔗 Depende de: TASK-5.25.1
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 95-103)
      
      ⚠️ Validar:
         • Lista centurions
         • Status (ativo/inativo)
         • Click abre editor
         • Criar novo centurion
      ```

- [x] **[TASK-5.25.4]** Implementar editor de centurion
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/app/(dashboard)/centurions/[id]/page.tsx (~80 linhas)
         • Criar: backoffice-web/src/modules/centurions/components/centurion-editor.tsx (~300 linhas)
         • Criar: backoffice-web/src/modules/centurions/components/prompt-editor.tsx (~150 linhas)
         • Criar: backoffice-web/src/modules/centurions/components/qualification-rules.tsx (~120 linhas)
         • Criar: backoffice-web/src/modules/centurions/components/capabilities-config.tsx (~100 linhas)
      
      🔗 Depende de: TASK-5.25.3
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 104-121)
      
      ⚠️ Validar:
         • Editor de system prompt
         • Config de regras de qualificação
         • Toggles de capacidades
         • Config de humanização
         • Preview de prompt
      ```

- [x] **[TASK-5.25.5]** Implementar playground de teste na UI
      ```
      📁 Arquivos:
         • Criar: backoffice-web/src/modules/centurions/components/centurion-playground.tsx (~200 linhas)
      
      🔗 Depende de: TASK-5.25.2, TASK-5.25.4
      
      📚 Referência: docs/architecture/arch-micro-backoffice-web.md (linhas 113-121)
      
      ⚠️ Validar:
         • Chat de teste
         • Enviar mensagem
         • Ver resposta do bot
         • Reset de conversa
      ```

**✅ CHECKPOINT EPIC-025:**
- [ ] CRUD de centurions funcional
- [ ] Editor completo de config
- [ ] Playground de teste funcional
- [ ] UI intuitiva para não-técnicos

---

**✅ CHECKPOINT FASE 5:**
- [ ] Dashboard de métricas completo
- [ ] Gestão de leads funcional
- [ ] Timeline de conversas visível
- [ ] Gestão de centurions completa
- [ ] Deploy em ambiente staging
- [ ] UAT com stakeholders aprovado

---

## Fase 6 — Produção & Escalabilidade

**Objetivo:** Preparar sistema para produção: testes abrangentes, observabilidade, segurança hardening, documentação e runbooks.  
**EPICs:** EPIC-026, EPIC-027, EPIC-028

---

### EPIC-026: Testes Abrangentes (Unit + Integration + E2E)

#### Definição & Justificativa

- **O que:** Implementar cobertura de testes completa: unit tests para services, integration tests para APIs, E2E tests para fluxos críticos, e testes específicos de RLS.

- **Por que:** Produção exige confiabilidade. Sem testes, cada deploy é um risco. Testes de RLS são críticos para multi-tenancy. Coverage mínima de 80%.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1593-1658) — Testing strategy
  - 📄 `docs/business-context/05-escopo-v1.md` (linhas 273-310) — Requisitos não-funcionais

#### Tasks Detalhadas

- [x] **[TASK-6.26.1]** Implementar unit tests para backoffice-api
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/modules/**/*.spec.ts (~2000 linhas total)
         • Criar: backoffice-api/jest.config.ts (~30 linhas)
      
      🔗 Depende de: TASK-5.25.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1593-1610)
      
      ⚠️ Validar:
         • Coverage > 80% em services
         • Mocks para dependencies
         • Testes de edge cases
         • CI rodando testes
      ```

- [x] **[TASK-6.26.2]** Implementar integration tests para APIs
      ```
      📁 Arquivos:
         • Criar: backoffice-api/test/integration/**/*.e2e-spec.ts (~1500 linhas total)
         • Criar: backoffice-api/test/setup.ts (~50 linhas)
      
      🔗 Depende de: TASK-6.26.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1611-1630)
      
      ⚠️ Validar:
         • Banco de testes isolado
         • Todos endpoints testados
         • Auth flow testado
         • Error handling testado
      ```

- [x] **[TASK-6.26.3]** Implementar testes de RLS
      ```
      📁 Arquivos:
         • Criar: supabase/tests/rls/*.test.sql (~500 linhas total)
         • Criar: backoffice-api/test/rls/*.e2e-spec.ts (~300 linhas)
      
      🔗 Depende de: TASK-1.4.6
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1631-1645)
      
      ⚠️ Validar:
         • Cross-tenant isolation testado
         • Todas as tabelas testadas
         • Bypass attempts testados
         • CI rodando testes RLS
      ```

- [x] **[TASK-6.26.4]** Implementar E2E tests para fluxos críticos
      ```
      📁 Arquivos:
         • Criar: e2e/tests/**/*.spec.ts (~800 linhas total)
         • Criar: e2e/playwright.config.ts (~40 linhas)
         • Criar: e2e/fixtures/*.ts (~200 linhas)
      
      🔗 Depende de: TASK-6.26.2
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1646-1658)
      
      ⚠️ Validar:
         • Login flow testado
         • Criar empresa testado
         • Fluxo de lead testado
         • Handoff testado
         • Ci com Playwright
      ```

- [x] **[TASK-6.26.5]** Implementar unit tests para agent-runtime
      ```
      📁 Arquivos:
         • Criar: agent-runtime/tests/**/*.py (~1500 linhas total)
         • Criar: agent-runtime/pytest.ini (~20 linhas)
         • Criar: agent-runtime/tests/conftest.py (~100 linhas)
      
      🔗 Depende de: TASK-3.18.4
      
      📚 Referência: docs/architecture/arch-micro-agent-runtime.md (linhas 991-1020)
      
      ⚠️ Validar:
         • Coverage > 80%
         • Mocks para LLM calls
         • Testes de handlers
         • Testes de services
      ```

**✅ CHECKPOINT EPIC-026:**
- [ ] Unit tests com 80%+ coverage
- [ ] Integration tests passando
- [ ] RLS tests passando
- [ ] E2E tests em CI

---

### EPIC-027: Observabilidade (Logs + Metrics + Traces)

#### Definição & Justificativa

- **O que:** Implementar observabilidade completa: logs estruturados (JSON), métricas Prometheus, traces distribuídos, e alertas para anomalias.

- **Por que:** Sem observabilidade, debugging em produção é impossível. Logs estruturados permitem queries. Métricas permitem dashboards. Traces permitem rastrear requests.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1659-1730) — Observability
  - 📄 `docs/architecture/arch-micro-agent-runtime.md` (linhas 1021-1060) — Agent observability

#### Tasks Detalhadas

- [x] **[TASK-6.27.1]** Implementar logs estruturados em todos os serviços
      ```
      📁 Arquivos:
         • Criar: packages/logger/src/index.ts (~80 linhas)
         • Modificar: backoffice-api/src/main.ts (~20 linhas)
         • Modificar: agent-runtime/src/api/main.py (~20 linhas)
         • Modificar: evolution-manager/src/main.ts (~20 linhas)
      
      🔗 Depende de: TASK-0.2.5
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1659-1680)
      
      ⚠️ Validar:
         • Logs em JSON
         • Request ID propagado
         • Correlation ID entre serviços
         • Sensitive data masking
      ```

- [x] **[TASK-6.27.2]** Implementar métricas Prometheus
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/infrastructure/metrics/prometheus.module.ts (~50 linhas)
         • Criar: agent-runtime/src/api/routes/metrics.py (~40 linhas)
         • Criar: infra/observability/prometheus.yml (~60 linhas)
      
      🔗 Depende de: TASK-6.27.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1681-1700)
      
      ⚠️ Validar:
         • /metrics endpoint em cada serviço
         • Métricas de request (latency, count)
         • Métricas de negócio (leads, messages)
         • Prometheus scraping
      ```

- [x] **[TASK-6.27.3]** Implementar traces distribuídos
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/infrastructure/tracing/tracing.module.ts (~60 linhas)
         • Criar: agent-runtime/src/common/infrastructure/tracing/tracer.py (~50 linhas)
         • Criar: infra/observability/jaeger.yml (~40 linhas)
      
      🔗 Depende de: TASK-6.27.2
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1701-1720)
      
      ⚠️ Validar:
         • OpenTelemetry configurado
         • Spans criados automaticamente
         • Context propagation
         • Jaeger/Zipkin integrável
      ```

- [x] **[TASK-6.27.4]** Implementar auditoria de operações
      ```
      📁 Arquivos:
         • Criar: backoffice-api/src/infrastructure/audit/audit.module.ts (~40 linhas)
         • Criar: backoffice-api/src/infrastructure/audit/audit.interceptor.ts (~80 linhas)
         • Criar: supabase/migrations/00070_audit_logs.sql (~50 linhas)
      
      🔗 Depende de: TASK-6.27.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1721-1730)
      
      ⚠️ Validar:
         • Operações CRUD auditadas
         • User ID registrado
         • Timestamp registrado
         • Query de auditoria funcional
      ```

**✅ CHECKPOINT EPIC-027:**
- [ ] Logs estruturados em produção
- [ ] Métricas Prometheus coletadas
- [ ] Traces rastreáveis
- [ ] Auditoria funcional

---

### EPIC-028: Documentação & Runbooks

#### Definição & Justificativa

- **O que:** Criar documentação operacional completa: runbooks para incidentes, guias de deploy, arquitetura atualizada, e API documentation.

- **Por que:** Equipe de operações precisa de runbooks. Novos devs precisam de onboarding docs. API docs permitem integrações. Documentação é investimento em escalabilidade de time.

- **Referências arquiteturais:**
  - 📄 `docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md` (linhas 1731-1780) — Docs strategy

#### Tasks Detalhadas

- [x] **[TASK-6.28.1]** Criar runbooks de incidentes
      ```
      📁 Arquivos:
         • Criar: infra/runbooks/database-issues.md (~100 linhas)
         • Criar: infra/runbooks/redis-issues.md (~80 linhas)
         • Criar: infra/runbooks/agent-runtime-issues.md (~100 linhas)
         • Criar: infra/runbooks/whatsapp-issues.md (~80 linhas)
      
      🔗 Depende de: TASK-6.27.4
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1731-1750)
      
      ⚠️ Validar:
         • Sintomas descritos
         • Diagnóstico step-by-step
         • Ações de mitigação
         • Escalation path
      ```

- [x] **[TASK-6.28.2]** Criar guia de deploy
      ```
      📁 Arquivos:
         • Criar: infra/deploy/README.md (~200 linhas)
         • Criar: infra/deploy/checklist.md (~100 linhas)
         • Criar: infra/deploy/rollback.md (~80 linhas)
      
      🔗 Depende de: TASK-6.28.1
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1751-1765)
      
      ⚠️ Validar:
         • Pre-deploy checklist
         • Deploy procedure
         • Smoke tests
         • Rollback procedure
      ```

- [x] **[TASK-6.28.3]** Atualizar documentação de arquitetura
      ```
      📁 Arquivos:
         • Modificar: docs/architecture/*.md (revisão completa)
         • Criar: docs/architecture/event-catalog.md (~300 linhas)
         • Criar: docs/architecture/data-dictionary.md (~200 linhas)
      
      🔗 Depende de: TASK-6.28.2
      
      📚 Referência: docs/architecture/ARCH-MACRO-v2.0-backoffice-holding.md (linhas 1766-1780)
      
      ⚠️ Validar:
         • Diagramas atualizados
         • Fluxos documentados
         • Eventos catalogados
         • Dados dicionarizados
      ```

- [x] **[TASK-6.28.4]** Gerar API documentation completa
      ```
      📁 Arquivos:
         • Criar: docs/api/openapi.json (~auto-generated)
         • Criar: docs/api/README.md (~50 linhas)
      
      🔗 Depende de: TASK-1.5.5
      
      📚 Referência: docs/architecture/arch-micro-backoffice-api.md (linhas 1180-1198)
      
      ⚠️ Validar:
         • Swagger UI acessível
         • Todos endpoints documentados
         • Examples em cada endpoint
         • Auth requirements claros
      ```

**✅ CHECKPOINT EPIC-028:**
- [ ] Runbooks criados
- [ ] Guia de deploy completo
- [ ] Arquitetura documentada
- [ ] API docs geradas

---

**✅ CHECKPOINT FASE 6:**
- [ ] Testes com 80%+ coverage
- [ ] Observabilidade completa
- [ ] Documentação operacional
- [ ] Sistema pronto para produção
- [ ] Go-live checklist completo

---

# MATRIZ DE DEPENDÊNCIAS

## Visão Geral de Dependências por Fase

```
FASE 0 (Infraestrutura)
    │
    ├── TASK-0.1.* (Setup repos/Docker)
    │       │
    │       └── TASK-0.2.* (Contracts/Logging)
    │
    ▼
FASE 1 (Fundação)
    │
    ├── TASK-1.3.* (Schema CORE) ──────────────────┐
    │       │                                       │
    │       ├── TASK-1.4.* (RLS/Security)          │
    │       │       │                               │
    │       │       └── TASK-1.6.* (Governança)    │
    │       │               │                       │
    │       └───────────────┼───────────────────────┤
    │                       │                       │
    ├── TASK-1.5.* (API Bootstrap)                 │
    │       │                                       │
    │       └── TASK-1.7.* (Web Bootstrap) ◄───────┘
    │
    ▼
FASE 2 (Qualificação IA)
    │
    ├── TASK-2.8.* (Agent Runtime) ◄── FASE 1
    │       │
    │       ├── TASK-2.9.* (Evolution Manager)
    │       │       │
    │       │       └── TASK-2.10.* (Centurion Core)
    │       │               │
    │       │               ├── TASK-2.11.* (Humanização)
    │       │               │
    │       │               ├── TASK-2.12.* (Multimodal)
    │       │               │
    │       │               └── TASK-2.13.* (Memória Curta)
    │
    ▼
FASE 3 (Inteligência Avançada)
    │
    ├── TASK-3.14.* (RAG) ◄── FASE 2
    │
    ├── TASK-3.15.* (Tools)
    │
    ├── TASK-3.16.* (MCP)
    │
    ├── TASK-3.17.* (Knowledge Base)
    │
    └── TASK-3.18.* (Follow-ups)
    │
    ▼
FASE 4 (Handoff & Integrações)
    │
    ├── TASK-4.19.* (Handoff) ◄── FASE 3
    │
    ├── TASK-4.20.* (Autentique)
    │
    ├── TASK-4.21.* (Facebook CAPI)
    │
    └── TASK-4.22.* (Multi-canal)
    │
    ▼
FASE 5 (Métricas & Operação)
    │
    ├── TASK-5.23.* (Dashboard Métricas) ◄── FASE 4
    │
    ├── TASK-5.24.* (Leads Management)
    │
    └── TASK-5.25.* (Centurions Management)
    │
    ▼
FASE 6 (Produção)
    │
    ├── TASK-6.26.* (Testes) ◄── FASE 5
    │
    ├── TASK-6.27.* (Observabilidade)
    │
    └── TASK-6.28.* (Documentação)
```

## Tabela Detalhada de Dependências

| Task | Depende de | Risco | Paraleliza com | Prioridade |
|------|-----------|-------|----------------|------------|
| **FASE 0** | | | | |
| TASK-0.1.1 | - | 🟢 Low | - | P0 |
| TASK-0.1.2 | - | 🟢 Low | TASK-0.1.1 | P0 |
| TASK-0.1.3 | - | 🟢 Low | TASK-0.1.1, TASK-0.1.2 | P0 |
| TASK-0.1.4 | - | 🟢 Low | TASK-0.1.1, TASK-0.1.2 | P0 |
| TASK-0.1.5 | - | 🟢 Low | TASK-0.1.1, TASK-0.1.2 | P0 |
| TASK-0.2.1 | TASK-0.1.* | 🟡 Med | - | P0 |
| TASK-0.2.2 | TASK-0.2.1 | 🟡 Med | - | P0 |
| TASK-0.2.3 | TASK-0.2.2 | 🟢 Low | - | P1 |
| TASK-0.2.4 | TASK-0.2.2 | 🟢 Low | TASK-0.2.3 | P1 |
| TASK-0.2.5 | - | 🟢 Low | TASK-0.2.* | P1 |
| **FASE 1** | | | | |
| TASK-1.3.1 | TASK-0.1.1 | 🟢 Low | - | P0 |
| TASK-1.3.2 | TASK-1.3.1 | 🟢 Low | - | P0 |
| TASK-1.3.3 | TASK-1.3.2 | 🟢 Low | - | P0 |
| TASK-1.3.4 | TASK-1.3.2 | 🟢 Low | TASK-1.3.3 | P0 |
| TASK-1.3.5 | TASK-1.3.2 | 🟢 Low | TASK-1.3.3, TASK-1.3.4 | P0 |
| TASK-1.3.6 | TASK-1.3.3, TASK-1.3.4 | 🟡 Med | - | P0 |
| TASK-1.3.7 | TASK-1.3.3 | 🟡 Med | TASK-1.3.6 | P0 |
| TASK-1.3.8 | TASK-1.3.6, TASK-1.3.7 | 🟢 Low | - | P0 |
| TASK-1.4.1 | TASK-0.1.4 | 🟡 Med | - | P0 |
| TASK-1.4.2 | TASK-1.4.1 | 🟡 Med | - | P0 |
| TASK-1.4.3 | TASK-1.4.2 | 🟡 Med | - | P0 |
| TASK-1.4.4 | TASK-1.3.8 | 🔴 High | - | P0 |
| TASK-1.4.5 | TASK-1.4.4 | 🟡 Med | - | P0 |
| TASK-1.4.6 | TASK-1.4.4 | 🟡 Med | TASK-1.4.5 | P0 |
| TASK-1.5.1 | TASK-0.1.4, TASK-1.3.8 | 🟡 Med | - | P0 |
| TASK-1.5.2 | TASK-0.1.4 | 🟢 Low | TASK-1.5.1 | P0 |
| TASK-1.5.3 | TASK-1.5.2, TASK-0.2.2 | 🟡 Med | - | P0 |
| TASK-1.5.4 | TASK-0.2.5 | 🟢 Low | TASK-1.5.* | P1 |
| TASK-1.5.5 | TASK-0.1.4 | 🟢 Low | TASK-1.5.* | P1 |
| TASK-1.5.6 | TASK-1.4.1, TASK-1.5.1 | 🟡 Med | - | P0 |
| TASK-1.6.1 | TASK-1.3.8 | 🟡 Med | - | P0 |
| TASK-1.6.2 | TASK-1.6.1 | 🔴 High | - | P0 |
| TASK-1.6.3 | TASK-1.5.6, TASK-1.4.2 | 🟡 Med | - | P0 |
| TASK-1.6.4 | TASK-1.6.2, TASK-1.6.3 | 🔴 High | - | P0 |
| TASK-1.6.5 | TASK-1.6.3 | 🟢 Low | TASK-1.6.4 | P1 |
| TASK-1.7.1 | TASK-0.1.3 | 🟢 Low | - | P1 |
| TASK-1.7.2 | TASK-1.7.1 | 🟡 Med | - | P1 |
| TASK-1.7.3 | TASK-1.7.2 | 🟡 Med | - | P1 |
| TASK-1.7.4 | TASK-1.7.2 | 🟡 Med | TASK-1.7.3 | P1 |
| TASK-1.7.5 | TASK-1.7.4 | 🟢 Low | - | P1 |
| TASK-1.7.6 | TASK-1.7.5, TASK-1.6.3 | 🟡 Med | - | P1 |
| TASK-1.7.7 | TASK-1.7.6 | 🟢 Low | - | P1 |
| **FASE 2** | | | | |
| TASK-2.8.1 | TASK-0.1.5 | 🟢 Low | - | P0 |
| TASK-2.8.2 | TASK-2.8.1 | 🟢 Low | - | P0 |
| TASK-2.8.3 | TASK-2.8.2, TASK-1.3.8 | 🟡 Med | - | P0 |
| TASK-2.8.4 | TASK-2.8.2 | 🟢 Low | TASK-2.8.3 | P0 |
| TASK-2.8.5 | TASK-2.8.4, TASK-0.2.2 | 🟡 Med | - | P0 |
| TASK-2.8.6 | TASK-2.8.3, TASK-2.8.4 | 🟢 Low | - | P0 |
| TASK-2.9.1 | TASK-0.1.1 | 🟢 Low | TASK-2.8.* | P0 |
| TASK-2.9.2 | TASK-2.9.1 | 🔴 High | - | P0 |
| TASK-2.9.3 | TASK-2.9.2 | 🟡 Med | - | P0 |
| TASK-2.9.4 | TASK-2.9.3 | 🟡 Med | - | P0 |
| TASK-2.9.5 | TASK-2.9.4, TASK-0.2.2 | 🟡 Med | - | P0 |
| TASK-2.9.6 | TASK-2.9.3, TASK-1.7.5 | 🟡 Med | - | P1 |
| TASK-2.10.1 | TASK-2.8.3 | 🟢 Low | - | P0 |
| TASK-2.10.2 | TASK-2.10.1 | 🟡 Med | - | P0 |
| TASK-2.10.3 | TASK-2.8.5, TASK-2.10.2 | 🔴 High | - | P0 |
| TASK-2.10.4 | TASK-2.10.2 | 🟡 Med | TASK-2.10.3 | P0 |
| TASK-2.10.5 | TASK-2.10.3, TASK-2.10.4 | 🔴 High | - | P0 |
| TASK-2.10.6 | TASK-2.10.5 | 🔴 High | - | P0 |
| TASK-2.10.7 | TASK-2.10.5, TASK-2.9.2 | 🔴 High | - | P0 |
| TASK-2.11.1 | TASK-2.10.3 | 🟡 Med | - | P1 |
| TASK-2.11.2 | TASK-2.10.5 | 🟡 Med | TASK-2.11.1 | P1 |
| TASK-2.11.3 | TASK-2.11.1 | 🟢 Low | TASK-2.11.2 | P1 |
| TASK-2.11.4 | TASK-2.11.1, TASK-2.11.2, TASK-2.11.3 | 🟡 Med | - | P1 |
| TASK-2.12.1 | TASK-2.9.2 | 🟡 Med | - | P1 |
| TASK-2.12.2 | TASK-2.12.1 | 🟡 Med | - | P1 |
| TASK-2.12.3 | TASK-2.12.1 | 🟡 Med | TASK-2.12.2 | P1 |
| TASK-2.12.4 | TASK-2.12.2, TASK-2.12.3 | 🟡 Med | - | P1 |
| TASK-2.13.1 | TASK-2.10.2 | 🟡 Med | - | P0 |
| TASK-2.13.2 | TASK-2.13.1, TASK-2.10.4 | 🟡 Med | - | P0 |
| TASK-2.13.3 | TASK-2.13.1 | 🟢 Low | TASK-2.13.2 | P2 |
| **FASE 3** | | | | |
| TASK-3.14.1 | TASK-2.13.1 | 🟡 Med | - | P1 |
| TASK-3.14.2 | TASK-3.14.1 | 🟡 Med | - | P1 |
| TASK-3.14.3 | TASK-3.14.2, TASK-1.3.7 | 🟡 Med | - | P1 |
| TASK-3.14.4 | TASK-3.14.3 | 🟡 Med | - | P1 |
| TASK-3.14.5 | TASK-3.14.4 | 🟡 Med | - | P1 |
| TASK-3.15.1 | TASK-1.5.6 | 🟢 Low | - | P1 |
| TASK-3.15.2 | TASK-3.15.1 | 🟡 Med | - | P1 |
| TASK-3.15.3 | TASK-3.15.2 | 🔴 High | - | P1 |
| TASK-3.15.4 | TASK-3.15.3 | 🟡 Med | - | P1 |
| TASK-3.15.5 | TASK-3.15.1 | 🟢 Low | TASK-3.15.2-4 | P2 |
| TASK-3.16.1 | TASK-1.5.6 | 🟢 Low | TASK-3.15.* | P2 |
| TASK-3.16.2 | TASK-3.16.1 | 🔴 High | - | P2 |
| TASK-3.16.3 | TASK-3.16.2 | 🟡 Med | - | P2 |
| TASK-3.16.4 | TASK-3.16.3, TASK-3.15.4 | 🟡 Med | - | P2 |
| TASK-3.16.5 | TASK-3.16.1 | 🟢 Low | TASK-3.16.2-4 | P2 |
| TASK-3.17.1 | TASK-1.4.5 | 🟡 Med | - | P1 |
| TASK-3.17.2 | TASK-3.17.1 | 🟡 Med | - | P1 |
| TASK-3.17.3 | TASK-3.17.2 | 🔴 High | - | P1 |
| TASK-3.17.4 | TASK-3.17.3, TASK-3.14.2 | 🟡 Med | - | P1 |
| TASK-3.17.5 | TASK-3.17.4 | 🟡 Med | - | P1 |
| TASK-3.17.6 | TASK-3.17.5 | 🟢 Low | - | P1 |
| TASK-3.17.7 | TASK-3.17.2 | 🟢 Low | TASK-3.17.3-6 | P2 |
| TASK-3.18.1 | TASK-1.3.4 | 🟢 Low | - | P2 |
| TASK-3.18.2 | TASK-3.18.1 | 🟢 Low | - | P2 |
| TASK-3.18.3 | TASK-3.18.2 | 🟡 Med | - | P2 |
| TASK-3.18.4 | TASK-3.18.3, TASK-2.10.7 | 🟡 Med | - | P2 |
| TASK-3.18.5 | TASK-3.18.2 | 🟢 Low | TASK-3.18.3-4 | P2 |
| **FASE 4-6** | | | | |
| TASK-4.19.* | FASE 3 | 🔴 High | - | P0 |
| TASK-4.20.* | FASE 0 | 🟡 Med | TASK-4.19.* | P1 |
| TASK-4.21.* | FASE 0 | 🟡 Med | TASK-4.19.*, TASK-4.20.* | P1 |
| TASK-4.22.* | TASK-2.9.*, TASK-2.10.* | 🟡 Med | TASK-4.19-21.* | P2 |
| TASK-5.23.* | FASE 4 | 🟡 Med | - | P0 |
| TASK-5.24.* | FASE 4 | 🟢 Low | TASK-5.23.* | P0 |
| TASK-5.25.* | TASK-1.5.6 | 🟢 Low | TASK-5.23-24.* | P0 |
| TASK-6.26.* | FASE 5 | 🟡 Med | - | P0 |
| TASK-6.27.* | TASK-6.26.* | 🟡 Med | - | P0 |
| TASK-6.28.* | TASK-6.27.* | 🟢 Low | - | P1 |

**Legenda de Risco:**
- 🟢 **Low:** Task bem definida, poucos pontos de falha
- 🟡 **Medium:** Envolve integrações ou mudanças em múltiplos módulos
- 🔴 **High:** Mudanças críticas, alto impacto, complexidade elevada, dependências externas

**Legenda de Prioridade:**
- **P0:** Crítico para MVP, bloqueia outras features
- **P1:** Importante para V1, pode ser adiado com impacto
- **P2:** Nice-to-have, pode entrar em V1.1

---

# GLOSSÁRIO DE ARQUIVOS

## Serviços Principais

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `docker-compose.yml` | Config | Orquestração local | 0 |
| `.env.example` | Config | Template de variáveis | 0 |

## Backoffice API (Nest.js)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `backoffice-api/src/main.ts` | Entry | Entrypoint, Swagger, Filters | 1 |
| `backoffice-api/src/app.module.ts` | Module | Root module | 1 |
| `backoffice-api/src/infrastructure/supabase/supabase.service.ts` | Service | Client Supabase | 1 |
| `backoffice-api/src/infrastructure/redis/redis.service.ts` | Service | Client Redis | 1 |
| `backoffice-api/src/infrastructure/messaging/event-bus.service.ts` | Service | Pub/Sub abstraction | 1 |
| `backoffice-api/src/common/guards/jwt-auth.guard.ts` | Guard | Autenticação JWT | 1 |
| `backoffice-api/src/common/guards/roles.guard.ts` | Guard | Autorização RBAC | 1 |
| `backoffice-api/src/common/guards/company.guard.ts` | Guard | Escopo por empresa | 1 |
| `backoffice-api/src/modules/auth/**` | Module | Autenticação | 1 |
| `backoffice-api/src/modules/companies/**` | Module | Governança empresas | 1 |
| `backoffice-api/src/modules/centurions/**` | Module | Gestão de bots | 5 |
| `backoffice-api/src/modules/leads/**` | Module | Gestão de leads | 5 |
| `backoffice-api/src/modules/deals/**` | Module | Gestão de deals | 4 |
| `backoffice-api/src/modules/tools/**` | Module | Tools customizáveis | 3 |
| `backoffice-api/src/modules/mcp/**` | Module | MCP servers | 3 |
| `backoffice-api/src/modules/knowledge-base/**` | Module | Knowledge Base | 3 |
| `backoffice-api/src/modules/followups/**` | Module | Follow-ups | 3 |
| `backoffice-api/src/modules/contracts/**` | Module | Templates contrato | 4 |
| `backoffice-api/src/modules/marketing/**` | Module | Pixels CAPI | 4 |
| `backoffice-api/src/modules/metrics/**` | Module | Métricas | 5 |

## Backoffice Web (Next.js)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `backoffice-web/src/app/(auth)/login/page.tsx` | Page | Tela de login | 1 |
| `backoffice-web/src/app/(dashboard)/layout.tsx` | Layout | Layout dashboard | 1 |
| `backoffice-web/src/app/(dashboard)/page.tsx` | Page | Dashboard home | 5 |
| `backoffice-web/src/app/(dashboard)/empresas/page.tsx` | Page | Gestão empresas | 1 |
| `backoffice-web/src/app/(dashboard)/instancias/page.tsx` | Page | Instâncias WhatsApp | 2 |
| `backoffice-web/src/app/(dashboard)/centurions/page.tsx` | Page | Gestão centurions | 5 |
| `backoffice-web/src/app/(dashboard)/leads/page.tsx` | Page | Gestão leads | 5 |
| `backoffice-web/src/app/(dashboard)/deals/page.tsx` | Page | Gestão deals | 4 |
| `backoffice-web/src/app/(dashboard)/knowledge-base/page.tsx` | Page | Knowledge Base | 3 |
| `backoffice-web/src/app/(dashboard)/contratos/page.tsx` | Page | Contratos | 4 |
| `backoffice-web/src/app/(dashboard)/marketing/page.tsx` | Page | Marketing/Pixels | 4 |
| `backoffice-web/src/middleware.ts` | Middleware | Proteção de rotas | 1 |
| `backoffice-web/src/lib/api/client.ts` | Util | API client | 1 |

## Agent Runtime (Python)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `agent-runtime/pyproject.toml` | Config | Dependencies Poetry | 2 |
| `agent-runtime/src/api/main.py` | Entry | FastAPI entrypoint | 2 |
| `agent-runtime/src/common/config/settings.py` | Config | Pydantic settings | 2 |
| `agent-runtime/src/common/infrastructure/cache/redis_client.py` | Infra | Redis client | 2 |
| `agent-runtime/src/common/infrastructure/database/supabase_client.py` | Infra | Supabase client | 2 |
| `agent-runtime/src/common/infrastructure/messaging/pubsub.py` | Infra | Pub/Sub subscriber | 2 |
| `agent-runtime/src/modules/centurion/handlers/message_handler.py` | Handler | Consumer principal | 2 |
| `agent-runtime/src/modules/centurion/handlers/debounce_handler.py` | Handler | Debounce logic | 2 |
| `agent-runtime/src/modules/centurion/services/centurion_service.py` | Service | Orquestração IA | 2 |
| `agent-runtime/src/modules/centurion/services/prompt_builder.py` | Service | Assembly de prompt | 2 |
| `agent-runtime/src/modules/centurion/services/qualification_service.py` | Service | Regras qualificação | 2 |
| `agent-runtime/src/modules/centurion/services/response_builder.py` | Service | Chunking | 2 |
| `agent-runtime/src/modules/centurion/services/whatsapp_sender.py` | Service | Envio WhatsApp | 2 |
| `agent-runtime/src/modules/channels/services/media_downloader.py` | Service | Download mídia | 2 |
| `agent-runtime/src/modules/channels/services/stt_service.py` | Service | Speech-to-Text | 2 |
| `agent-runtime/src/modules/channels/services/vision_service.py` | Service | Vision/OCR | 2 |
| `agent-runtime/src/modules/channels/adapters/instagram_adapter.py` | Adapter | Instagram adapter | 4 |
| `agent-runtime/src/modules/channels/adapters/telegram_adapter.py` | Adapter | Telegram adapter | 4 |
| `agent-runtime/src/modules/memory/services/short_term_memory.py` | Service | Memória curta | 2 |
| `agent-runtime/src/modules/memory/services/fact_extractor.py` | Service | Extração fatos | 3 |
| `agent-runtime/src/modules/memory/services/embedding_service.py` | Service | Embeddings | 3 |
| `agent-runtime/src/modules/memory/adapters/rag_adapter.py` | Adapter | Busca RAG | 3 |
| `agent-runtime/src/modules/memory/adapters/knowledge_base_adapter.py` | Adapter | Busca KB | 3 |
| `agent-runtime/src/modules/tools/services/tool_executor.py` | Service | Execução tools | 3 |
| `agent-runtime/src/modules/tools/services/mcp_registry.py` | Service | MCP client | 3 |
| `agent-runtime/src/modules/followups/services/followup_service.py` | Service | Follow-ups | 3 |
| `agent-runtime/src/handlers/proactive_handler.py` | Handler | Worker proativo | 3 |
| `agent-runtime/src/modules/handoff/services/handoff_service.py` | Service | Handoff | 4 |

## Evolution Manager (Nest.js)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `evolution-manager/src/main.ts` | Entry | Entrypoint | 2 |
| `evolution-manager/src/modules/instances/**` | Module | CRUD instâncias | 2 |
| `evolution-manager/src/modules/webhooks/**` | Module | Webhook receiver | 2 |
| `evolution-manager/src/modules/instances/services/evolution-api.service.ts` | Service | Evolution API client | 2 |
| `evolution-manager/src/modules/instances/channels/instagram.service.ts` | Service | Instagram | 4 |
| `evolution-manager/src/modules/instances/channels/telegram.service.ts` | Service | Telegram | 4 |

## Autentique Service (Nest.js)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `autentique-service/src/main.ts` | Entry | Entrypoint | 4 |
| `autentique-service/src/modules/contracts/**` | Module | Contratos | 4 |
| `autentique-service/src/infrastructure/autentique/autentique.client.ts` | Client | Autentique API | 4 |

## Facebook CAPI Service (Nest.js)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `facebook-capi/src/main.ts` | Entry | Entrypoint | 4 |
| `facebook-capi/src/modules/events/**` | Module | Eventos CAPI | 4 |
| `facebook-capi/src/modules/pixels/**` | Module | Config pixels | 4 |
| `facebook-capi/src/infrastructure/facebook/facebook.client.ts` | Client | Meta CAPI API | 4 |

## Database (Supabase)

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `supabase/migrations/00001_create_core_schema.sql` | Migration | Schema core | 1 |
| `supabase/migrations/00002_core_companies.sql` | Migration | Tabela companies | 1 |
| `supabase/migrations/00005_core_leads.sql` | Migration | Tabela leads | 1 |
| `supabase/migrations/00006_core_centurion_configs.sql` | Migration | Tabela configs | 1 |
| `supabase/migrations/00008_core_conversations.sql` | Migration | Tabela conversations | 1 |
| `supabase/migrations/00010_enable_pgvector.sql` | Migration | Extensão vector | 1 |
| `supabase/migrations/00011_core_lead_memories.sql` | Migration | Memória RAG | 1 |
| `supabase/migrations/00020_rls_*.sql` | Migration | Políticas RLS | 1 |
| `supabase/migrations/00030_template_base_schema.sql` | Migration | Template CRM | 1 |
| `supabase/migrations/00040_kb_*.sql` | Migration | Knowledge Base | 3 |
| `supabase/migrations/00050_followup_*.sql` | Migration | Follow-ups | 3 |
| `supabase/migrations/00060_deals_*.sql` | Migration | Deals/Handoff | 4 |
| `supabase/seed.sql` | Seed | Dados de teste | 1 |
| `supabase/tests/rls/*.test.sql` | Test | Testes RLS | 1 |

## Packages Compartilhados

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `packages/contracts/src/events/*.ts` | Types | Schemas de eventos | 0 |
| `packages/contracts/src/dtos/*.ts` | Types | DTOs compartilhados | 0 |
| `packages/contracts/src/channels.ts` | Const | Canais Redis | 0 |
| `packages/logger/src/index.ts` | Util | Logger estruturado | 0, 6 |

## Infraestrutura

| Arquivo | Tipo | Responsabilidade | Fase(s) |
|---------|------|------------------|---------|
| `infra/observability/prometheus.yml` | Config | Prometheus | 6 |
| `infra/observability/jaeger.yml` | Config | Tracing | 6 |
| `infra/runbooks/*.md` | Docs | Runbooks | 6 |
| `infra/deploy/*.md` | Docs | Guias deploy | 6 |

---

# OBSERVAÇÕES FINAIS

## Premissas

1. **Supabase como BaaS:** Utilizamos Supabase para Auth, Database (Postgres), Storage e Real-time. Isso simplifica infraestrutura inicial.

2. **Evolution API para WhatsApp:** Dependemos da Evolution API para abstração do WhatsApp Business. Isso é uma dependência externa crítica.

3. **Agno Framework:** O Agent Runtime usa Agno para orquestração de LLMs. Isso permite trocar modelos facilmente.

4. **Multi-tenancy via RLS:** Toda a segurança multi-tenant depende de RLS bem implementado. Falhas aqui são críticas.

## Riscos Principais

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Evolution API instável | Média | Alto | Circuit breaker, retry, fallback |
| RLS mal configurado | Baixa | Crítico | Testes extensivos, code review |
| Performance do Agent | Média | Alto | Cache, otimização de prompts |
| Custo de LLM | Alta | Médio | Caching, modelo menor para casos simples |
| Complexidade multi-canal | Média | Médio | Abstração via adapters |

## Métricas de Sucesso do V1

- [ ] 100% das empresas provisionadas automaticamente
- [ ] < 5s tempo médio de resposta do SDR
- [ ] > 90% de uptime
- [ ] 0 vazamentos de dados cross-tenant
- [ ] > 80% de coverage de testes
- [ ] Dashboard de métricas funcional

## Atualizações do Documento

Este documento é **fonte de verdade** para o backlog. Atualize:
- Ao completar tasks (marcar checkbox)
- Ao identificar novos requisitos
- Ao descobrir dependências não mapeadas
- Ao reestimar esforços

**Última Atualização:** [DATA]  
**Versão:** 1.0.0

---

**FIM DO BACKLOG DETALHADO**
