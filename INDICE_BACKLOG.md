# Índice do Backlog (Status de Implementação)

> **Auditado em:** 2025-12-17  
> **Fonte:** `BACKLOG_DETALHADO.md`  
> **Legenda:** `[x]=Concluída`, `[~]=Parcial`, `[ ]=Não implementada`  
> **Obs.:** status reflete implementação no repositório; integrações externas exigem validação com credenciais/ambiente.

## Resumo
- Total de tasks: 156
- Concluídas: 154
- Parciais: 2
- Não implementadas: 0

## Pendências (Parciais)
- [~] **[TASK-2.9.6]** Integrar UI de instâncias no backoffice-web — UI existe, porém o backlog pede status em tempo real (hoje há refresh manual). Evidência: `backoffice-web/src/modules/instancias/components/instances-list.tsx`
- [~] **[TASK-4.22.6]** Unificar roteamento de mensagens por canal — Há normalização por canal, porém o fluxo de resposta ainda está limitado a WhatsApp (CenturionService). Evidência: `agent-runtime/src/modules/centurion/services/centurion_service.py`

## Por Fase

### Fase 0 — Setup Base

#### EPIC-001: Bootstrap do Repositório, Serviços e Ambiente Local — Concluída
- [x] **[TASK-0.1.1]** Criar `docker-compose.yml` com serviços base
- [x] **[TASK-0.1.2]** Criar `.env.example` com todas as variáveis
- [x] **[TASK-0.1.3]** Bootstrap `backoffice-web` (Next.js 14)
- [x] **[TASK-0.1.4]** Bootstrap `backoffice-api` (Nest.js)
- [x] **[TASK-0.1.5]** Bootstrap `agent-runtime` (Python + Agno)
- [x] **[TASK-0.1.6]** Bootstrap `evolution-manager` (Nest.js)
- [x] **[TASK-0.1.7]** Bootstrap `autentique-service` (Nest.js)
- [x] **[TASK-0.1.8]** Bootstrap `facebook-capi` (Nest.js)
- [x] **[TASK-0.1.9]** Bootstrap `packages/contracts` (Tipos compartilhados)

#### EPIC-002: Contratos de Integração e Padrões Cross-Cutting — Concluída
- [x] **[TASK-0.2.1]** Definir catálogo de eventos em documentação
- [x] **[TASK-0.2.2]** Implementar tipos de eventos em `packages/contracts`
- [x] **[TASK-0.2.3]** Definir constantes de canais Redis
- [x] **[TASK-0.2.4]** Implementar DTOs compartilhados
- [x] **[TASK-0.2.5]** Definir hierarquia de erros compartilhada
- [x] **[TASK-0.2.6]** Implementar padrão de logging para Nest.js
- [x] **[TASK-0.2.7]** Implementar padrão de logging para Python
- [x] **[TASK-0.2.8]** Criar estrutura de testes por serviço

### Fase 1 — Fundação

#### EPIC-003: Modelo de Dados CORE + Migrations + pgvector — Concluída
- [x] **[TASK-1.3.1]** Criar schema `core` e estrutura base
- [x] **[TASK-1.3.2]** Implementar `core.companies` e `core.company_users`
- [x] **[TASK-1.3.3]** Implementar `core.leads` com tracking completo
- [x] **[TASK-1.3.4]** Implementar `core.centurion_configs`
- [x] **[TASK-1.3.5]** Implementar `core.channel_instances`
- [x] **[TASK-1.3.6]** Implementar `core.conversations` e `core.messages`
- [x] **[TASK-1.3.7]** Habilitar pgvector e criar tabelas de memória
- [x] **[TASK-1.3.8]** Criar índices otimizados e seed de desenvolvimento

#### EPIC-004: Segurança Multi-Tenant (JWT + RLS + Storage) — Concluída
- [x] **[TASK-1.4.1]** Implementar JWT strategy e auth guard
- [x] **[TASK-1.4.2]** Implementar roles guard e decorator
- [x] **[TASK-1.4.3]** Implementar company guard (escopo por empresa)
- [x] **[TASK-1.4.4]** Criar RLS policies para tabelas CORE
- [x] **[TASK-1.4.5]** Criar RLS policies para Storage
- [x] **[TASK-1.4.6]** Criar testes automatizados de RLS

#### EPIC-005: Backoffice API Bootstrap + Infraestrutura — Concluída
- [x] **[TASK-1.5.1]** Implementar Supabase module e service
- [x] **[TASK-1.5.2]** Implementar Redis module e service
- [x] **[TASK-1.5.3]** Implementar EventBus service
- [x] **[TASK-1.5.4]** Implementar Global Exception Filter
- [x] **[TASK-1.5.5]** Configurar OpenAPI/Swagger
- [x] **[TASK-1.5.6]** Implementar Auth module completo

#### EPIC-006: Governança (Empresas, Usuários, Provisionamento) — Concluída
- [x] **[TASK-1.6.1]** Criar schema `_template_base`
- [x] **[TASK-1.6.2]** Criar função de provisionamento de schema
- [x] **[TASK-1.6.3]** Implementar companies module (controller + service)
- [x] **[TASK-1.6.4]** Implementar schema provisioner service
- [x] **[TASK-1.6.5]** Implementar company-users management

#### EPIC-007: Backoffice Web Bootstrap + Auth + Governança UI — Concluída
- [x] **[TASK-1.7.1]** Setup TailwindCSS + ShadcnUI
- [x] **[TASK-1.7.2]** Implementar API client e auth utilities
- [x] **[TASK-1.7.3]** Implementar rotas de autenticação
- [x] **[TASK-1.7.4]** Implementar middleware de proteção
- [x] **[TASK-1.7.5]** Implementar layout de dashboard
- [x] **[TASK-1.7.6]** Implementar tela de listagem de empresas
- [x] **[TASK-1.7.7]** Implementar modal de criar/editar empresa

### Fase 2 — Qualificação IA

#### EPIC-008: Agent Runtime Bootstrap + Infraestrutura Python — Concluída
- [x] **[TASK-2.8.1]** Setup projeto Python com Poetry/pyproject.toml
- [x] **[TASK-2.8.2]** Implementar Settings via Pydantic
- [x] **[TASK-2.8.3]** Implementar Supabase client wrapper
- [x] **[TASK-2.8.4]** Implementar Redis client wrapper
- [x] **[TASK-2.8.5]** Implementar Pub/Sub subscriber
- [x] **[TASK-2.8.6]** Criar FastAPI entrypoint + health routes

#### EPIC-009: Evolution Manager + Integração WhatsApp — Parcial
- [x] **[TASK-2.9.1]** Setup projeto evolution-manager Nest.js
- [x] **[TASK-2.9.2]** Implementar Evolution API client service
- [x] **[TASK-2.9.3]** Implementar CRUD de instâncias WhatsApp
- [x] **[TASK-2.9.4]** Implementar webhook receiver
- [x] **[TASK-2.9.5]** Implementar event publisher (Redis Pub/Sub)
- [~] **[TASK-2.9.6]** Integrar UI de instâncias no backoffice-web

#### EPIC-010: Centurion Core + Fluxo de Qualificação — Concluída
- [x] **[TASK-2.10.1]** Implementar entities de domínio
- [x] **[TASK-2.10.2]** Implementar repositories
- [x] **[TASK-2.10.3]** Implementar message handler (consumer)
- [x] **[TASK-2.10.4]** Implementar prompt builder
- [x] **[TASK-2.10.5]** Implementar CenturionService (orquestração)
- [x] **[TASK-2.10.6]** Implementar qualification service
- [x] **[TASK-2.10.7]** Integrar envio de resposta via Evolution Manager

#### EPIC-011: Humanização (Debounce + Chunking) — Concluída
- [x] **[TASK-2.11.1]** Implementar debounce handler
- [x] **[TASK-2.11.2]** Implementar response builder com chunking
- [x] **[TASK-2.11.3]** Atualizar conversation com debounce state
- [x] **[TASK-2.11.4]** Integrar debounce/chunking no fluxo principal

#### EPIC-012: Processamento Multimodal (Áudio + Imagem) — Concluída
- [x] **[TASK-2.12.1]** Implementar media downloader
- [x] **[TASK-2.12.2]** Implementar Speech-to-Text service
- [x] **[TASK-2.12.3]** Implementar Vision service
- [x] **[TASK-2.12.4]** Integrar multimodal no message handler

#### EPIC-013: Memória de Curto Prazo (Histórico de Conversa) — Concluída
- [x] **[TASK-2.13.1]** Implementar short-term memory service
- [x] **[TASK-2.13.2]** Integrar memória curta no prompt builder
- [x] **[TASK-2.13.3]** Implementar limpeza automática de histórico antigo

### Fase 3 — Inteligência Avançada

#### EPIC-014: Memória RAG (Long-Term Memory) — Concluída
- [x] **[TASK-3.14.1]** Implementar fact extractor service
- [x] **[TASK-3.14.2]** Implementar embedding service
- [x] **[TASK-3.14.3]** Implementar fact repository com pgvector
- [x] **[TASK-3.14.4]** Implementar RAG adapter
- [x] **[TASK-3.14.5]** Integrar RAG no fluxo de qualificação

#### EPIC-015: Tools Customizáveis (Function Calling) — Concluída
- [x] **[TASK-3.15.1]** Implementar CRUD de tools na API
- [x] **[TASK-3.15.2]** Implementar tool entity e schema validator no Agent Runtime
- [x] **[TASK-3.15.3]** Implementar tool executor
- [x] **[TASK-3.15.4]** Integrar tools no Agno Agent
- [x] **[TASK-3.15.5]** Implementar UI de configuração de tools

#### EPIC-016: MCP (Model Context Protocol) — Concluída
- [x] **[TASK-3.16.1]** Implementar CRUD de MCP servers na API
- [x] **[TASK-3.16.2]** Implementar MCP client registry
- [x] **[TASK-3.16.3]** Implementar MCP tool adapter
- [x] **[TASK-3.16.4]** Integrar MCP tools no tool registry
- [x] **[TASK-3.16.5]** Implementar UI de configuração MCP

#### EPIC-017: Knowledge Base (Upload + RAG) — Concluída
- [x] **[TASK-3.17.1]** Criar bucket de Storage para documentos
- [x] **[TASK-3.17.2]** Implementar upload e CRUD de documentos
- [x] **[TASK-3.17.3]** Implementar document processor (chunking)
- [x] **[TASK-3.17.4]** Implementar geração de embeddings para chunks
- [x] **[TASK-3.17.5]** Implementar Knowledge Base adapter no Agent Runtime
- [x] **[TASK-3.17.6]** Integrar KB no prompt builder
- [x] **[TASK-3.17.7]** Implementar UI de Knowledge Base

#### EPIC-018: Follow-ups Proativos — Concluída
- [x] **[TASK-3.18.1]** Criar tabela de regras de follow-up
- [x] **[TASK-3.18.2]** Implementar CRUD de follow-up rules na API
- [x] **[TASK-3.18.3]** Implementar followup service no Agent Runtime
- [x] **[TASK-3.18.4]** Implementar proactive handler (worker)
- [x] **[TASK-3.18.5]** Implementar UI de configuração de follow-ups

### Fase 4 — Handoff & Integrações

#### EPIC-019: Handoff de Leads Qualificados — Concluída
- [x] **[TASK-4.19.1]** Criar tabela core.deals_index e triggers
- [x] **[TASK-4.19.2]** Implementar handoff service no Agent Runtime
- [x] **[TASK-4.19.3]** Integrar handoff no fluxo de qualificação
- [x] **[TASK-4.19.4]** Implementar endpoints de deals na API
- [x] **[TASK-4.19.5]** Implementar UI de deals

#### EPIC-020: Integração Autentique (Contratos) — Concluída
- [x] **[TASK-4.20.1]** Setup projeto autentique-service
- [x] **[TASK-4.20.2]** Implementar Autentique API client
- [x] **[TASK-4.20.3]** Implementar contracts module
- [x] **[TASK-4.20.4]** Implementar webhook receiver para status
- [x] **[TASK-4.20.5]** Integrar templates de contrato na API principal
- [x] **[TASK-4.20.6]** Implementar UI de contratos

#### EPIC-021: Facebook CAPI (Conversions API) — Concluída
- [x] **[TASK-4.21.1]** Setup projeto facebook-capi
- [x] **[TASK-4.21.2]** Implementar Meta Conversions API client
- [x] **[TASK-4.21.3]** Implementar CRUD de pixel configs na API principal
- [x] **[TASK-4.21.4]** Implementar event subscriber e sender
- [x] **[TASK-4.21.5]** Integrar tracking no fluxo de leads
- [x] **[TASK-4.21.6]** Implementar UI de marketing/pixels

#### EPIC-022: Canais Adicionais (Instagram + Telegram) — Parcial
- [x] **[TASK-4.22.1]** Implementar Instagram adapter no Agent Runtime
- [x] **[TASK-4.22.2]** Implementar Telegram adapter no Agent Runtime
- [x] **[TASK-4.22.3]** Implementar Instagram service no Evolution Manager
- [x] **[TASK-4.22.4]** Implementar Telegram service
- [x] **[TASK-4.22.5]** Implementar UI de configuração multi-canal
- [~] **[TASK-4.22.6]** Unificar roteamento de mensagens por canal

### Fase 5 — Métricas & Operação

#### EPIC-023: Dashboard de Métricas Consolidadas — Concluída
- [x] **[TASK-5.23.1]** Implementar metrics service com agregações
- [x] **[TASK-5.23.2]** Implementar cache de métricas
- [x] **[TASK-5.23.3]** Implementar endpoints de métricas
- [x] **[TASK-5.23.4]** Implementar WebSocket para real-time
- [x] **[TASK-5.23.5]** Implementar dashboard UI com gráficos

#### EPIC-024: Leads Management + Timeline — Concluída
- [x] **[TASK-5.24.1]** Implementar leads module com CRUD
- [x] **[TASK-5.24.2]** Implementar timeline service
- [x] **[TASK-5.24.3]** Implementar UI de listagem de leads
- [x] **[TASK-5.24.4]** Implementar UI de timeline do lead

#### EPIC-025: Centurions Management (CRUD + Config) — Concluída
- [x] **[TASK-5.25.1]** Implementar centurions module com CRUD
- [x] **[TASK-5.25.2]** Implementar endpoint de teste de centurion
- [x] **[TASK-5.25.3]** Implementar UI de listagem de centurions
- [x] **[TASK-5.25.4]** Implementar editor de centurion
- [x] **[TASK-5.25.5]** Implementar playground de teste na UI

### Fase 6 — Produção & Escalabilidade

#### EPIC-026: Testes Abrangentes (Unit + Integration + E2E) — Concluída
- [x] **[TASK-6.26.1]** Implementar unit tests para backoffice-api
- [x] **[TASK-6.26.2]** Implementar integration tests para APIs
- [x] **[TASK-6.26.3]** Implementar testes de RLS
- [x] **[TASK-6.26.4]** Implementar E2E tests para fluxos críticos
- [x] **[TASK-6.26.5]** Implementar unit tests para agent-runtime

#### EPIC-027: Observabilidade (Logs + Metrics + Traces) — Concluída
- [x] **[TASK-6.27.1]** Implementar logs estruturados em todos os serviços
- [x] **[TASK-6.27.2]** Implementar métricas Prometheus
- [x] **[TASK-6.27.3]** Implementar traces distribuídos
- [x] **[TASK-6.27.4]** Implementar auditoria de operações

#### EPIC-028: Documentação & Runbooks — Concluída
- [x] **[TASK-6.28.1]** Criar runbooks de incidentes
- [x] **[TASK-6.28.2]** Criar guia de deploy
- [x] **[TASK-6.28.3]** Atualizar documentação de arquitetura
- [x] **[TASK-6.28.4]** Gerar API documentation completa
