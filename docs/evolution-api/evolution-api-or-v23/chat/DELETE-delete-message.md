---
title: DELETE /chat/deleteMessageForEveryone/{{instance}}
method: DELETE
path: /chat/deleteMessageForEveryone/{{instance}}
folder: Chat
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Chat

# DELETE /chat/deleteMessageForEveryone/{{instance}}

**Method:** `DELETE`  
**Path:** `/chat/deleteMessageForEveryone/{{instance}}`  
**Folder:** `Chat`  
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
  "id": "id",
  "remoteJid": "remoteJid",
  "fromMe": true,
  // optional
  "participant": "paticipant"
}
```

