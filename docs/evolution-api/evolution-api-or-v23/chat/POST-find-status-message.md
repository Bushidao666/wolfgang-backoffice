---
title: POST /chat/findStatusMessage/{{instance}}
method: POST
path: /chat/findStatusMessage/{{instance}}
folder: Chat
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Chat

# POST /chat/findStatusMessage/{{instance}}

**Method:** `POST`  
**Path:** `/chat/findStatusMessage/{{instance}}`  
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
/*
  Each of these properties are optional.
  With mongodb disabled, only the "id" property is available.
  Remove all comments before submitting the request.
*/
{
  "where": {
    "remoteJid": "123@s.whatsapp.net",
    "id": "BAE5959535174C7E"
  },
  // optional
  "page": 1,
  "offset": 10
}
```

