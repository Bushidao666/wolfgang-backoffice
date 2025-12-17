---
title: POST /chat/archiveChat/{{instance}}
method: POST
path: /chat/archiveChat/{{instance}}
folder: Chat
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Chat

# POST /chat/archiveChat/{{instance}}

**Method:** `POST`  
**Path:** `/chat/archiveChat/{{instance}}`  
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
    "lastMessage": {
        "key": {
            "remoteJid": "123@s.whatsapp.net",
            "fromMe": false,
            "id": "80C4CE9B72F797DBC6ECD8D19B247FC9"
        }
    },
    "chat": "123@s.whatsapp.net",
    // false: to unarchive
    // true: to archive
    "archive": false
}
```

