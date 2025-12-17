---
title: POST /message/updateBlockStatus/{{instance}}
method: POST
path: /message/updateBlockStatus/{{instance}}
folder: Chat
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Chat

# POST /message/updateBlockStatus/{{instance}}

**Method:** `POST`  
**Path:** `/message/updateBlockStatus/{{instance}}`  
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
    "status": "block" /* block, unblock */
}
```

