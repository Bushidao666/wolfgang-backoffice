---
title: POST /message/sendTemplate/{{instance}}
method: POST
path: /message/sendTemplate/{{instance}}
folder: Send Message
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Channel](./channel/index.md) › [Cloud API Oficial](./cloud-api-oficial/index.md) › Send Message

# POST /message/sendTemplate/{{instance}}

**Method:** `POST`  
**Path:** `/message/sendTemplate/{{instance}}`  
**Folder:** `Send Message`  
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
    "name": "hello_world",
    "language": "en_US",
    // "webhookUrl": "", (optional)
    "components": [
        {
            "type": "body",
            "parameters": [
                {
                    "type": "text",
                    "text": "Name"
                },
                {
                    "type": "text",
                    "text": "email@email.com"
                }
            ]
        },
        {
            "type": "button",
            "sub_type": "URL",
            "index": "1",
            "parameters": [
                {
                    "type": "text",
                    "text": "/reset-password/1234"
                }
            ]
        }
    ]
}
```

