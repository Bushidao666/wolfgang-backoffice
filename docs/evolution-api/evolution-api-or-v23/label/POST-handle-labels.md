---
title: POST /label/handleLabel/{{instance}}
method: POST
path: /label/handleLabel/{{instance}}
folder: Label
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Label

# POST /label/handleLabel/{{instance}}

**Method:** `POST`  
**Path:** `/label/handleLabel/{{instance}}`  
**Folder:** `Label`  
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
    "labelId": "labelId",
    "action": "add" /* add or remove */
}
```

