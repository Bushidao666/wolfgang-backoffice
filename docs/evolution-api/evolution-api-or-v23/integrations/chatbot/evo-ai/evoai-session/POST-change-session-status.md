---
title: POST /evoai/changeStatus/{{instance}}
method: POST
path: /evoai/changeStatus/{{instance}}
folder: EvoAI Session
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › [Evo AI](./evo-ai/index.md) › EvoAI Session

# POST /evoai/changeStatus/{{instance}}

**Method:** `POST`  
**Path:** `/evoai/changeStatus/{{instance}}`  
**Folder:** `EvoAI Session`  
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
    "remoteJid": "5511912345678@s.whatsapp.net",
    "status": "closed" /* opened, paused, closed */
}
```

