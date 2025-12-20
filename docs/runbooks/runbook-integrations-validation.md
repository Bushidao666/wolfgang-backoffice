# Runbook — Validação de Integrações (OpenAI / Evolution / Autentique)

Este runbook descreve como diagnosticar e corrigir incidentes relacionados a **credenciais/configuração de integrações por empresa**.

Integrações cobertas (atual):

- `openai` (LLM, embeddings, STT/vision)
- `evolution` (provider de mensagens/instâncias)
- `autentique` (assinatura de contratos)

## Sintomas comuns

### OpenAI

- `agent-runtime` responde sempre com fallback determinístico (sem LLM).
- Logs no runtime com mensagens relacionadas a “integration not configured”.
- STT/Vision não funcionam.

### Evolution

- Instâncias não conectam (QR não gera) ou envio falha.
- Webhooks chegam, mas outbound não sai.

### Autentique

- Contratos não são criados/assinados, erros em webhooks.

## Pré-requisitos

- `BACKOFFICE_API_URL` do ambiente (staging/prod).
- Token JWT de um usuário `backoffice_admin`/`super_admin`.
- `company_id` alvo (UUID).

---

## 1) Verificar bindings no banco (estado atual)

```sql
select
  company_id,
  provider,
  mode,
  status,
  last_validated_at,
  last_error,
  updated_at
from core.company_integration_bindings
where company_id = '<company_id>'
order by provider;
```

Interpretação rápida:

- `mode='disabled'`: integração desligada (runtime/serviços devem degradar).
- `status='invalid'`: credenciais/config estão quebrados (ver `last_error`).
- `status='testing'`: alguém disparou validação recentemente.

---

## 2) Testar via Backoffice API (método preferido)

O Backoffice API expõe um endpoint de teste por empresa:

`POST /integrations/companies/:companyId/test/:provider`

Providers válidos:

- `openai`
- `evolution`
- `autentique`

### Exemplo (curl)

```bash
curl -sS -X POST \
  "${BACKOFFICE_API_URL}/integrations/companies/${COMPANY_ID}/test/openai" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json"
```

Resposta esperada:

- `{"ok":true}` → integração válida
- `{"ok":false,"message":"..."}` → falhou (usar `message` como pista)

O serviço também persiste o resultado em `core.company_integration_bindings.status/last_error`.

---

## 3) Diagnóstico por provider

### 3.1) OpenAI

**Falhas típicas:**

- `401` / “invalid api key” → `api_key` inválida ou expirou.
- `ENOTFOUND`/timeout → `base_url` incorreto, DNS/egress, ou bloqueio de rede.

**Ações:**

1) Corrigir a credencial no Backoffice (binding):
   - `mode='custom'` → atualizar `secrets_override.api_key`
   - `mode='global'` → apontar para `credential_set_id` correto
2) Rodar novamente o teste (passo 2).
3) Validar no `agent-runtime`:
   - mensagens deixam de cair no fallback determinístico
   - `/ready` ok

### 3.2) Evolution

**Falhas típicas:**

- `api_url` errado (ex.: sem protocolo, host incorreto)
- `api_key` inválida

**Ações:**

1) Rodar o teste (passo 2) para obter erro.
2) Corrigir binding (config/secrets) e retestar.
3) Validar no Evolution Manager:
   - endpoints/instâncias funcionam
   - outbound (`message.sent`) não falha em logs

### 3.3) Autentique

**Falhas típicas:**

- `api_key` inválida
- `base_url` custom incorreto

**Ações:**

1) Rodar o teste (passo 2).
2) Corrigir binding e retestar.
3) Validar fluxo de contrato:
   - criar contrato e verificar webhooks (ver `docs/runbooks/runbook-webhooks.md`)

---

## 4) Falhas “silenciosas” por APP_ENCRYPTION_KEY ausente

Algumas operações (ex.: `mode='custom'` com secrets criptografados) dependem de `APP_ENCRYPTION_KEY`.

Sintomas:

- Backoffice API retorna erro mencionando `APP_ENCRYPTION_KEY`.
- Validação falha sem conseguir resolver secrets.

**Ação:** configurar `APP_ENCRYPTION_KEY` no serviço afetado (Backoffice API) e reiniciar.

---

## 5) Validação final (checklist)

- `core.company_integration_bindings.status = 'active'` e `last_error is null` para o provider alvo.
- `POST /integrations/companies/:companyId/test/:provider` retorna `{ ok: true }`.
- Serviços consumidores funcionam:
  - OpenAI → runtime não cai em fallback; STT/Vision funcionam quando habilitados.
  - Evolution → instâncias conectam e enviam mensagens.
  - Autentique → contratos criam/assinam e webhooks chegam.
