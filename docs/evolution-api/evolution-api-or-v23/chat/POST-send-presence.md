---
title: POST /chat/sendPresence/{{instance}}
method: POST
path: /chat/sendPresence/{{instance}}
folder: Chat
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Chat

# POST /chat/sendPresence/{{instance}}

**Method:** `POST`  
**Path:** `/chat/sendPresence/{{instance}}`  
**Folder:** `Chat`  
**Collection:** `Evolution API | v2.3.*`

---

## Description

_No description provided in the Postman collection._

## Authentication

This endpoint does not appear to require authentication based on the Postman collection.

## Variables used

- `{{remoteJid}}`
- `{{baseUrl}}`
- `{{instance}}`

## Request body

Content type: `raw`

```json
{
  "number": "{{remoteJid}}",
  "delay": 1200,
  "presence": "composing"
}
```

