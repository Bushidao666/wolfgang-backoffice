---
title: POST /chat/updateMessage/{{instance}}
method: POST
path: /chat/updateMessage/{{instance}}
folder: Chat
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Chat

# POST /chat/updateMessage/{{instance}}

**Method:** `POST`  
**Path:** `/chat/updateMessage/{{instance}}`  
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
  "key": {
    "remoteJid": "123@s.whatsapp.net",
    "fromMe": true,
    "id": "3EB04DC69D97835D7CC6F12776D25766FBC224E2"
  },
  "text": "new message"
}
```

