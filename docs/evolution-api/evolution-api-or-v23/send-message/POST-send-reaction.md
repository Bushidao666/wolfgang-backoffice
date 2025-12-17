---
title: POST /message/sendReaction/{{instance}}
method: POST
path: /message/sendReaction/{{instance}}
folder: Send Message
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Send Message

# POST /message/sendReaction/{{instance}}

**Method:** `POST`  
**Path:** `/message/sendReaction/{{instance}}`  
**Folder:** `Send Message`  
**Collection:** `Evolution API | v2.3.*`

---

## Description

_No description provided in the Postman collection._

## Authentication

This endpoint does not appear to require authentication based on the Postman collection.

## Variables used

- `{{remoteJid}}`
- `{{groupJid}}`
- `{{baseUrl}}`
- `{{instance}}`

## Request body

Content type: `raw`

```json
{
    // key of the message or key.id only for get message in database
    "key": {
        "remoteJid": "{{remoteJid}}@s.whatsapp.net", // or {{groupJid}}@g.us"
        "fromMe": true,
        "id": "BAE5A75CB0F39712"
    },
    "reaction": "🚀"
}
```

