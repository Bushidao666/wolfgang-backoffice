---
title: POST /message/sendContact/{{instance}}
method: POST
path: /message/sendContact/{{instance}}
folder: Send Message
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Send Message

# POST /message/sendContact/{{instance}}

**Method:** `POST`  
**Path:** `/message/sendContact/{{instance}}`  
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
    "contact": [
        {
            "fullName": "Contact Name",
            "wuid": "559999999999",
            "phoneNumber": "+55 99 9 9999-9999",
            "organization": "Company Name", /* Optional */
            "email": "email", /* Optional */
            "url": "url page" /* Optional */
        },
        {
            "fullName": "Contact Name",
            "wuid": "559911111111",
            "phoneNumber": "+55 99 9 1111-1111",
            "organization": "Company Name", /* Optional */
            "email": "email", /* Optional */
            "url": "url page" /* Optional */
        }
    ]
}
```

