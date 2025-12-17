# Arquitetura Micro: Evolution Manager v1.0

**Documento ID:** ARCH-evolution-manager-v1.0  
**Módulo:** Evolution Manager  
**Bounded Context:** Gerenciamento de Instâncias WhatsApp & Comunicação  
**Data de Criação:** 2025-12-16  
**Última Atualização:** 2025-12-16  
**Baseado em:** ARCH-MACRO-v2.0  
**Status:** Draft  

---

## Visão Geral do Módulo

### Propósito e Responsabilidade

**Responsabilidade Única (SRP):**  
Gerenciar o ciclo de vida completo de instâncias WhatsApp via Evolution API, processando webhooks de mensagens e status, e fornecendo interface unificada para envio de mensagens.

**Bounded Context:**  
Este módulo é o **gateway de comunicação WhatsApp** do sistema. Ele abstrai toda a complexidade da Evolution API, gerenciando conexões, QR codes, status de instâncias, recebimento e envio de mensagens. Outros serviços não precisam conhecer detalhes da Evolution API.

**Por que este módulo existe:**

- Abstrair a complexidade da Evolution API
- Centralizar gestão de múltiplas instâncias WhatsApp
- Garantir que mensagens sejam entregues de forma confiável
- Monitorar status de conexão e reagir a desconexões
- Transformar webhooks em eventos padronizados para o sistema

---

### Localização na Arquitetura Macro

```mermaid
graph TB
    subgraph "Sistema Completo"
        EVOLUTION[Evolution API<br/>WhatsApp Provider]
        TARGET[🎯 EVOLUTION MANAGER<br/>Gerenciamento WA]
        AGENT[Agent Runtime]
        API[Backoffice API]
        WEB[Backoffice Web]
        REDIS[(Redis)]
        DB[(PostgreSQL)]
    end

    EVOLUTION <-->|REST + Webhooks| TARGET
    TARGET -->|message.received| REDIS
    REDIS -->|message.sent| TARGET
    TARGET <-->|status| DB
    
    AGENT -->|subscribe| REDIS
    AGENT -->|publish| REDIS
    
    API -->|REST| TARGET
    WEB -->|via API| API

    style TARGET fill:#feca57,stroke:#2c3e50,stroke-width:4px
```

---

### Capacidades Principais

| Operação | Tipo | Descrição | Input | Output |
|----------|------|-----------|-------|--------|
| **CreateInstance** | Command | Cria nova instância WhatsApp | `CreateInstanceDTO` | `InstanceDTO` |
| **ConnectInstance** | Command | Inicia conexão (gera QR) | `InstanceIdDTO` | `QRCodeDTO` |
| **DisconnectInstance** | Command | Desconecta instância | `InstanceIdDTO` | `void` |
| **GetInstanceStatus** | Query | Status atual da instância | `InstanceIdDTO` | `InstanceStatusDTO` |
| **SendMessage** | Command | Envia mensagem de texto | `SendMessageDTO` | `MessageSentDTO` |
| **SendMedia** | Command | Envia mídia (áudio, imagem) | `SendMediaDTO` | `MessageSentDTO` |
| **ListInstances** | Query | Lista instâncias da empresa | `CompanyIdDTO` | `InstanceListDTO` |
| **ProcessWebhook** | Command | Processa webhook da Evolution | `WebhookPayloadDTO` | `void` |

---

## Arquitetura Interna de Camadas

### Visão Geral das Camadas

```mermaid
graph TB
    subgraph "Evolution Manager (Nest.js)"
        direction TB
        
        subgraph "Layer 1: Controllers"
            InstanceCtrl[InstancesController<br/>REST API]
            WebhookCtrl[WebhooksController<br/>Evolution Webhooks]
            MessageCtrl[MessagesController<br/>Envio de Mensagens]
        end
        
        subgraph "Layer 2: Services"
            InstanceSvc[InstancesService<br/>Gestão de Instâncias]
            WebhookProc[WebhookProcessor<br/>Processamento de Webhooks]
            MessageSvc[MessagesService<br/>Envio de Mensagens]
            StatusMonitor[StatusMonitor<br/>Monitoramento]
        end
        
        subgraph "Layer 3: Domain"
            Instance[Instance<br/>Entity]
            InstanceStatus[InstanceStatus<br/>Value Object]
            Message[Message<br/>Entity]
            WebhookEvent[WebhookEvent<br/>Value Object]
        end
        
        subgraph "Layer 4: Infrastructure"
            InstanceRepo[InstanceRepository]
            EvolutionClient[EvolutionClient<br/>HTTP Client]
            RedisPublisher[RedisPublisher]
            SupabaseAdapter[SupabaseAdapter]
        end
        
        subgraph "Cross-Cutting"
            Events[Domain Events]
            DTOs[DTOs]
            Guards[Auth Guards]
        end
    end

    InstanceCtrl --> InstanceSvc
    WebhookCtrl --> WebhookProc
    MessageCtrl --> MessageSvc
    
    InstanceSvc --> Instance
    InstanceSvc --> InstanceRepo
    InstanceSvc --> EvolutionClient
    
    WebhookProc --> RedisPublisher
    WebhookProc --> InstanceRepo
    
    MessageSvc --> EvolutionClient
    MessageSvc --> RedisPublisher
    
    InstanceRepo --> SupabaseAdapter
    
    StatusMonitor --> EvolutionClient
    StatusMonitor --> InstanceRepo

    style EvolutionClient fill:#feca57,stroke:#2c3e50,stroke-width:3px
    style WebhookProc fill:#ff6b6b,stroke:#2c3e50,stroke-width:2px
```

---

### Regra de Dependência

```
Controllers (Entry Points)
         ↓
    Services (Application)
         ↓
    Domain (Entities/VOs)
         ↓
  Infrastructure (Evolution/Redis/Supabase)

Regra: Domain não conhece Evolution API, Redis, Supabase
EvolutionClient é injetado via interface no Service
```

---

## Layer 1: Controllers

### Responsabilidade da Camada

**O que faz:**

- Expõe endpoints REST para gestão de instâncias
- Recebe webhooks da Evolution API
- Valida payloads de entrada
- Autentica requisições (JWT para REST, secret para webhooks)

**O que NÃO faz:**

- ❌ Lógica de processamento de webhooks
- ❌ Comunicação direta com Evolution API
- ❌ Acesso direto ao banco

---

### Estrutura de Arquivos

```
src/
├── modules/
│   ├── instances/
│   │   └── controllers/
│   │       ├── instances.controller.ts      # CRUD de instâncias
│   │       └── webhooks.controller.ts       # Recebe webhooks
│   │
│   └── messages/
│       └── controllers/
│           └── messages.controller.ts       # Envio de mensagens
```

---

### Endpoints REST

```mermaid
graph LR
    subgraph "Instances API"
        POST_CREATE[POST /instances]
        GET_LIST[GET /instances]
        GET_ONE[GET /instances/:id]
        POST_CONNECT[POST /instances/:id/connect]
        POST_DISCONNECT[POST /instances/:id/disconnect]
        GET_QR[GET /instances/:id/qrcode]
        GET_STATUS[GET /instances/:id/status]
    end

    subgraph "Messages API"
        POST_TEXT[POST /messages/text]
        POST_MEDIA[POST /messages/media]
        POST_BATCH[POST /messages/batch]
    end

    subgraph "Webhooks"
        POST_WEBHOOK[POST /webhooks/evolution]
    end
```

---

### Webhook Controller - Autenticação

```mermaid
sequenceDiagram
    participant Evolution as Evolution API
    participant Controller as WebhooksController
    participant Guard as WebhookGuard
    participant Processor as WebhookProcessor

    Evolution->>Controller: POST /webhooks/evolution
    Controller->>Guard: validate(headers, body)
    
    alt Secret Inválido
        Guard-->>Controller: UnauthorizedException
        Controller-->>Evolution: 401 Unauthorized
    else Secret Válido
        Guard-->>Controller: OK
        Controller->>Processor: process(payload)
        Processor-->>Controller: void
        Controller-->>Evolution: 200 OK
    end
```

---

### Exemplo de Contrato

```typescript
// controllers/instances.controller.ts

@Controller('instances')
@UseGuards(JwtAuthGuard)
export class InstancesController {
  constructor(private readonly instancesService: IInstancesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateInstanceDTO,
    @CurrentUser() user: JwtPayload,
  ): Promise<InstanceResponseDTO> {
    return this.instancesService.create(dto, user.company_id);
  }

  @Post(':id/connect')
  async connect(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<QRCodeResponseDTO> {
    return this.instancesService.connect(id, user.company_id);
  }

  @Get(':id/status')
  async getStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<InstanceStatusDTO> {
    return this.instancesService.getStatus(id, user.company_id);
  }
}
```

---

## Layer 2: Services

### Responsabilidade da Camada

**O que faz:**

- Orquestra operações de gestão de instâncias
- Processa webhooks e transforma em eventos
- Coordena envio de mensagens
- Monitora status de conexão

**O que NÃO faz:**

- ❌ Conhecer detalhes de HTTP/REST
- ❌ Implementar protocolo Evolution diretamente
- ❌ Conter regras de negócio de qualificação

---

### Diagrama de Componentes

```plantuml
@startuml
package "Services Layer" {
    [InstancesService] as instances
    [WebhookProcessor] as webhook
    [MessagesService] as messages
    [StatusMonitor] as monitor
}

package "Interfaces (Ports)" {
    interface IInstanceRepository
    interface IEvolutionClient
    interface IEventPublisher
}

package "Domain" {
    [Instance] as instance_entity
    [InstanceStatus] as status_vo
}

instances --> IInstanceRepository
instances --> IEvolutionClient
instances --> instance_entity

webhook --> IEventPublisher
webhook --> IInstanceRepository

messages --> IEvolutionClient
messages --> IEventPublisher

monitor --> IEvolutionClient
monitor --> IInstanceRepository

@enduml
```

---

### InstancesService - Fluxo de Conexão

```mermaid
sequenceDiagram
    autonumber
    participant Controller
    participant Service as InstancesService
    participant Repo as InstanceRepository
    participant Evo as EvolutionClient
    participant DB as PostgreSQL
    participant Pub as EventPublisher

    Controller->>Service: connect(instance_id, company_id)
    activate Service
    
    Service->>Repo: findById(instance_id, company_id)
    Repo->>DB: SELECT * FROM instances
    DB-->>Repo: Instance data
    Repo-->>Service: Instance entity
    
    Service->>Service: Validate instance exists
    
    Service->>Evo: POST /instance/connect
    Evo-->>Service: { qrcode: "base64..." }
    
    Service->>Repo: updateStatus(id, 'awaiting_scan')
    Repo->>DB: UPDATE instances SET status
    
    Service->>Pub: publish(InstanceConnectingEvent)
    
    Service-->>Controller: QRCodeResponseDTO
    deactivate Service
```

---

### WebhookProcessor - Processamento de Eventos

```mermaid
flowchart TD
    Webhook[Webhook Recebido] --> Parse[Parse Payload]
    Parse --> Identify{Tipo de Evento?}
    
    Identify -->|message.received| MsgHandler[MessageReceivedHandler]
    Identify -->|instance.connected| ConnHandler[InstanceConnectedHandler]
    Identify -->|instance.disconnected| DiscHandler[InstanceDisconnectedHandler]
    Identify -->|qrcode.updated| QRHandler[QRCodeUpdatedHandler]
    Identify -->|message.sent| SentHandler[MessageSentHandler]
    Identify -->|Unknown| LogUnknown[Log & Ignore]
    
    MsgHandler --> ResolveCompany[Resolver company_id<br/>via instance_name]
    ConnHandler --> UpdateStatus[Atualizar Status<br/>no Banco]
    DiscHandler --> UpdateStatus
    QRHandler --> CacheQR[Cache QR Code<br/>no Redis]
    SentHandler --> UpdateMsg[Atualizar Status<br/>Mensagem]
    
    ResolveCompany --> PublishEvent[Publicar Evento<br/>Redis Pub/Sub]
    UpdateStatus --> PublishEvent
    
    PublishEvent --> Done[✓ Processado]
    LogUnknown --> Done
```

---

### MessagesService - Envio com Retry

```mermaid
sequenceDiagram
    participant Agent as Agent Runtime
    participant Redis as Redis Pub/Sub
    participant Service as MessagesService
    participant Evo as EvolutionClient
    participant External as WhatsApp

    Agent->>Redis: publish(message.sent)
    Redis->>Service: subscribe(message.sent)
    
    activate Service
    Service->>Service: Parse messages[]
    
    loop Para cada mensagem
        Service->>Service: Add delay (humanização)
        Service->>Evo: POST /message/send
        
        alt Sucesso
            Evo-->>Service: message_id
            Service->>Service: Log success
        else Erro (rate limit, network)
            Evo-->>Service: Error
            Service->>Service: Retry com backoff
            Service->>Evo: POST /message/send (retry)
        end
    end
    
    Service->>Redis: publish(messages.delivered)
    deactivate Service
```

---

### StatusMonitor - Health Check

```mermaid
sequenceDiagram
    participant Scheduler as Cron Scheduler
    participant Monitor as StatusMonitor
    participant Repo as InstanceRepository
    participant Evo as EvolutionClient
    participant Pub as EventPublisher

    Scheduler->>Monitor: checkAllInstances()
    activate Monitor
    
    Monitor->>Repo: findAllActive()
    Repo-->>Monitor: Instance[]
    
    loop Para cada instância
        Monitor->>Evo: GET /instance/:name/status
        Evo-->>Monitor: { status, qrcode? }
        
        alt Status mudou
            Monitor->>Repo: updateStatus(id, newStatus)
            Monitor->>Pub: publish(InstanceStatusChangedEvent)
        end
        
        alt Desconectada inesperadamente
            Monitor->>Pub: publish(InstanceDisconnectedAlert)
        end
    end
    
    deactivate Monitor
```

---

### Estrutura de Arquivos

```
src/
├── modules/
│   ├── instances/
│   │   ├── services/
│   │   │   ├── instances.service.ts
│   │   │   ├── status-monitor.service.ts
│   │   │   └── webhook-processor.service.ts
│   │   ├── dto/
│   │   │   ├── create-instance.dto.ts
│   │   │   ├── instance-response.dto.ts
│   │   │   ├── qrcode-response.dto.ts
│   │   │   └── webhook-payload.dto.ts
│   │   └── interfaces/
│   │       ├── instances.service.interface.ts
│   │       └── instance.repository.interface.ts
│   │
│   └── messages/
│       ├── services/
│       │   └── messages.service.ts
│       └── dto/
│           ├── send-message.dto.ts
│           └── send-media.dto.ts
```

---

### Exemplo de Contrato

```typescript
// services/interfaces/instances.service.interface.ts

export interface IInstancesService {
  create(dto: CreateInstanceDTO, companyId: string): Promise<InstanceResponseDTO>;
  connect(instanceId: string, companyId: string): Promise<QRCodeResponseDTO>;
  disconnect(instanceId: string, companyId: string): Promise<void>;
  getStatus(instanceId: string, companyId: string): Promise<InstanceStatusDTO>;
  listByCompany(companyId: string): Promise<InstanceListDTO>;
  delete(instanceId: string, companyId: string): Promise<void>;
}

// DTOs
export interface CreateInstanceDTO {
  name: string;
  centurion_id?: string;
  phone_number_hint?: string;
}

export interface QRCodeResponseDTO {
  instance_id: string;
  qrcode: string;  // base64
  expires_at: Date;
}

export interface InstanceStatusDTO {
  instance_id: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  phone_number?: string;
  connected_at?: Date;
  last_activity?: Date;
}
```

---

## Layer 3: Domain

### Responsabilidade da Camada

**O que faz:**

- Define entidades com comportamento
- Encapsula regras de status de instância
- Garante invariantes

**O que NÃO faz:**

- ❌ Conhecer Evolution API
- ❌ Fazer chamadas HTTP
- ❌ Acessar banco diretamente

---

### Diagrama de Entidades

```plantuml
@startuml
package "Domain" {
    class Instance <<Entity>> {
        - id: UUID
        - company_id: UUID
        - name: string
        - status: InstanceStatus
        - phone_number: string
        - centurion_id: UUID
        - connected_at: Date
        - created_at: Date
        --
        + connect(): void
        + disconnect(): void
        + updateStatus(status): void
        + canSendMessage(): boolean
    }
    
    class InstanceStatus <<Value Object>> {
        - value: StatusEnum
        - changed_at: Date
        --
        + isConnected(): boolean
        + canTransitionTo(status): boolean
    }
    
    enum StatusEnum {
        DISCONNECTED
        CONNECTING
        AWAITING_SCAN
        CONNECTED
        ERROR
    }
    
    class WebhookPayload <<Value Object>> {
        - event_type: string
        - instance_name: string
        - data: object
        - timestamp: Date
        --
        + isMessageEvent(): boolean
        + isStatusEvent(): boolean
    }
    
    class Message <<Entity>> {
        - id: UUID
        - instance_id: UUID
        - direction: Direction
        - content: MessageContent
        - status: MessageStatus
        - external_id: string
        - created_at: Date
    }
    
    class MessageContent <<Value Object>> {
        - type: MessageType
        - text: string
        - media_url: string
        - media_mimetype: string
    }
}

Instance --> InstanceStatus
Instance "1" --> "*" Message
Message --> MessageContent
InstanceStatus --> StatusEnum

@enduml
```

---

### Estrutura de Arquivos

```
src/
├── modules/
│   ├── instances/
│   │   └── domain/
│   │       ├── entities/
│   │       │   └── instance.entity.ts
│   │       ├── value-objects/
│   │       │   ├── instance-status.vo.ts
│   │       │   └── webhook-payload.vo.ts
│   │       └── events/
│   │           ├── instance-connected.event.ts
│   │           └── instance-disconnected.event.ts
│   │
│   └── messages/
│       └── domain/
│           ├── entities/
│           │   └── message.entity.ts
│           └── value-objects/
│               └── message-content.vo.ts
```

---

### Instance Entity - Estados

```mermaid
stateDiagram-v2
    [*] --> Disconnected: create()
    Disconnected --> Connecting: connect()
    Connecting --> AwaitingScan: qr_generated
    AwaitingScan --> Connected: qr_scanned
    AwaitingScan --> Disconnected: timeout
    Connected --> Disconnected: disconnect()
    Connected --> Disconnected: connection_lost
    Connected --> Error: error_occurred
    Error --> Disconnected: reset()
    Error --> Connecting: retry()
    
    note right of Connected
        Pode enviar/receber mensagens
    end note
    
    note right of AwaitingScan
        QR code válido por 60s
    end note
```

---

### Instance Entity - Invariantes

```typescript
// domain/entities/instance.entity.ts

/**
 * Entity: Instance
 * Invariantes:
 * - name deve ser único por company_id
 * - Só pode enviar mensagem se status == CONNECTED
 * - Transições de status devem seguir máquina de estados
 */
class Instance {
  private _id: UUID;
  private _companyId: UUID;
  private _name: string;
  private _status: InstanceStatus;
  private _phoneNumber: string | null;
  
  connect(): void {
    if (!this._status.canTransitionTo(StatusEnum.CONNECTING)) {
      throw new InvalidStatusTransitionError(
        this._status.value,
        StatusEnum.CONNECTING
      );
    }
    this._status = new InstanceStatus(StatusEnum.CONNECTING);
  }
  
  updateStatus(newStatus: StatusEnum): void {
    if (!this._status.canTransitionTo(newStatus)) {
      throw new InvalidStatusTransitionError(
        this._status.value,
        newStatus
      );
    }
    this._status = new InstanceStatus(newStatus);
    
    if (newStatus === StatusEnum.CONNECTED) {
      this._addEvent(new InstanceConnectedEvent(this._id));
    }
  }
  
  canSendMessage(): boolean {
    return this._status.isConnected();
  }
}
```

---

## Layer 4: Infrastructure

### Responsabilidade da Camada

**O que faz:**

- Implementa cliente HTTP para Evolution API
- Implementa repositório com Supabase
- Gerencia Pub/Sub com Redis
- Gerencia cache de QR codes

**O que NÃO faz:**

- ❌ Lógica de negócio
- ❌ Decisões de transição de status
- ❌ Orquestração de operações

---

### Diagrama de Componentes

```plantuml
@startuml
package "Infrastructure" {
    [EvolutionClient] as evo
    [InstanceRepository] as repo
    [RedisPublisher] as redis_pub
    [RedisSubscriber] as redis_sub
    [QRCodeCache] as qr_cache
}

package "External" {
    cloud "Evolution API" as evolution
    database "PostgreSQL" as db
    database "Redis" as redis
}

package "Interfaces" {
    interface IEvolutionClient
    interface IInstanceRepository
    interface IEventPublisher
    interface IEventSubscriber
}

evo ..|> IEvolutionClient
repo ..|> IInstanceRepository
redis_pub ..|> IEventPublisher
redis_sub ..|> IEventSubscriber

evo --> evolution
repo --> db
redis_pub --> redis
redis_sub --> redis
qr_cache --> redis

@enduml
```

---

### Estrutura de Arquivos

```
src/
├── infrastructure/
│   ├── evolution/
│   │   ├── evolution.module.ts
│   │   ├── evolution.client.ts
│   │   └── evolution.config.ts
│   │
│   ├── supabase/
│   │   ├── supabase.module.ts
│   │   └── supabase.service.ts
│   │
│   ├── redis/
│   │   ├── redis.module.ts
│   │   ├── redis-publisher.service.ts
│   │   ├── redis-subscriber.service.ts
│   │   └── qrcode-cache.service.ts
│   │
│   └── repositories/
│       ├── instance.repository.ts
│       └── mappers/
│           └── instance.mapper.ts
```

---

### EvolutionClient - Interface com Evolution API

```mermaid
sequenceDiagram
    participant Service
    participant Client as EvolutionClient
    participant Evolution as Evolution API

    Service->>Client: createInstance(name)
    activate Client
    Client->>Client: Build request
    Client->>Evolution: POST /instance/create
    Evolution-->>Client: { instance }
    Client->>Client: Map response
    Client-->>Service: InstanceData
    deactivate Client

    Service->>Client: connect(instanceName)
    activate Client
    Client->>Evolution: POST /instance/connect
    Evolution-->>Client: { qrcode }
    Client-->>Service: QRCodeData
    deactivate Client

    Service->>Client: sendMessage(instance, to, content)
    activate Client
    Client->>Evolution: POST /message/sendText
    Evolution-->>Client: { messageId }
    Client-->>Service: MessageSentData
    deactivate Client
```

---

### EvolutionClient - Endpoints Mapeados

| Operação | Método | Endpoint Evolution | Descrição |
|----------|--------|-------------------|-----------|
| createInstance | POST | `/instance/create` | Cria instância |
| deleteInstance | DELETE | `/instance/delete/:name` | Remove instância |
| connect | POST | `/instance/connect/:name` | Inicia conexão |
| disconnect | DELETE | `/instance/logout/:name` | Desconecta |
| getStatus | GET | `/instance/connectionState/:name` | Status conexão |
| getQRCode | GET | `/instance/connect/:name` | Obtém QR code |
| sendText | POST | `/message/sendText/:name` | Envia texto |
| sendMedia | POST | `/message/sendMedia/:name` | Envia mídia |
| sendAudio | POST | `/message/sendWhatsAppAudio/:name` | Envia áudio |

---

### Redis Publisher - Eventos Publicados

```mermaid
graph TB
    subgraph "Evolution Manager"
        WebhookProc[WebhookProcessor]
        Publisher[RedisPublisher]
    end

    subgraph "Redis Channels"
        CH1[message.received]
        CH2[instance.connected]
        CH3[instance.disconnected]
        CH4[qrcode.updated]
    end

    subgraph "Consumers"
        Agent[Agent Runtime]
        API[Backoffice API]
    end

    WebhookProc --> Publisher
    Publisher -->|publish| CH1
    Publisher -->|publish| CH2
    Publisher -->|publish| CH3
    Publisher -->|publish| CH4

    CH1 --> Agent
    CH2 --> API
    CH3 --> API
    CH4 --> API
```

---

### Redis Subscriber - Mensagens para Envio

```mermaid
sequenceDiagram
    participant Agent as Agent Runtime
    participant Redis as Redis
    participant Subscriber as RedisSubscriber
    participant MsgService as MessagesService
    participant Evo as EvolutionClient

    Agent->>Redis: publish(message.sent, payload)
    Redis->>Subscriber: message on channel
    
    activate Subscriber
    Subscriber->>Subscriber: Parse payload
    Subscriber->>MsgService: sendMessages(payload)
    
    activate MsgService
    loop Para cada mensagem
        MsgService->>MsgService: Wait delay_ms
        MsgService->>Evo: sendText/sendMedia
        Evo-->>MsgService: OK
    end
    MsgService-->>Subscriber: Done
    deactivate MsgService
    
    Subscriber->>Redis: publish(messages.delivered)
    deactivate Subscriber
```

---

## Webhooks da Evolution API

### Tipos de Webhook Suportados

| Evento | Descrição | Payload Principal |
|--------|-----------|-------------------|
| `messages.upsert` | Mensagem recebida | `message, key, pushName` |
| `messages.update` | Status de mensagem | `messageId, status` |
| `connection.update` | Status de conexão | `state, qrcode` |
| `qrcode.updated` | QR code atualizado | `qrcode, instance` |
| `presence.update` | Presença do contato | `id, presence` |

---

### Payload de Mensagem Recebida

```typescript
// dto/webhook-payload.dto.ts

interface MessagesUpsertWebhook {
  event: 'messages.upsert';
  instance: string;
  data: {
    key: {
      remoteJid: string;  // telefone@s.whatsapp.net
      fromMe: boolean;
      id: string;
    };
    pushName: string;  // Nome do contato
    message: {
      conversation?: string;  // Texto
      imageMessage?: {
        url: string;
        mimetype: string;
        caption?: string;
      };
      audioMessage?: {
        url: string;
        mimetype: string;
        seconds: number;
      };
      documentMessage?: {
        url: string;
        mimetype: string;
        fileName: string;
      };
    };
    messageTimestamp: number;
  };
}
```

---

### Transformação Webhook → Evento Interno

```mermaid
flowchart TD
    Webhook[Webhook Evolution] --> Parse[Parse Payload]
    Parse --> Extract[Extrair Dados]
    
    Extract --> ResolveInstance[Resolver Instance<br/>por instance_name]
    ResolveInstance --> ResolveCompany[Obter company_id<br/>da Instance]
    
    ResolveCompany --> BuildEvent[Construir Evento Interno]
    
    BuildEvent --> EventType{Tipo de Mensagem?}
    
    EventType -->|text| TextEvent["
        {
          type: 'text',
          content: message.conversation,
          ...
        }
    "]
    
    EventType -->|audio| AudioEvent["
        {
          type: 'audio',
          media_url: audioMessage.url,
          duration: seconds,
          ...
        }
    "]
    
    EventType -->|image| ImageEvent["
        {
          type: 'image',
          media_url: imageMessage.url,
          caption: caption,
          ...
        }
    "]
    
    TextEvent --> Publish[Publish Redis]
    AudioEvent --> Publish
    ImageEvent --> Publish
    
    Publish --> Done[✓]
```

---

## Integração com Outros Serviços

### Eventos Publicados

| Evento | Channel Redis | Payload | Consumidores |
|--------|---------------|---------|--------------|
| `message.received` | `wa:message:received` | `InboundMessagePayload` | Agent Runtime |
| `instance.connected` | `wa:instance:connected` | `InstanceStatusPayload` | Backoffice API |
| `instance.disconnected` | `wa:instance:disconnected` | `InstanceStatusPayload` | Backoffice API |
| `qrcode.updated` | `wa:qrcode:updated` | `QRCodePayload` | Backoffice API |
| `messages.delivered` | `wa:messages:delivered` | `DeliveryConfirmPayload` | Agent Runtime |

### Eventos Consumidos

| Evento | Channel Redis | Producer | Ação |
|--------|---------------|----------|------|
| `message.sent` | `wa:message:sent` | Agent Runtime | Enviar mensagens |

---

### Diagrama de Integração Completa

```mermaid
graph TB
    subgraph "External"
        WA[WhatsApp]
        Evolution[Evolution API]
    end

    subgraph "Evolution Manager"
        WebhookCtrl[Webhook Controller]
        WebhookProc[Webhook Processor]
        InstanceSvc[Instances Service]
        MsgSvc[Messages Service]
        EvoClient[Evolution Client]
        RedisPub[Redis Publisher]
        RedisSub[Redis Subscriber]
    end

    subgraph "Redis"
        CH_IN[message.received]
        CH_OUT[message.sent]
        CH_STATUS[instance.*]
    end

    subgraph "Other Services"
        Agent[Agent Runtime]
        API[Backoffice API]
    end

    WA <--> Evolution
    Evolution -->|Webhooks| WebhookCtrl
    WebhookCtrl --> WebhookProc
    WebhookProc --> RedisPub
    RedisPub --> CH_IN
    RedisPub --> CH_STATUS

    CH_IN --> Agent
    CH_STATUS --> API

    Agent --> CH_OUT
    CH_OUT --> RedisSub
    RedisSub --> MsgSvc
    MsgSvc --> EvoClient
    EvoClient --> Evolution

    API --> InstanceSvc
    InstanceSvc --> EvoClient

    style Evolution fill:#feca57,stroke:#2c3e50,stroke-width:3px
    style WebhookProc fill:#ff6b6b
```

---

## Padrões Técnicos Específicos

### Retry Strategy

```mermaid
flowchart TD
    Send[Enviar Mensagem] --> Result{Sucesso?}
    Result -->|Sim| Done[✓ Enviado]
    Result -->|Não| CheckError{Tipo de Erro?}
    
    CheckError -->|Rate Limit| Wait1[Aguardar 1s]
    CheckError -->|Network| Wait2[Aguardar 500ms]
    CheckError -->|Instance Offline| Fail[❌ Falha]
    CheckError -->|Invalid Number| Fail
    
    Wait1 --> Retry{Tentativas < 3?}
    Wait2 --> Retry
    
    Retry -->|Sim| Send
    Retry -->|Não| DLQ[Dead Letter Queue]
    
    DLQ --> Alert[Alertar Admin]
```

---

### Rate Limiting

```typescript
// Configuração de rate limit por instância
const RATE_LIMITS = {
  messagesPerMinute: 30,
  messagesPerHour: 1000,
  mediaPerMinute: 10,
};

// Implementação com sliding window
interface RateLimitConfig {
  instance_id: string;
  window_size_ms: number;
  max_requests: number;
}
```

---

### Health Check

```typescript
// health/evolution.health.ts

@Injectable()
export class EvolutionHealthIndicator extends HealthIndicator {
  async isHealthy(): Promise<HealthIndicatorResult> {
    // 1. Verificar conectividade com Evolution API
    // 2. Verificar instâncias ativas
    // 3. Verificar Redis connection
    
    return this.getStatus('evolution', isHealthy, {
      api_status: 'connected',
      active_instances: count,
      redis_status: 'connected',
    });
  }
}
```

---

### Métricas

```typescript
// Métricas expostas via Prometheus

// Counters
webhooks_received_total{event_type, instance}
messages_sent_total{instance, status}
messages_received_total{instance, message_type}

// Histograms
webhook_processing_duration_seconds{event_type}
message_send_duration_seconds{instance}

// Gauges
instances_connected{company_id}
instances_total{company_id, status}
pending_messages{instance}
```

---

## Implementação - Checklist

### Fase 1: Domain ✅

- [ ] Definir Instance entity
- [ ] Criar InstanceStatus value object
- [ ] Definir Message entity
- [ ] Implementar máquina de estados
- [ ] Testes unitários

### Fase 2: Infrastructure ✅

- [ ] Implementar EvolutionClient
- [ ] Implementar InstanceRepository
- [ ] Configurar Redis Pub/Sub
- [ ] Implementar QRCode cache
- [ ] Testes de integração

### Fase 3: Services ✅

- [ ] Implementar InstancesService
- [ ] Implementar WebhookProcessor
- [ ] Implementar MessagesService
- [ ] Implementar StatusMonitor
- [ ] Testes de integração

### Fase 4: Controllers ✅

- [ ] Implementar InstancesController
- [ ] Implementar WebhooksController
- [ ] Implementar MessagesController
- [ ] Configurar guards e validação
- [ ] Testes E2E

### Fase 5: Monitoring ✅

- [ ] Health checks
- [ ] Métricas Prometheus
- [ ] Alertas de desconexão
- [ ] Logs estruturados

---

## Referências

### Documentos Relacionados

| Documento | Seção | Link |
|-----------|-------|------|
| Arquitetura Macro | SVC-004 | ARCH-MACRO-v2.0 |
| Agent Runtime | Integração | arch-micro-agent-runtime.md |

### APIs Externas

- **Evolution API**: https://doc.evolution-api.com/
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp

---

**FIM DO DOCUMENTO**

---

*Arquitetura Micro: Evolution Manager v1.0*  
*Gerenciamento de Instâncias WhatsApp*  
*Gerado em: 2025-12-16*
