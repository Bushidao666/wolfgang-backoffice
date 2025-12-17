---
title: POST /n8n/changeStatus/{{instance}}
method: POST
path: /n8n/changeStatus/{{instance}}
folder: N8N Session
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › [N8N](./n8n/index.md) › N8N Session

# POST /n8n/changeStatus/{{instance}}

**Method:** `POST`  
**Path:** `/n8n/changeStatus/{{instance}}`  
**Folder:** `N8N Session`  
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

