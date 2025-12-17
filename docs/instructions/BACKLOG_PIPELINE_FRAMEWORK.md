# BACKLOG PIPELINE FRAMEWORK

**Versão:** 1.0  
**Data:** 2024  
**Autor:** Bushido Academy  

---

## 📋 SUMÁRIO

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Diretórios](#2-estrutura-de-diretórios)
3. [Convenções de Nomenclatura](#3-convenções-de-nomenclatura)
4. [Templates dos Arquivos](#4-templates-dos-arquivos)
5. [Prompt de Derivação](#5-prompt-de-derivação)
6. [Guia de Uso pela IA](#6-guia-de-uso-pela-ia)
7. [Manutenção e Atualização](#7-manutenção-e-atualização)

---

## 1. VISÃO GERAL

### 1.1 Propósito

O Backlog Pipeline Framework é um sistema de **orquestração de contexto para trabalho assistido por IA**. Ele transforma um documento monolítico de backlog (`BACKLOG.md`) em uma **estrutura fractal derivada** onde cada nível hierárquico é autossuficiente e navegável.

### 1.2 Objetivos

- **Rastreabilidade:** Progresso documentado em cada nível
- **Navegabilidade:** IA consegue localizar-se e navegar sem contexto prévio
- **Modularidade:** Carregar apenas o contexto necessário, não o projeto inteiro
- **Padronização:** Mesma estrutura replicável para qualquer projeto

### 1.3 Hierarquia de Níveis

```
EPIC → FASE → SUBFASE → TASK → SUBTASK
  │       │        │        │        │
  │       │        │        │        └── Ação atômica (checkbox)
  │       │        │        └── Unidade de trabalho executável
  │       │        └── Agrupamento lógico de tasks relacionadas
  │       └── Marco de entrega com checkpoint
  └── Objetivo estratégico de alto nível
```

---

## 2. ESTRUTURA DE DIRETÓRIOS

### 2.1 Árvore Completa

```
backlog_pipeline/
├── _MANIFEST.md                          # Manifesto global do pipeline
│
└── Epics/
    ├── _MANIFEST.md                      # Índice de todos os Epics
    │
    ├── EPIC-001_[slug]/
    │   ├── _EPIC.md                      # Definição completa do Epic
    │   │
    │   └── Fases/
    │       ├── _MANIFEST.md              # Índice das Fases deste Epic
    │       │
    │       ├── FASE-01_[slug]/
    │       │   ├── _FASE.md              # Definição da Fase
    │       │   │
    │       │   └── Subfases/
    │       │       ├── _MANIFEST.md      # Índice das Subfases
    │       │       │
    │       │       ├── SUBFASE-01_[slug]/
    │       │       │   ├── _SUBFASE.md   # Definição da Subfase
    │       │       │   │
    │       │       │   └── Tasks/
    │       │       │       ├── _MANIFEST.md
    │       │       │       │
    │       │       │       ├── TASK-001_[slug]/
    │       │       │       │   ├── _TASK.md
    │       │       │       │   └── _SUBTASKS.md
    │       │       │       │
    │       │       │       └── TASK-002_[slug]/
    │       │       │           ├── _TASK.md
    │       │       │           └── _SUBTASKS.md
    │       │       │
    │       │       └── SUBFASE-02_[slug]/
    │       │           └── ...
    │       │
    │       └── FASE-02_[slug]/
    │           └── ...
    │
    └── EPIC-002_[slug]/
        └── ...
```

### 2.2 Regra de Arquivos por Diretório

| Diretório | Arquivo Global | Arquivos de Definição |
|-----------|---------------|----------------------|
| `backlog_pipeline/` | `_MANIFEST.md` | — |
| `Epics/` | `_MANIFEST.md` | — |
| `EPIC-XXX_[slug]/` | `_EPIC.md` | — |
| `Fases/` | `_MANIFEST.md` | — |
| `FASE-XX_[slug]/` | `_FASE.md` | — |
| `Subfases/` | `_MANIFEST.md` | — |
| `SUBFASE-XX_[slug]/` | `_SUBFASE.md` | — |
| `Tasks/` | `_MANIFEST.md` | — |
| `TASK-XXX_[slug]/` | `_TASK.md` | `_SUBTASKS.md` |

---

## 3. CONVENÇÕES DE NOMENCLATURA

### 3.1 Diretórios

**Padrão:** `[TIPO]-[ID]_[slug]`

| Componente | Regra | Exemplo |
|------------|-------|---------|
| `TIPO` | Maiúsculas, singular | `EPIC`, `FASE`, `SUBFASE`, `TASK` |
| `ID` | Numérico, zero-padded | `001`, `01`, `001` |
| `slug` | Lowercase, kebab-case | `autenticacao-jwt`, `setup-database` |

**Exemplos:**
- `EPIC-001_sistema-autenticacao`
- `FASE-01_infraestrutura-base`
- `SUBFASE-01_configuracao-banco`
- `TASK-001_criar-schema-prisma`

### 3.2 Arquivos Globais

- Sempre iniciam com `_` (underscore)
- Garantem ordenação no topo do diretório
- Nome em MAIÚSCULAS

### 3.3 IDs e Numeração

| Nível | Formato ID | Exemplo |
|-------|-----------|---------|
| Epic | `EPIC-XXX` | `EPIC-001`, `EPIC-012` |
| Fase | `FASE-XX` | `FASE-01`, `FASE-12` |
| Subfase | `SUBFASE-XX` | `SUBFASE-01`, `SUBFASE-05` |
| Task | `TASK-XXX` | `TASK-001`, `TASK-042` |
| Subtask | `SUBTASK-XX` | `SUBTASK-01`, `SUBTASK-15` |

### 3.4 Slugs

**Regras:**
- Máximo 40 caracteres
- Apenas letras minúsculas, números e hífens
- Sem acentos ou caracteres especiais
- Deve ser descritivo e único dentro do nível pai

**Transformação:**
```
"Autenticação JWT com Multi-tenant" → autenticacao-jwt-multitenant
"Setup do Banco de Dados" → setup-banco-dados
"Criar Schema Prisma" → criar-schema-prisma
```

---

## 4. TEMPLATES DOS ARQUIVOS

### 4.1 `_MANIFEST.md` (Global do Pipeline)

```markdown
# 📋 BACKLOG PIPELINE MANIFEST

## 🎯 Projeto
- **Nome:** [NOME_DO_PROJETO]
- **Repositório:** [URL_DO_REPOSITÓRIO]
- **Documento Fonte:** `BACKLOG.md`
- **Gerado em:** [DATA_GERAÇÃO]
- **Última Atualização:** [DATA_ATUALIZAÇÃO]

---

## 📊 Status Geral do Projeto

| Métrica | Valor |
|---------|-------|
| Total de Epics | X |
| Epics Concluídos | Y |
| Epics Em Progresso | Z |
| Epics Não Iniciados | W |
| **Progresso Geral** | XX% |

---

## 📑 Índice de Epics

| ID | Nome | Status | Fases | Progresso | Prioridade |
|----|------|--------|-------|-----------|------------|
| [EPIC-001](./Epics/EPIC-001_[slug]/_EPIC.md) | [Nome] | 🟢/🟡/🔴/⬜ | X/Y | XX% | P0/P1/P2 |
| [EPIC-002](./Epics/EPIC-002_[slug]/_EPIC.md) | [Nome] | 🟢/🟡/🔴/⬜ | X/Y | XX% | P0/P1/P2 |

---

## 🔗 Dependências Entre Epics

```
EPIC-001 ──────► EPIC-003
    │
    └──► EPIC-002 ──────► EPIC-004
```

---

## 📝 Legenda de Status

| Ícone | Status | Descrição |
|-------|--------|-----------|
| ⬜ | Não Iniciado | Nenhum trabalho começou |
| 🟡 | Em Progresso | Trabalho ativo em andamento |
| 🟢 | Concluído | Todos os critérios atendidos |
| 🔴 | Bloqueado | Impedimento identificado |
| ⏸️ | Pausado | Trabalho suspenso temporariamente |

---

## 🚀 Quick Start para IA

Para retomar trabalho neste projeto:
1. Verifique os Epics com status 🟡 (Em Progresso)
2. Navegue até o Epic específico via índice acima
3. Consulte o `_MANIFEST.md` das Fases para localizar trabalho pendente
4. Execute Tasks seguindo a ordem de dependências
```

---

### 4.2 `_MANIFEST.md` (Diretório Epics)

```markdown
# 📋 MANIFEST: EPICS

## 🧭 Navegação
- **⬆️ Pipeline:** [backlog_pipeline/_MANIFEST.md](../_MANIFEST.md)
- **📍 Atual:** `backlog_pipeline/Epics/`

---

## 📊 Status Agregado

| Métrica | Valor |
|---------|-------|
| Total de Epics | X |
| Concluídos | Y |
| Em Progresso | Z |
| Não Iniciados | W |
| Bloqueados | B |
| **Progresso** | XX% |

---

## 📑 Índice de Epics

| ID | Nome | Status | Descrição Resumida | Prioridade |
|----|------|--------|-------------------|------------|
| [EPIC-001](./EPIC-001_[slug]/_EPIC.md) | [Nome] | ⬜/🟡/🟢/🔴 | [Descrição curta] | P0 |
| [EPIC-002](./EPIC-002_[slug]/_EPIC.md) | [Nome] | ⬜/🟡/🟢/🔴 | [Descrição curta] | P1 |

---

## 🔗 Grafo de Dependências

| Epic | Depende de | Libera |
|------|-----------|--------|
| EPIC-001 | — | EPIC-002, EPIC-003 |
| EPIC-002 | EPIC-001 | EPIC-004 |
| EPIC-003 | EPIC-001 | EPIC-004 |
| EPIC-004 | EPIC-002, EPIC-003 | — |

---

## 📝 Notas de Contexto

[Informações relevantes sobre o conjunto de Epics, decisões arquiteturais globais, ou contexto que a IA precisa saber ao trabalhar em qualquer Epic]
```

---

### 4.3 `_EPIC.md`

```markdown
# EPIC-[XXX]: [NOME_DO_EPIC]

## 🧭 Localização
- **Pipeline:** `backlog_pipeline/Epics/EPIC-[XXX]_[slug]/`
- **⬆️ Índice:** [Epics/_MANIFEST.md](../_MANIFEST.md)
- **⬇️ Fases:** [Fases/_MANIFEST.md](./Fases/_MANIFEST.md)

---

## 📋 Definição

### O Que
[Descrição clara e objetiva do que este Epic entrega]

### Por Que
[Justificativa técnica e de negócio para este Epic existir]

### Resultado Esperado
[Descrição do estado final quando o Epic estiver concluído]

---

## 🔗 Rastreabilidade

### Origem
- **Documento Fonte:** `BACKLOG.md`
- **Linhas:** XX-YY
- **Seção:** [Nome da seção no BACKLOG.md]

### Documentos Arquiteturais Relacionados
| Documento | Linhas | Relevância |
|-----------|--------|------------|
| `docs/[documento].md` | XX-YY | [Por que é relevante] |
| `docs/[outro].md` | XX-YY | [Por que é relevante] |

---

## 🎯 Impacto Técnico & Arquitetural

### Arquivos a Modificar
| Arquivo | Modificação |
|---------|-------------|
| `src/[caminho]/[arquivo].ts` | [Descrição da modificação] |
| `src/[caminho]/[arquivo].tsx` | [Descrição da modificação] |

### Arquivos a Criar
| Arquivo | Propósito |
|---------|-----------|
| `src/[caminho]/[novo].ts` | [Responsabilidade do arquivo] |

### Conexões Diretas
```
arquivo1.ts ↔️ arquivo2.ts (via importação)
service.ts ↔️ controller.ts (via injeção)
```

### Conexões Indiretas
```
component.tsx → hook.ts → service.ts → repository.ts → database
```

### Áreas de Impacto
- [ ] Banco de Dados (schemas, migrations)
- [ ] APIs/Endpoints
- [ ] Serviços/Business Logic
- [ ] UI/Frontend
- [ ] Autenticação/Autorização
- [ ] Infraestrutura/DevOps
- [ ] Testes
- [ ] Documentação

---

## 📊 Status

| Campo | Valor |
|-------|-------|
| **Estado** | ⬜ Não Iniciado / 🟡 Em Progresso / 🟢 Concluído / 🔴 Bloqueado |
| **Início** | [DATA ou "—"] |
| **Conclusão** | [DATA ou "—"] |
| **Atualizado em** | [DATA] |

### Progresso das Fases
| Fase | Status | Progresso |
|------|--------|-----------|
| FASE-01 | ⬜/🟡/🟢 | XX% |
| FASE-02 | ⬜/🟡/🟢 | XX% |

---

## 🔗 Dependências

### Este Epic Depende de:
| Epic | Motivo | Status |
|------|--------|--------|
| EPIC-XXX | [Por que depende] | ⬜/🟢 |

### Epics que Dependem Deste:
| Epic | Motivo |
|------|--------|
| EPIC-YYY | [Por que depende deste] |

---

## 🚧 Bloqueios & Riscos

| Tipo | Descrição | Mitigação | Status |
|------|-----------|-----------|--------|
| 🔴 Bloqueio | [Descrição] | [Ação] | Ativo/Resolvido |
| 🟡 Risco | [Descrição] | [Ação] | Monitorando |

---

## ✅ Critérios de Conclusão (Definition of Done)

- [ ] Todas as Fases concluídas
- [ ] Testes automatizados passando
- [ ] Code review aprovado
- [ ] Documentação atualizada
- [ ] Deploy em staging validado
- [ ] [Critério específico do Epic]
- [ ] [Critério específico do Epic]

---

## 📝 Histórico de Atualizações

| Data | Mudança | Autor |
|------|---------|-------|
| [DATA] | Epic criado | [Nome/IA] |
| [DATA] | [Descrição da mudança] | [Nome/IA] |
```

---

### 4.4 `_MANIFEST.md` (Diretório Fases)

```markdown
# 📋 MANIFEST: FASES

## 🧭 Navegação
- **⬆️ Epic:** [EPIC-XXX](../_EPIC.md) - [Nome do Epic]
- **📍 Atual:** `backlog_pipeline/Epics/EPIC-XXX_[slug]/Fases/`

---

## 📊 Status Agregado

| Métrica | Valor |
|---------|-------|
| Total de Fases | X |
| Concluídas | Y |
| Em Progresso | Z |
| Não Iniciadas | W |
| **Progresso do Epic** | XX% |

---

## 📑 Índice de Fases

| ID | Nome | Status | Subfases | Progresso | Objetivo |
|----|------|--------|----------|-----------|----------|
| [FASE-01](./FASE-01_[slug]/_FASE.md) | [Nome] | ⬜/🟡/🟢 | X/Y | XX% | [Objetivo resumido] |
| [FASE-02](./FASE-02_[slug]/_FASE.md) | [Nome] | ⬜/🟡/🟢 | X/Y | XX% | [Objetivo resumido] |

---

## 🔗 Sequência de Execução

```
FASE-01 ──► FASE-02 ──► FASE-03
                │
                └──► FASE-04 (pode paralelizar)
```

---

## ✅ Checkpoints

| Fase | Checkpoint | Critérios |
|------|------------|-----------|
| FASE-01 | [Nome do checkpoint] | [Critérios resumidos] |
| FASE-02 | [Nome do checkpoint] | [Critérios resumidos] |

---

## 📝 Contexto Herdado do Epic

[Informações do Epic que são relevantes para entender as Fases]
```

---

### 4.5 `_FASE.md`

```markdown
# FASE-[XX]: [NOME_DA_FASE]

## 🧭 Localização
- **Epic:** [EPIC-XXX](../../_EPIC.md) - [Nome do Epic]
- **Pipeline:** `backlog_pipeline/Epics/EPIC-XXX_[slug]/Fases/FASE-XX_[slug]/`
- **⬆️ Índice:** [Fases/_MANIFEST.md](../_MANIFEST.md)
- **⬇️ Subfases:** [Subfases/_MANIFEST.md](./Subfases/_MANIFEST.md)

---

## 🎯 Objetivo da Fase

[Descrição clara do objetivo desta fase - o que será entregue ao final]

---

## 🔗 Rastreabilidade

### Origem
- **Epic:** EPIC-XXX - [Nome]
- **BACKLOG.md:** Linhas XX-YY

### Documentos de Referência
| Documento | Linhas | Contexto |
|-----------|--------|----------|
| `docs/[doc].md` | XX-YY | [Relevância] |

---

## 📊 Status

| Campo | Valor |
|-------|-------|
| **Estado** | ⬜ Não Iniciado / 🟡 Em Progresso / 🟢 Concluído / 🔴 Bloqueado |
| **Início** | [DATA ou "—"] |
| **Conclusão** | [DATA ou "—"] |
| **Atualizado em** | [DATA] |

### Progresso das Subfases
| Subfase | Status | Tasks | Progresso |
|---------|--------|-------|-----------|
| SUBFASE-01 | ⬜/🟡/🟢 | X/Y | XX% |
| SUBFASE-02 | ⬜/🟡/🟢 | X/Y | XX% |

---

## 🔗 Dependências

### Esta Fase Depende de:
| Fase | Status | Motivo |
|------|--------|--------|
| FASE-XX | ⬜/🟢 | [Por que depende] |

### Fases que Dependem Desta:
| Fase | Motivo |
|------|--------|
| FASE-YY | [Por que depende desta] |

---

## 🚧 Bloqueios

| Descrição | Impacto | Ação | Status |
|-----------|---------|------|--------|
| [Bloqueio] | [Impacto] | [Ação de mitigação] | Ativo/Resolvido |

---

## ✅ Checkpoint da Fase

### Critérios de Conclusão
- [ ] Todas as Subfases concluídas
- [ ] [Critério específico 1]
- [ ] [Critério específico 2]
- [ ] [Critério específico 3]
- [ ] Testes da fase passando
- [ ] Review/validação realizada

### Evidências Requeridas
- [ ] [Evidência 1 - ex: Screenshot, log, etc]
- [ ] [Evidência 2]

---

## 📝 Notas

[Observações relevantes, decisões tomadas, ou contexto adicional]
```

---

### 4.6 `_MANIFEST.md` (Diretório Subfases)

```markdown
# 📋 MANIFEST: SUBFASES

## 🧭 Navegação
- **⬆️ Fase:** [FASE-XX](../_FASE.md) - [Nome da Fase]
- **⬆️⬆️ Epic:** [EPIC-XXX](../../../_EPIC.md) - [Nome do Epic]
- **📍 Atual:** `.../Fases/FASE-XX_[slug]/Subfases/`

---

## 📊 Status Agregado

| Métrica | Valor |
|---------|-------|
| Total de Subfases | X |
| Concluídas | Y |
| Em Progresso | Z |
| Não Iniciadas | W |
| **Progresso da Fase** | XX% |

---

## 📑 Índice de Subfases

| ID | Nome | Status | Tasks | Progresso |
|----|------|--------|-------|-----------|
| [SUBFASE-01](./SUBFASE-01_[slug]/_SUBFASE.md) | [Nome] | ⬜/🟡/🟢 | X/Y | XX% |
| [SUBFASE-02](./SUBFASE-02_[slug]/_SUBFASE.md) | [Nome] | ⬜/🟡/🟢 | X/Y | XX% |

---

## 🔗 Ordem de Execução

| Ordem | Subfase | Pode Paralelizar Com |
|-------|---------|---------------------|
| 1 | SUBFASE-01 | — |
| 2 | SUBFASE-02 | SUBFASE-03 |
| 2 | SUBFASE-03 | SUBFASE-02 |
| 3 | SUBFASE-04 | — |

---

## 📝 Contexto da Fase

**Objetivo da Fase Pai:** [Objetivo resumido]

[Informações herdadas relevantes para as Subfases]
```

---

### 4.7 `_SUBFASE.md`

```markdown
# SUBFASE-[XX]: [NOME_DA_SUBFASE]

## 🧭 Localização
- **Fase:** [FASE-XX](../../_FASE.md) - [Nome da Fase]
- **Epic:** [EPIC-XXX](../../../../_EPIC.md) - [Nome do Epic]
- **Pipeline:** `.../Subfases/SUBFASE-XX_[slug]/`
- **⬆️ Índice:** [Subfases/_MANIFEST.md](../_MANIFEST.md)
- **⬇️ Tasks:** [Tasks/_MANIFEST.md](./Tasks/_MANIFEST.md)

---

## 🎯 Objetivo da Subfase

[Descrição do que esta subfase agrupa e entrega]

---

## 🔗 Rastreabilidade

- **Fase Pai:** FASE-XX - [Nome]
- **Epic:** EPIC-XXX - [Nome]
- **BACKLOG.md:** Linhas XX-YY

---

## 📊 Status

| Campo | Valor |
|-------|-------|
| **Estado** | ⬜ Não Iniciado / 🟡 Em Progresso / 🟢 Concluído / 🔴 Bloqueado |
| **Início** | [DATA ou "—"] |
| **Conclusão** | [DATA ou "—"] |
| **Atualizado em** | [DATA] |

### Progresso das Tasks
| Task | Status | Subtasks | Progresso |
|------|--------|----------|-----------|
| TASK-001 | ⬜/🟡/🟢 | X/Y | XX% |
| TASK-002 | ⬜/🟡/🟢 | X/Y | XX% |

---

## 🔗 Dependências

| Depende de | Status |
|-----------|--------|
| SUBFASE-XX | ⬜/🟢 |

---

## ✅ Critérios de Conclusão

- [ ] Todas as Tasks concluídas
- [ ] [Critério específico]
- [ ] [Critério específico]

---

## 📝 Notas

[Observações relevantes]
```

---

### 4.8 `_MANIFEST.md` (Diretório Tasks)

```markdown
# 📋 MANIFEST: TASKS

## 🧭 Navegação
- **⬆️ Subfase:** [SUBFASE-XX](../_SUBFASE.md) - [Nome]
- **⬆️⬆️ Fase:** [FASE-XX](../../../_FASE.md) - [Nome]
- **⬆️⬆️⬆️ Epic:** [EPIC-XXX](../../../../../_EPIC.md) - [Nome]
- **📍 Atual:** `.../Subfases/SUBFASE-XX_[slug]/Tasks/`

---

## 📊 Status Agregado

| Métrica | Valor |
|---------|-------|
| Total de Tasks | X |
| Concluídas | Y |
| Em Progresso | Z |
| Não Iniciadas | W |
| Bloqueadas | B |
| **Progresso** | XX% |

---

## 📑 Índice de Tasks

| ID | Nome | Status | Subtasks | Prioridade | Risco |
|----|------|--------|----------|------------|-------|
| [TASK-001](./TASK-001_[slug]/_TASK.md) | [Nome] | ⬜/🟡/🟢/🔴 | X/Y | P0 | 🟢/🟡/🔴 |
| [TASK-002](./TASK-002_[slug]/_TASK.md) | [Nome] | ⬜/🟡/🟢/🔴 | X/Y | P1 | 🟢/🟡/🔴 |

---

## 🔗 Matriz de Dependências

| Task | Depende de | Pode Paralelizar |
|------|-----------|------------------|
| TASK-001 | — | — |
| TASK-002 | TASK-001 | TASK-003 |
| TASK-003 | TASK-001 | TASK-002 |
| TASK-004 | TASK-002, TASK-003 | — |

---

## 📝 Contexto da Subfase

**Objetivo:** [Objetivo da Subfase resumido]

[Informações relevantes para execução das Tasks]
```

---

### 4.9 `_TASK.md`

```markdown
# TASK-[XXX]: [NOME_DA_TASK]

## 🧭 Localização
- **Subfase:** [SUBFASE-XX](../../_SUBFASE.md) - [Nome]
- **Fase:** [FASE-XX](../../../../_FASE.md) - [Nome]
- **Epic:** [EPIC-XXX](../../../../../../_EPIC.md) - [Nome]
- **Pipeline:** `.../Tasks/TASK-XXX_[slug]/`
- **⬆️ Índice:** [Tasks/_MANIFEST.md](../_MANIFEST.md)
- **📋 Subtasks:** [_SUBTASKS.md](./_SUBTASKS.md)

---

## 🎯 Definição

### Ação
[Descrição clara e específica da ação a ser executada]

### Resultado Esperado
[O que deve existir/funcionar ao final desta Task]

---

## 🔗 Rastreabilidade

- **BACKLOG.md:** Linhas XX-YY
- **Documentos de Referência:**
  | Documento | Linhas | Contexto |
  |-----------|--------|----------|
  | `docs/[doc].md` | XX-YY | [Relevância] |

---

## 📁 Arquivos

### A Criar
| Arquivo | Linhas (estimado) | Propósito |
|---------|-------------------|-----------|
| `src/[caminho]/[arquivo].ts` | ~XXX | [Responsabilidade] |

### A Modificar
| Arquivo | Modificação | Linhas (estimado) |
|---------|-------------|-------------------|
| `src/[caminho]/[arquivo].ts` | [Descrição] | +XX |

---

## 🔗 Dependências

### Esta Task Depende de:
| Task | Status | Motivo |
|------|--------|--------|
| TASK-XXX | ⬜/🟢 | [Por que depende] |

### Tasks que Dependem Desta:
| Task | Motivo |
|------|--------|
| TASK-YYY | [Por que depende desta] |

---

## 📊 Status

| Campo | Valor |
|-------|-------|
| **Estado** | ⬜ Não Iniciado / 🟡 Em Progresso / 🟢 Concluído / 🔴 Bloqueado |
| **Prioridade** | P0 / P1 / P2 |
| **Risco** | 🟢 Low / 🟡 Medium / 🔴 High |
| **Início** | [DATA ou "—"] |
| **Conclusão** | [DATA ou "—"] |
| **Atualizado em** | [DATA] |

---

## 🚧 Bloqueios

| Descrição | Dependência | Ação | Status |
|-----------|-------------|------|--------|
| [Bloqueio] | [O que está bloqueando] | [Ação] | Ativo/Resolvido |

---

## ⚠️ Validações

### Pré-Execução
- [ ] Dependências satisfeitas
- [ ] [Verificação específica]

### Pós-Execução
- [ ] [Teste/verificação 1]
- [ ] [Teste/verificação 2]
- [ ] [Teste/verificação 3]
- [ ] Sem breaking changes em [área]
- [ ] TypeScript compila sem erros

---

## ✅ Critérios de Conclusão

- [ ] Todas as Subtasks concluídas
- [ ] Validações pós-execução passando
- [ ] [Critério específico]

---

## 📝 Notas de Implementação

[Observações técnicas, decisões, ou contexto para quem for executar]

---

## 📜 Histórico

| Data | Evento | Detalhe |
|------|--------|---------|
| [DATA] | Criada | — |
| [DATA] | [Evento] | [Detalhe] |
```

---

### 4.10 `_SUBTASKS.md`

```markdown
# 📋 SUBTASKS: TASK-[XXX]

## 🧭 Navegação
- **⬆️ Task:** [TASK-XXX](./_TASK.md) - [Nome da Task]
- **📍 Atual:** `.../Tasks/TASK-XXX_[slug]/_SUBTASKS.md`

---

## 📊 Status

| Métrica | Valor |
|---------|-------|
| Total | X |
| Concluídas | Y |
| Pendentes | Z |
| **Progresso** | XX% |

---

## 📋 Lista de Subtasks

### Preparação
- [ ] **SUBTASK-01:** [Descrição da ação atômica]
      ```
      📁 Arquivo: src/[caminho]/[arquivo].ts
      📝 Ação: [Detalhe específico]
      ```

- [ ] **SUBTASK-02:** [Descrição da ação atômica]
      ```
      📁 Arquivo: src/[caminho]/[arquivo].ts
      📝 Ação: [Detalhe específico]
      ```

### Implementação
- [ ] **SUBTASK-03:** [Descrição da ação atômica]
      ```
      📁 Arquivo: src/[caminho]/[arquivo].ts
      📝 Ação: [Detalhe específico]
      ⚠️ Atenção: [Ponto de atenção se houver]
      ```

- [ ] **SUBTASK-04:** [Descrição da ação atômica]
      ```
      📁 Arquivo: src/[caminho]/[arquivo].ts
      📝 Ação: [Detalhe específico]
      ```

### Validação
- [ ] **SUBTASK-05:** [Descrição da validação]
      ```
      🧪 Comando: [comando de teste]
      ✅ Esperado: [resultado esperado]
      ```

- [ ] **SUBTASK-06:** [Descrição da validação]
      ```
      🧪 Verificar: [o que verificar]
      ✅ Esperado: [resultado esperado]
      ```

---

## 📝 Notas

[Observações sobre as subtasks, ordem de execução, ou detalhes adicionais]

---

## 📜 Registro de Conclusão

| Subtask | Concluída em | Observação |
|---------|--------------|------------|
| SUBTASK-01 | [DATA] | [Obs se houver] |
| SUBTASK-02 | — | — |
```

---

## 5. PROMPT DE DERIVAÇÃO

Este é o prompt que transforma o `BACKLOG.md` na estrutura fractal:

```markdown
# PROMPT: DERIVAÇÃO DE BACKLOG PIPELINE

## Contexto

Você recebeu um documento `BACKLOG.md` contendo o backlog completo de um projeto, estruturado com EPICs, Fases, Tasks e informações arquiteturais.

Sua tarefa é **derivar** este documento em uma estrutura de diretórios e arquivos seguindo o **Backlog Pipeline Framework**.

---

## Estrutura Alvo

```
backlog_pipeline/
├── _MANIFEST.md
└── Epics/
    ├── _MANIFEST.md
    └── EPIC-XXX_[slug]/
        ├── _EPIC.md
        └── Fases/
            ├── _MANIFEST.md
            └── FASE-XX_[slug]/
                ├── _FASE.md
                └── Subfases/
                    ├── _MANIFEST.md
                    └── SUBFASE-XX_[slug]/
                        ├── _SUBFASE.md
                        └── Tasks/
                            ├── _MANIFEST.md
                            └── TASK-XXX_[slug]/
                                ├── _TASK.md
                                └── _SUBTASKS.md
```

---

## Regras de Derivação

### 1. Nomenclatura

**Diretórios:** `[TIPO]-[ID]_[slug]`
- IDs: EPIC-XXX (3 dígitos), FASE-XX (2 dígitos), SUBFASE-XX (2 dígitos), TASK-XXX (3 dígitos)
- Slugs: lowercase, kebab-case, max 40 chars, sem acentos

**Arquivos Globais:** Sempre com prefixo `_`

### 2. Mapeamento do BACKLOG.md

| Elemento no BACKLOG.md | Destino na Estrutura |
|------------------------|---------------------|
| Seção EPIC | Diretório `EPIC-XXX_[slug]/` + `_EPIC.md` |
| Seção FASE | Diretório `FASE-XX_[slug]/` + `_FASE.md` |
| Agrupamento de Tasks relacionadas | Diretório `SUBFASE-XX_[slug]/` + `_SUBFASE.md` |
| Task individual | Diretório `TASK-XXX_[slug]/` + `_TASK.md` |
| Checkboxes dentro de Task | Conteúdo do `_SUBTASKS.md` |

### 3. Criação de Subfases

Se o BACKLOG.md não define Subfases explicitamente:
- Agrupe Tasks por **área de impacto** (ex: "Database", "API", "Frontend")
- Ou agrupe por **sequência lógica** (ex: "Preparação", "Implementação", "Validação")
- Cada Subfase deve ter 2-5 Tasks (ideal: 3)

### 4. Preenchimento dos Arquivos

**`_MANIFEST.md`:**
- Extrair todos os itens do nível correspondente
- Calcular status inicial (todos começam como ⬜ Não Iniciado)
- Mapear dependências conforme BACKLOG.md

**`_EPIC.md`, `_FASE.md`, etc:**
- Copiar definições e justificativas do BACKLOG.md
- Manter referências de linhas (`BACKLOG.md: linhas XX-YY`)
- Preencher seções de rastreabilidade com links relativos

**`_SUBTASKS.md`:**
- Extrair cada checkbox do BACKLOG.md como SUBTASK
- Agrupar em categorias (Preparação, Implementação, Validação)
- Manter detalhes de arquivos e comandos

### 5. Links e Navegação

Todos os links devem ser **relativos** usando a notação markdown:
- Link para nível acima: `[Texto](../_ARQUIVO.md)`
- Link para nível abaixo: `[Texto](./Subdir/_ARQUIVO.md)`

---

## Processo de Execução

1. **Análise:** Leia o BACKLOG.md completo e identifique:
   - Quantos EPICs existem
   - Quantas Fases por EPIC
   - Quantas Tasks por Fase
   - Estrutura de dependências

2. **Planejamento:** Defina:
   - Nomenclatura (slugs) para cada elemento
   - Agrupamento de Subfases
   - Numeração sequencial

3. **Criação:** Execute na ordem:
   - Criar estrutura de diretórios
   - Criar `_MANIFEST.md` do topo para baixo
   - Criar arquivos de definição (`_EPIC.md`, `_FASE.md`, etc.)
   - Criar `_SUBTASKS.md` por último

4. **Validação:**
   - Verificar se todos os links funcionam
   - Confirmar que nenhuma informação foi perdida
   - Validar que a estrutura está navegável

---

## Output Esperado

Ao final, a estrutura `backlog_pipeline/` deve:

1. ✅ Conter 100% das informações do BACKLOG.md original
2. ✅ Ser navegável de qualquer ponto para qualquer outro
3. ✅ Ter todos os status inicializados como ⬜
4. ✅ Ter rastreabilidade completa (links para BACKLOG.md)
5. ✅ Seguir todas as convenções de nomenclatura

---

## Exemplo de Início

Se o BACKLOG.md contém:

```markdown
## EPIC-001: Sistema de Autenticação

### FASE 1: Infraestrutura Base
- [ ] TASK-1.1: Configurar Prisma Schema
- [ ] TASK-1.2: Criar migrations iniciais
```

A estrutura gerada será:

```
backlog_pipeline/
├── _MANIFEST.md
└── Epics/
    ├── _MANIFEST.md
    └── EPIC-001_sistema-autenticacao/
        ├── _EPIC.md
        └── Fases/
            ├── _MANIFEST.md
            └── FASE-01_infraestrutura-base/
                ├── _FASE.md
                └── Subfases/
                    ├── _MANIFEST.md
                    └── SUBFASE-01_configuracao-banco/
                        ├── _SUBFASE.md
                        └── Tasks/
                            ├── _MANIFEST.md
                            ├── TASK-001_configurar-prisma-schema/
                            │   ├── _TASK.md
                            │   └── _SUBTASKS.md
                            └── TASK-002_criar-migrations-iniciais/
                                ├── _TASK.md
                                └── _SUBTASKS.md
```

---

## Notas Finais

- Preserve a **intenção** do BACKLOG.md, não apenas o texto
- Em caso de ambiguidade, priorize **clareza e navegabilidade**
- Mantenha consistência de formatação em todos os arquivos
- Use emojis conforme os templates (melhoram legibilidade)
```

---

## 6. GUIA DE USO PELA IA

### 6.1 Cenários de Navegação

**Cenário 1: Retomar trabalho em nova sessão**
```
1. Ler: backlog_pipeline/_MANIFEST.md
2. Identificar: Epics com status 🟡 (Em Progresso)
3. Navegar: Seguir links até encontrar Task pendente
4. Executar: Abrir _TASK.md + _SUBTASKS.md
5. Trabalhar: Executar subtasks sequencialmente
6. Atualizar: Marcar checkboxes, atualizar status
```

**Cenário 2: Verificar status geral**
```
1. Ler: backlog_pipeline/_MANIFEST.md
2. Reportar: Status agregado de todos os Epics
3. Se necessário: Drill-down em Epic específico
```

**Cenário 3: Executar Task específica**
```
1. Navegar: Caminho direto até TASK-XXX/_TASK.md
2. Contexto: Se precisar, seguir links ⬆️ para entender contexto
3. Executar: Seguir _SUBTASKS.md
4. Validar: Executar validações pós-execução
5. Atualizar: Status da Task e propagar para níveis superiores
```

### 6.2 Regras de Atualização de Status

**Propagação Bottom-Up:**
```
SUBTASK concluída → Verificar se todas SUBTASKS da TASK estão ✅
    → Se sim: TASK = 🟢
        → Verificar se todas TASKS da SUBFASE estão 🟢
            → Se sim: SUBFASE = 🟢
                → Verificar se todas SUBFASES da FASE estão 🟢
                    → Se sim: FASE = 🟢
                        → Verificar se todas FASES do EPIC estão 🟢
                            → Se sim: EPIC = 🟢
```

**Regra de "Em Progresso":**
- Se pelo menos 1 item filho está 🟡 ou 🟢 → Pai é 🟡
- Se pelo menos 1 item filho está 🔴 → Considerar Pai como 🔴

### 6.3 Comandos de Contexto

Frases que a IA deve reconhecer:

| Comando do Usuário | Ação da IA |
|-------------------|------------|
| "Onde paramos?" | Ler _MANIFEST.md global, encontrar 🟡 |
| "Status do projeto" | Ler _MANIFEST.md global, reportar agregado |
| "Execute TASK-XXX" | Navegar até Task, executar subtasks |
| "O que falta no EPIC-XXX?" | Navegar até Epic, listar Tasks ⬜ |
| "Próxima task" | Encontrar próxima Task ⬜ na sequência |

---

## 7. MANUTENÇÃO E ATUALIZAÇÃO

### 7.1 Quando Atualizar

| Evento | Ação |
|--------|------|
| Subtask concluída | ✅ checkbox em _SUBTASKS.md |
| Task concluída | Status 🟢 em _TASK.md + _MANIFEST.md do diretório Tasks |
| Bloqueio identificado | Status 🔴 + descrição na seção Bloqueios |
| Nova Task necessária | Criar diretório + arquivos, atualizar _MANIFEST.md |
| Task removida/cancelada | Remover diretório, atualizar _MANIFEST.md |

### 7.2 Integridade dos Dados

**Checklist de Consistência:**
- [ ] Status nos _MANIFEST.md refletem status dos itens filhos
- [ ] Todos os links relativos funcionam
- [ ] Contadores (Total, Concluídos, etc.) estão corretos
- [ ] Datas de atualização estão atuais

### 7.3 Versionamento

Recomendações:
- Commitar `backlog_pipeline/` no Git junto com o código
- Mensagens de commit específicas: `[BACKLOG] TASK-XXX concluída`
- Não editar manualmente - sempre via IA ou scripts

---

## ANEXO: Checklist de Validação da Estrutura

Após derivação, verificar:

- [ ] `backlog_pipeline/_MANIFEST.md` existe e lista todos os Epics
- [ ] Cada Epic tem `_EPIC.md` e diretório `Fases/`
- [ ] Cada Fase tem `_FASE.md` e diretório `Subfases/`
- [ ] Cada Subfase tem `_SUBFASE.md` e diretório `Tasks/`
- [ ] Cada Task tem `_TASK.md` e `_SUBTASKS.md`
- [ ] Todos os `_MANIFEST.md` têm índices completos
- [ ] Todos os links relativos são válidos
- [ ] Nomenclatura segue padrão `TIPO-ID_slug`
- [ ] Nenhuma informação do BACKLOG.md foi perdida

---

**FIM DO DOCUMENTO**
