---
title: POST /chatwoot/set/{{instance}}
method: POST
path: /chatwoot/set/{{instance}}
folder: Chatwoot
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › Chatwoot

# POST /chatwoot/set/{{instance}}

**Method:** `POST`  
**Path:** `/chatwoot/set/{{instance}}`  
**Folder:** `Chatwoot`  
**Collection:** `Evolution API | v2.3.*`

---

## Description

_No description provided in the Postman collection._

## Authentication

This endpoint does not appear to require authentication based on the Postman collection.

## Variables used

- `{{baseUrl}}`
- `{{instance}}`

## Request body

Content type: `raw`

```json
{
  "enabled": true,
  "accountId": "1",
  "token": "TOKEN",
  "url": "https://chatwoot.com",
  "signMsg": true,
  "reopenConversation": true,
  "conversationPending": false,
  "nameInbox": "evolution",
  "mergeBrazilContacts": true,
  "importContacts": true,
  "importMessages": true,
  "daysLimitImportMessages": 2,
  "signDelimiter": "\n",
  "autoCreate": true,
  "organization": "BOT",
  "logo": "link da sua",
  "ignoreJids": [
    "@g.us"
  ]
}
```

