# Arquitetura Micro: Backoffice API v1.0

**Documento ID:** ARCH-backoffice-api-v1.0  
**Módulo:** Backoffice API  
**Bounded Context:** Orquestração & CRUD Backend  
**Data de Criação:** 2025-12-16  
**Última Atualização:** 2025-12-16  
**Baseado em:** ARCH-MACRO-v2.0  
**Status:** Draft  

---

## Visão Geral do Módulo

### Propósito e Responsabilidade

**Responsabilidade Única (SRP):**  
Servir como API principal para o frontend (Backoffice Web), orquestrando chamadas entre serviços, gerenciando autenticação/autorização, executando operações CRUD e provendo endpoints para gestão da holding.

**Bounded Context:**  
Este módulo é o **gateway de orquestração** do sistema. Ele centraliza todas as operações administrativas, validando permissões, coordenando com outros serviços especializados e garantindo consistência das operações. É a única entrada para o frontend web.

**Por que este módulo existe:**

- Centralizar autenticação e autorização (JWT + Supabase Auth)
- Prover API REST/GraphQL unificada para o frontend
- Orquestrar chamadas entre serviços especializados
- Implementar CRUD de empresas, usuários, Centurions
- Agregar dados para dashboards e métricas

---

### Localização na Arquitetura Macro

```mermaid
graph TB
    subgraph "Sistema Completo"
        WEB[Backoffice Web]
        TARGET[🎯 BACKOFFICE API<br/>Orquestração]
        AGENT[Agent Runtime]
        EVO[Evolution Manager]
        AUTENT[Autentique Service]
        CAPI[Facebook CAPI]
        DB[(PostgreSQL)]
        REDIS[(Redis)]
    end

    WEB -->|REST/GraphQL| TARGET
    
    TARGET -->|Commands| AGENT
    TARGET -->|Commands| EVO
    TARGET -->|Commands| AUTENT
    TARGET -->|Commands| CAPI
    
    TARGET <-->|CRUD| DB
    TARGET <-->|Cache/Pub| REDIS
    
    AGENT -->|Events| REDIS
    EVO -->|Events| REDIS
    REDIS -->|Subscribe| TARGET

    style TARGET fill:#45b7d1,stroke:#2c3e50,stroke-width:4px
```

---

### Capacidades Principais

| Domínio | Operações | Descrição |
|---------|-----------|-----------|
| **Auth** | Login, Refresh, Logout | Autenticação via Supabase |
| **Companies** | CRUD | Gestão de empresas da holding |
| **Users** | CRUD, Invite | Usuários por empresa |
| **Centurions** | CRUD, Config | IAs de qualificação |
| **Instances** | Connect, Disconnect, Status | Instâncias WhatsApp |
| **Leads** | List, Details, Export | Leads do CORE |
| **Contracts** | Templates, Generate, Status | Contratos digitais |
| **Pixels** | Config, Events | Marketing tracking |
| **Metrics** | Dashboards, Reports | Métricas consolidadas |

---

## Arquitetura Interna de Camadas

### Visão Geral das Camadas

```mermaid
graph TB
    subgraph "Backoffice API (Nest.js)"
        direction TB
        
        subgraph "Layer 1: Controllers"
            AuthCtrl[AuthController]
            CompaniesCtrl[CompaniesController]
            UsersCtrl[UsersController]
            CenturionsCtrl[CenturionsController]
            InstancesCtrl[InstancesController]
            LeadsCtrl[LeadsController]
            ContractsCtrl[ContractsController]
            PixelsCtrl[PixelsController]
            MetricsCtrl[MetricsController]
        end
        
        subgraph "Layer 2: Services"
            AuthSvc[AuthService]
            CompaniesSvc[CompaniesService]
            UsersSvc[UsersService]
            CenturionsSvc[CenturionsService]
            InstancesSvc[InstancesService]
            LeadsSvc[LeadsService]
            ContractsSvc[ContractsService]
            PixelsSvc[PixelsService]
            MetricsSvc[MetricsService]
        end
        
        subgraph "Layer 3: Domain"
            Company[Company<br/>Aggregate]
            User[User<br/>Entity]
            Centurion[CenturionConfig<br/>Entity]
            Lead[Lead<br/>Entity]
        end
        
        subgraph "Layer 4: Infrastructure"
            CompaniesRepo[CompaniesRepository]
            UsersRepo[UsersRepository]
            CenturionsRepo[CenturionsRepository]
            LeadsRepo[LeadsRepository]
            SupabaseAdapter[SupabaseAdapter]
            ServiceClients[Service Clients<br/>Evolution, Autentique, CAPI]
        end
        
        subgraph "Cross-Cutting"
            Guards[Guards<br/>JWT, Roles]
            Interceptors[Interceptors<br/>Logging, Transform]
            Filters[Filters<br/>Exception]
            Pipes[Pipes<br/>Validation]
        end
    end

    AuthCtrl --> AuthSvc
    CompaniesCtrl --> CompaniesSvc
    CenturionsCtrl --> CenturionsSvc
    InstancesCtrl --> InstancesSvc
    LeadsCtrl --> LeadsSvc
    
    CompaniesSvc --> CompaniesRepo
    CenturionsSvc --> CenturionsRepo
    LeadsSvc --> LeadsRepo
    
    CompaniesRepo --> SupabaseAdapter
    InstancesSvc --> ServiceClients

    style Guards fill:#feca57
    style ServiceClients fill:#ff6b6b
```

---

## Layer 1: Controllers

### Estrutura de Arquivos

```
src/
├── modules/
│   ├── auth/
│   │   └── controllers/
│   │       └── auth.controller.ts
│   │
│   ├── companies/
│   │   └── controllers/
│   │       ├── companies.controller.ts
│   │       └── company-users.controller.ts
│   │
│   ├── centurions/
│   │   └── controllers/
│   │       └── centurions.controller.ts
│   │
│   ├── instances/
│   │   └── controllers/
│   │       └── instances.controller.ts
│   │
│   ├── leads/
│   │   └── controllers/
│   │       └── leads.controller.ts
│   │
│   ├── contracts/
│   │   └── controllers/
│   │       ├── contracts.controller.ts
│   │       └── templates.controller.ts
│   │
│   ├── pixels/
│   │   └── controllers/
│   │       └── pixels.controller.ts
│   │
│   └── metrics/
│       └── controllers/
│           └── metrics.controller.ts
```

---

### Endpoints por Módulo

#### Auth Module

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/auth/login` | Login com email/senha | ❌ |
| POST | `/auth/refresh` | Refresh token | ❌ |
| POST | `/auth/logout` | Logout | ✅ |
| GET | `/auth/me` | Dados do usuário logado | ✅ |
| POST | `/auth/forgot-password` | Solicita reset de senha | ❌ |
| POST | `/auth/reset-password` | Reseta senha com token | ❌ |

#### Companies Module

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| GET | `/companies` | Lista empresas | backoffice_admin |
| POST | `/companies` | Cria empresa | backoffice_admin |
| GET | `/companies/:id` | Detalhes empresa | backoffice_admin |
| PATCH | `/companies/:id` | Atualiza empresa | backoffice_admin |
| DELETE | `/companies/:id` | Arquiva empresa | super_admin |
| GET | `/companies/:id/users` | Lista usuários | backoffice_admin |
| POST | `/companies/:id/users` | Adiciona usuário | backoffice_admin |
| DELETE | `/companies/:id/users/:userId` | Remove usuário | backoffice_admin |

#### Centurions Module

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| GET | `/centurions` | Lista Centurions | backoffice_admin, ai_supervisor |
| POST | `/centurions` | Cria Centurion | backoffice_admin |
| GET | `/centurions/:id` | Detalhes Centurion | backoffice_admin, ai_supervisor |
| PATCH | `/centurions/:id` | Atualiza config | backoffice_admin |
| DELETE | `/centurions/:id` | Remove Centurion | backoffice_admin |
| POST | `/centurions/:id/test` | Testa prompt | backoffice_admin |
| GET | `/centurions/:id/metrics` | Métricas do Centurion | backoffice_admin, ai_supervisor |

#### Instances Module

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| GET | `/instances` | Lista instâncias | backoffice_admin |
| POST | `/instances` | Cria instância | backoffice_admin |
| GET | `/instances/:id` | Detalhes | backoffice_admin |
| POST | `/instances/:id/connect` | Conecta (gera QR) | backoffice_admin |
| POST | `/instances/:id/disconnect` | Desconecta | backoffice_admin |
| GET | `/instances/:id/qrcode` | QR code atual | backoffice_admin |
| DELETE | `/instances/:id` | Remove instância | backoffice_admin |

#### Leads Module

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| GET | `/leads` | Lista leads | backoffice_admin, ai_supervisor |
| GET | `/leads/:id` | Detalhes lead | backoffice_admin, ai_supervisor |
| GET | `/leads/:id/conversations` | Histórico conversas | backoffice_admin, ai_supervisor |
| GET | `/leads/:id/timeline` | Timeline de eventos | backoffice_admin, ai_supervisor |
| POST | `/leads/export` | Exporta CSV/Excel | backoffice_admin |

#### Contracts Module

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| GET | `/contracts/templates` | Lista templates | backoffice_admin |
| POST | `/contracts/templates` | Cria template | backoffice_admin |
| PATCH | `/contracts/templates/:id` | Atualiza template | backoffice_admin |
| DELETE | `/contracts/templates/:id` | Remove template | backoffice_admin |
| GET | `/contracts` | Lista contratos | backoffice_admin |
| POST | `/contracts` | Gera contrato | backoffice_admin |
| GET | `/contracts/:id` | Detalhes contrato | backoffice_admin |

#### Pixels Module

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| GET | `/pixels` | Lista configs pixel | backoffice_admin, marketing_admin |
| POST | `/pixels` | Configura pixel | backoffice_admin, marketing_admin |
| PATCH | `/pixels/:id` | Atualiza config | backoffice_admin, marketing_admin |
| DELETE | `/pixels/:id` | Remove config | backoffice_admin |
| GET | `/pixels/:id/events` | Eventos enviados | backoffice_admin, marketing_admin |

#### Metrics Module

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| GET | `/metrics/overview` | Dashboard geral | backoffice_admin |
| GET | `/metrics/leads` | Métricas de leads | backoffice_admin |
| GET | `/metrics/conversions` | Métricas de conversão | backoffice_admin |
| GET | `/metrics/centurions` | Performance IAs | backoffice_admin |
| GET | `/metrics/companies/:id` | Métricas por empresa | backoffice_admin |

---

### Guards - Autenticação e Autorização

```mermaid
flowchart TD
    Request[Request] --> JwtGuard{JWT Guard}
    
    JwtGuard -->|No Token| 401[401 Unauthorized]
    JwtGuard -->|Invalid| 401
    JwtGuard -->|Valid| ExtractUser[Extrair User]
    
    ExtractUser --> RolesGuard{Roles Guard}
    
    RolesGuard -->|No Role Required| Continue[Continuar]
    RolesGuard -->|Has Required Role| Continue
    RolesGuard -->|Missing Role| 403[403 Forbidden]
    
    Continue --> CompanyGuard{Company Guard}
    
    CompanyGuard -->|backoffice_admin| AllCompanies[Acesso Total]
    CompanyGuard -->|Other Roles| CheckCompany{company_id<br/>no JWT?}
    
    CheckCompany -->|Matches| FilteredAccess[Acesso Filtrado]
    CheckCompany -->|Mismatch| 403
    
    AllCompanies --> Controller[Controller]
    FilteredAccess --> Controller
```

---

### Exemplo de Controller

```typescript
// controllers/companies.controller.ts

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Companies')
export class CompaniesController {
  constructor(private readonly companiesService: ICompaniesService) {}

  @Get()
  @Roles('backoffice_admin', 'super_admin')
  @ApiOperation({ summary: 'Lista todas as empresas' })
  async findAll(
    @Query() filters: ListCompaniesDTO,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResponse<CompanyResponseDTO>> {
    return this.companiesService.findAll(filters);
  }

  @Post()
  @Roles('backoffice_admin', 'super_admin')
  @ApiOperation({ summary: 'Cria nova empresa' })
  async create(
    @Body() dto: CreateCompanyDTO,
    @CurrentUser() user: JwtPayload,
  ): Promise<CompanyResponseDTO> {
    return this.companiesService.create(dto, user.id);
  }

  @Get(':id')
  @Roles('backoffice_admin', 'super_admin')
  @ApiOperation({ summary: 'Detalhes da empresa' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompanyDetailResponseDTO> {
    return this.companiesService.findById(id);
  }

  @Patch(':id')
  @Roles('backoffice_admin', 'super_admin')
  @ApiOperation({ summary: 'Atualiza empresa' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDTO,
  ): Promise<CompanyResponseDTO> {
    return this.companiesService.update(id, dto);
  }
}
```

---

## Layer 2: Services

### Estrutura de Arquivos

```
src/
├── modules/
│   ├── auth/
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── supabase.strategy.ts
│   │   └── interfaces/
│   │       └── auth.service.interface.ts
│   │
│   ├── companies/
│   │   ├── services/
│   │   │   ├── companies.service.ts
│   │   │   └── company-users.service.ts
│   │   ├── dto/
│   │   │   ├── create-company.dto.ts
│   │   │   ├── update-company.dto.ts
│   │   │   └── company-response.dto.ts
│   │   └── interfaces/
│   │       └── companies.service.interface.ts
│   │
│   ├── centurions/
│   │   ├── services/
│   │   │   └── centurions.service.ts
│   │   ├── dto/
│   │   └── interfaces/
│   │
│   ├── instances/
│   │   ├── services/
│   │   │   └── instances.service.ts
│   │   ├── clients/
│   │   │   └── evolution.client.ts
│   │   └── dto/
│   │
│   ├── leads/
│   │   ├── services/
│   │   │   └── leads.service.ts
│   │   └── dto/
│   │
│   └── metrics/
│       ├── services/
│       │   ├── metrics.service.ts
│       │   └── aggregation.service.ts
│       └── dto/
```

---

### CompaniesService - Fluxo de Criação

```mermaid
sequenceDiagram
    autonumber
    participant Controller
    participant Service as CompaniesService
    participant Repo as CompaniesRepository
    participant SchemaProvisioner as SchemaProvisioner
    participant DB as PostgreSQL
    participant Events as EventPublisher

    Controller->>Service: create(dto, userId)
    activate Service
    
    Service->>Service: Validate DTO
    Service->>Service: Generate slug from name
    
    Service->>Repo: existsBySlug(slug)
    Repo->>DB: SELECT EXISTS
    DB-->>Repo: false
    Repo-->>Service: false
    
    Service->>Repo: save(company)
    Repo->>DB: INSERT INTO core.companies
    DB-->>Repo: Company
    Repo-->>Service: Company
    
    Service->>SchemaProvisioner: provisionSchema(company.id, slug)
    activate SchemaProvisioner
    SchemaProvisioner->>DB: CREATE SCHEMA {slug}
    SchemaProvisioner->>DB: Clone from _template_base
    SchemaProvisioner->>DB: Apply RLS policies
    SchemaProvisioner-->>Service: Schema created
    deactivate SchemaProvisioner
    
    Service->>Repo: createCompanyCrm(company.id, slug)
    Repo->>DB: INSERT INTO core.company_crms
    
    Service->>Events: publish(CompanyCreatedEvent)
    
    Service-->>Controller: CompanyResponseDTO
    deactivate Service
```

---

### CenturionsService - Gestão de Configuração

```mermaid
sequenceDiagram
    autonumber
    participant Controller
    participant Service as CenturionsService
    participant Repo as CenturionsRepository
    participant AgentClient as AgentRuntimeClient
    participant Events as EventPublisher

    Controller->>Service: update(id, dto)
    activate Service
    
    Service->>Repo: findById(id)
    Repo-->>Service: CenturionConfig
    
    Service->>Service: Validate changes
    Service->>Service: Merge with existing config
    
    Service->>Repo: save(centurion)
    Repo-->>Service: Updated CenturionConfig
    
    Service->>Events: publish(CenturionConfigUpdatedEvent)
    Note over Events: Agent Runtime<br/>subscreve e recarrega
    
    Service-->>Controller: CenturionResponseDTO
    deactivate Service

    opt Test Prompt
        Controller->>Service: testPrompt(id, testMessage)
        Service->>AgentClient: POST /centurions/{id}/test
        AgentClient-->>Service: TestResponse
        Service-->>Controller: TestResultDTO
    end
```

---

### InstancesService - Integração com Evolution Manager

```mermaid
sequenceDiagram
    participant Controller
    participant Service as InstancesService
    participant EvoClient as EvolutionManagerClient
    participant Repo as InstancesRepository
    participant Redis

    Controller->>Service: connect(instanceId)
    activate Service
    
    Service->>Repo: findById(instanceId)
    Repo-->>Service: Instance
    
    Service->>EvoClient: POST /instances/{id}/connect
    EvoClient-->>Service: { qrcode, expires_at }
    
    Service->>Repo: updateStatus(id, 'awaiting_scan')
    
    Service-->>Controller: QRCodeResponseDTO
    deactivate Service

    Note over Redis: Evolution Manager publica<br/>eventos de status

    Redis->>Service: subscribe(instance.connected)
    Service->>Repo: updateStatus(id, 'connected')
    Service->>Controller: WebSocket notification
```

---

### MetricsService - Agregação de Dados

```mermaid
flowchart TD
    Request[GET /metrics/overview] --> Service[MetricsService]
    
    Service --> Parallel{Consultas Paralelas}
    
    Parallel --> LeadsQuery[Leads por período]
    Parallel --> ConversionsQuery[Conversões]
    Parallel --> CenturionQuery[Performance IAs]
    Parallel --> CompanyQuery[Por empresa]
    
    LeadsQuery --> Aggregate[Agregação]
    ConversionsQuery --> Aggregate
    CenturionQuery --> Aggregate
    CompanyQuery --> Aggregate
    
    Aggregate --> Cache[Cache Redis<br/>TTL: 5min]
    Cache --> Response[MetricsOverviewDTO]
```

---

### Exemplo de Contrato (Interface)

```typescript
// services/interfaces/companies.service.interface.ts

export interface ICompaniesService {
  create(dto: CreateCompanyDTO, userId: string): Promise<CompanyResponseDTO>;
  findAll(filters: ListCompaniesDTO): Promise<PaginatedResponse<CompanyResponseDTO>>;
  findById(id: string): Promise<CompanyDetailResponseDTO>;
  update(id: string, dto: UpdateCompanyDTO): Promise<CompanyResponseDTO>;
  archive(id: string): Promise<void>;
  
  // Company Users
  addUser(companyId: string, dto: AddUserDTO): Promise<CompanyUserResponseDTO>;
  removeUser(companyId: string, userId: string): Promise<void>;
  listUsers(companyId: string): Promise<CompanyUserListDTO>;
}

// DTOs
export interface CreateCompanyDTO {
  name: string;
  document?: string;
  settings?: CompanySettingsDTO;
}

export interface CompanyResponseDTO {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  status: CompanyStatus;
  schema_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface CompanyDetailResponseDTO extends CompanyResponseDTO {
  users_count: number;
  leads_count: number;
  centurions_count: number;
  instances_count: number;
  settings: CompanySettingsDTO;
}
```

---

## Layer 3: Domain

### Diagrama de Entidades

```plantuml
@startuml
package "Domain" {
    class Company <<Aggregate Root>> {
        - id: UUID
        - name: string
        - slug: string
        - document: string
        - status: CompanyStatus
        - settings: CompanySettings
        --
        + activate(): void
        + suspend(): void
        + archive(): void
        + updateSettings(settings): void
    }
    
    class CompanyUser <<Entity>> {
        - id: UUID
        - company_id: UUID
        - user_id: UUID
        - role: UserRole
        - permissions: Permission[]
        --
        + changeRole(role): void
        + grantPermission(perm): void
    }
    
    class CenturionConfig <<Entity>> {
        - id: UUID
        - company_id: UUID
        - name: string
        - system_prompt: string
        - qualification_criteria: object
        - tools_enabled: string[]
        --
        + updatePrompt(prompt): void
        + enableTool(tool): void
        + disableTool(tool): void
    }
    
    enum CompanyStatus {
        ACTIVE
        SUSPENDED
        ARCHIVED
    }
    
    enum UserRole {
        SUPER_ADMIN
        BACKOFFICE_ADMIN
        AI_SUPERVISOR
        MARKETING_ADMIN
        CRM_MANAGER
        CRM_USER
    }
    
    class CompanySettings <<Value Object>> {
        - timezone: string
        - language: string
        - branding: BrandingConfig
        - notifications: NotificationConfig
    }
}

Company "1" --> "*" CompanyUser
Company "1" --> "*" CenturionConfig
Company --> CompanyStatus
Company --> CompanySettings
CompanyUser --> UserRole

@enduml
```

---

### Estrutura de Arquivos

```
src/
├── modules/
│   ├── companies/
│   │   └── domain/
│   │       ├── entities/
│   │       │   ├── company.entity.ts
│   │       │   └── company-user.entity.ts
│   │       ├── value-objects/
│   │       │   └── company-settings.vo.ts
│   │       ├── enums/
│   │       │   ├── company-status.enum.ts
│   │       │   └── user-role.enum.ts
│   │       └── events/
│   │           ├── company-created.event.ts
│   │           └── company-status-changed.event.ts
│   │
│   └── centurions/
│       └── domain/
│           ├── entities/
│           │   └── centurion-config.entity.ts
│           └── events/
│               └── centurion-config-updated.event.ts
```

---

### Company - Máquina de Estados

```mermaid
stateDiagram-v2
    [*] --> Active: create()
    Active --> Suspended: suspend()
    Suspended --> Active: reactivate()
    Active --> Archived: archive()
    Suspended --> Archived: archive()
    Archived --> [*]
    
    note right of Active
        Operação normal
        Pode receber leads
    end note
    
    note right of Suspended
        Temporariamente pausada
        Não recebe novos leads
    end note
    
    note right of Archived
        Estado terminal
        Dados preservados
        Read-only
    end note
```

---

## Layer 4: Infrastructure

### Diagrama de Componentes

```plantuml
@startuml
package "Infrastructure" {
    package "Repositories" {
        [CompaniesRepository]
        [UsersRepository]
        [CenturionsRepository]
        [LeadsRepository]
    }
    
    package "Service Clients" {
        [EvolutionManagerClient]
        [AutentiqueServiceClient]
        [FacebookCAPIClient]
        [AgentRuntimeClient]
    }
    
    package "Adapters" {
        [SupabaseAdapter]
        [RedisAdapter]
    }
}

package "External Services" {
    [Evolution Manager] as evo
    [Autentique Service] as autent
    [Facebook CAPI] as capi
    [Agent Runtime] as agent
}

package "Data Stores" {
    database "PostgreSQL" as db
    database "Redis" as redis
}

[CompaniesRepository] --> [SupabaseAdapter]
[UsersRepository] --> [SupabaseAdapter]
[SupabaseAdapter] --> db

[EvolutionManagerClient] --> evo
[AutentiqueServiceClient] --> autent
[FacebookCAPIClient] --> capi
[AgentRuntimeClient] --> agent

[RedisAdapter] --> redis

@enduml
```

---

### Estrutura de Arquivos

```
src/
├── infrastructure/
│   ├── supabase/
│   │   ├── supabase.module.ts
│   │   ├── supabase.service.ts
│   │   └── supabase.config.ts
│   │
│   ├── redis/
│   │   ├── redis.module.ts
│   │   ├── redis.service.ts
│   │   └── redis-subscriber.service.ts
│   │
│   ├── clients/
│   │   ├── evolution-manager.client.ts
│   │   ├── autentique-service.client.ts
│   │   ├── facebook-capi.client.ts
│   │   └── agent-runtime.client.ts
│   │
│   └── repositories/
│       ├── companies.repository.ts
│       ├── users.repository.ts
│       ├── centurions.repository.ts
│       ├── leads.repository.ts
│       └── mappers/
│           ├── company.mapper.ts
│           └── centurion.mapper.ts
```

---

### Service Clients - Comunicação com Serviços

```typescript
// infrastructure/clients/evolution-manager.client.ts

@Injectable()
export class EvolutionManagerClient {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.configService.get('EVOLUTION_MANAGER_URL');
  }

  async createInstance(dto: CreateInstanceDTO): Promise<InstanceDTO> {
    const response = await this.httpService.axiosRef.post(
      `${this.baseUrl}/instances`,
      dto,
    );
    return response.data;
  }

  async connect(instanceId: string): Promise<QRCodeDTO> {
    const response = await this.httpService.axiosRef.post(
      `${this.baseUrl}/instances/${instanceId}/connect`,
    );
    return response.data;
  }

  async disconnect(instanceId: string): Promise<void> {
    await this.httpService.axiosRef.post(
      `${this.baseUrl}/instances/${instanceId}/disconnect`,
    );
  }

  async getStatus(instanceId: string): Promise<InstanceStatusDTO> {
    const response = await this.httpService.axiosRef.get(
      `${this.baseUrl}/instances/${instanceId}/status`,
    );
    return response.data;
  }
}
```

---

### Redis Subscriber - Eventos em Tempo Real

```mermaid
sequenceDiagram
    participant EvoManager as Evolution Manager
    participant Redis as Redis
    participant Subscriber as RedisSubscriber
    participant Gateway as WebSocket Gateway
    participant Frontend as Backoffice Web

    EvoManager->>Redis: publish(instance.connected)
    Redis->>Subscriber: message
    Subscriber->>Subscriber: Parse event
    Subscriber->>Gateway: notify(event)
    Gateway->>Frontend: WebSocket push
    
    Note over Frontend: UI atualiza status<br/>da instância
```

---

## Cross-Cutting Concerns

### Autenticação (JWT + Supabase)

```mermaid
flowchart TD
    Request[Request + JWT] --> JwtStrategy[JWT Strategy]
    
    JwtStrategy --> Validate{Token Válido?}
    Validate -->|Não| 401[401 Unauthorized]
    Validate -->|Sim| Decode[Decodificar Claims]
    
    Decode --> BuildPayload[Construir JwtPayload]
    
    BuildPayload --> Payload["
        {
          sub: user_id,
          role: 'backoffice_admin',
          company_id: uuid,
          permissions: [...],
          schema_name: 'empresa_alpha'
        }
    "]
    
    Payload --> Inject[Injetar no Request]
    Inject --> Controller[Controller]
```

---

### Exception Handling

```typescript
// common/filters/global-exception.filter.ts

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = (exceptionResponse as any).message || exception.message;
      code = (exceptionResponse as any).code || 'HTTP_ERROR';
    }

    if (exception instanceof DomainException) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      message = exception.message;
      code = exception.code;
    }

    // Log estruturado
    this.logger.error({
      path: request.url,
      method: request.method,
      status,
      code,
      message,
      user: request.user?.sub,
      company: request.user?.company_id,
    });

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

### Logging Interceptor

```typescript
// common/interceptors/logging.interceptor.ts

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        
        this.logger.log({
          type: 'request',
          method,
          url,
          user_id: user?.sub,
          company_id: user?.company_id,
          duration_ms: duration,
          status: 'success',
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        this.logger.error({
          type: 'request',
          method,
          url,
          user_id: user?.sub,
          company_id: user?.company_id,
          duration_ms: duration,
          status: 'error',
          error: error.message,
        });
        
        throw error;
      }),
    );
  }
}
```

---

## Integração com Outros Serviços

### Diagrama de Integração

```mermaid
graph TB
    subgraph "Frontend"
        Web[Backoffice Web]
    end

    subgraph "Backoffice API"
        API[REST API]
        WSGateway[WebSocket Gateway]
        Subscriber[Redis Subscriber]
    end

    subgraph "Serviços Especializados"
        Agent[Agent Runtime]
        Evo[Evolution Manager]
        Autent[Autentique Service]
        CAPI[Facebook CAPI]
    end

    subgraph "Redis"
        PubSub[(Pub/Sub)]
    end

    subgraph "Database"
        DB[(PostgreSQL)]
    end

    Web -->|REST| API
    Web <-->|WS| WSGateway
    
    API -->|HTTP| Agent
    API -->|HTTP| Evo
    API -->|HTTP| Autent
    API -->|HTTP| CAPI
    
    API -->|SQL| DB
    
    Agent -->|publish| PubSub
    Evo -->|publish| PubSub
    Autent -->|publish| PubSub
    
    PubSub -->|subscribe| Subscriber
    Subscriber -->|notify| WSGateway

    style API fill:#45b7d1,stroke:#2c3e50,stroke-width:3px
```

---

### Eventos Recebidos (Subscriber)

| Evento | Origem | Ação |
|--------|--------|------|
| `instance.connected` | Evolution Manager | Notificar frontend via WS |
| `instance.disconnected` | Evolution Manager | Notificar frontend via WS |
| `lead.qualified` | Agent Runtime | Atualizar dashboard |
| `contract.signed` | Autentique Service | Notificar frontend via WS |

---

## Padrões Técnicos

### Validação de DTOs

```typescript
// dto/create-company.dto.ts

export class CreateCompanyDTO {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @ApiProperty({ example: 'Imobiliária ABC' })
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve ter 14 dígitos' })
  @ApiProperty({ example: '12345678000199', required: false })
  document?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompanySettingsDTO)
  settings?: CompanySettingsDTO;
}
```

---

### Paginação

```typescript
// common/dto/pagination.dto.ts

export class PaginationDTO {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset: number = 0;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
```

---

### OpenAPI/Swagger

```typescript
// main.ts

const config = new DocumentBuilder()
  .setTitle('Backoffice API')
  .setDescription('API do Back-Office Multi-Tenant')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Auth', 'Autenticação')
  .addTag('Companies', 'Gestão de Empresas')
  .addTag('Centurions', 'IAs de Qualificação')
  .addTag('Instances', 'Instâncias WhatsApp')
  .addTag('Leads', 'Leads do Sistema')
  .addTag('Metrics', 'Métricas e Dashboards')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

### Métricas

```typescript
// Métricas expostas via Prometheus

// Counters
http_requests_total{method, path, status}
auth_login_total{status}
company_created_total{}

// Histograms
http_request_duration_seconds{method, path}
database_query_duration_seconds{operation}

// Gauges
active_websocket_connections{}
```

---

## Implementação - Checklist

### Fase 1: Estrutura Base ✅

- [ ] Setup Nest.js com TypeScript
- [ ] Configurar Supabase client
- [ ] Configurar Redis client
- [ ] Configurar JWT auth
- [ ] Global exception filter
- [ ] Logging interceptor

### Fase 2: Auth Module ✅

- [ ] JWT strategy
- [ ] Auth controller
- [ ] Auth service
- [ ] Guards (JWT, Roles)

### Fase 3: Companies Module ✅

- [ ] Companies controller
- [ ] Companies service
- [ ] Company entity
- [ ] Company repository
- [ ] Schema provisioner

### Fase 4: Centurions Module ✅

- [ ] Centurions controller
- [ ] Centurions service
- [ ] CenturionConfig entity
- [ ] Integration com Agent Runtime

### Fase 5: Outros Módulos ✅

- [ ] Instances module
- [ ] Leads module
- [ ] Contracts module
- [ ] Pixels module
- [ ] Metrics module

### Fase 6: Integrations ✅

- [ ] Evolution Manager client
- [ ] Autentique Service client
- [ ] Facebook CAPI client
- [ ] Redis subscriber
- [ ] WebSocket gateway

---

## Referências

### Documentos Relacionados

| Documento | Seção | Link |
|-----------|-------|------|
| Arquitetura Macro | SVC-002 | ARCH-MACRO-v2.0 |
| Governance & Companies | Empresas | arch-micro-governance-companies.md |
| RLS & Security | Guards | arch-micro-rls-security.md |

### Tecnologias

- **Nest.js**: https://docs.nestjs.com
- **Supabase**: https://supabase.com/docs
- **Passport JWT**: https://docs.nestjs.com/security/authentication

---

**FIM DO DOCUMENTO**

---

*Arquitetura Micro: Backoffice API v1.0*  
*Orquestração & CRUD Backend*  
*Gerado em: 2025-12-16*
