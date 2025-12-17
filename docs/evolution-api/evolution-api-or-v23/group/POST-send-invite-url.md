---
title: POST /group/sendInvite/{{instance}}
method: POST
path: /group/sendInvite/{{instance}}
folder: Group
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Group

# POST /group/sendInvite/{{instance}}

**Method:** `POST`  
**Path:** `/group/sendInvite/{{instance}}`  
**Folder:** `Group`  
**Collection:** `Evolution API | v2.3.*`

---

## Description

_No description provided in the Postman collection._

## Authentication

This endpoint does not appear to require authentication based on the Postman collection.

## Variables used

- `{{groupJid}}`
- `{{remoteJid}}`
- `{{baseUrl}}`
- `{{instance}}`

## Request body

Content type: `raw`

```json
{
  "groupJid": "{{groupJid}}",
  "description": "Access this link to join my WhatsApp group:",
  "numbers": [
    "{{remoteJid}}"
  ]
}
```

