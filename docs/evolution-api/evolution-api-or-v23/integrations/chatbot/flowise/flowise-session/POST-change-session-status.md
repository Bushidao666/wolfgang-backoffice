---
title: POST /flowise/changeStatus/{{instance}}
method: POST
path: /flowise/changeStatus/{{instance}}
folder: Flowise Session
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › [Flowise](./flowise/index.md) › Flowise Session

# POST /flowise/changeStatus/{{instance}}

**Method:** `POST`  
**Path:** `/flowise/changeStatus/{{instance}}`  
**Folder:** `Flowise Session`  
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

