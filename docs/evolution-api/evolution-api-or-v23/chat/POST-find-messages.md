---
title: POST /chat/findMessages/{{instance}}
method: POST
path: /chat/findMessages/{{instance}}
folder: Chat
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Chat

# POST /chat/findMessages/{{instance}}

**Method:** `POST`  
**Path:** `/chat/findMessages/{{instance}}`  
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
/*
  Each of these properties are optional.
  With mongodb disabled, only the "key.id" property is available.
  Remove all comments before submitting the request.
*/
{
    "where": {
        "key": {
            "remoteJid": "{{remoteJid}}"
        }
    },
    // optional
    "page": 1,
    "offset": 10
}
```

