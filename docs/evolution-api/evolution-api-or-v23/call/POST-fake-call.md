---
title: POST /call/offer/{{instance}}
method: POST
path: /call/offer/{{instance}}
folder: Call
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Call

# POST /call/offer/{{instance}}

**Method:** `POST`  
**Path:** `/call/offer/{{instance}}`  
**Folder:** `Call`  
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
  "isVideo": false,
  "callDuration": 3
}
```

