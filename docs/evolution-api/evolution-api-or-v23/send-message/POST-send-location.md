---
title: POST /message/sendLocation/{{instance}}
method: POST
path: /message/sendLocation/{{instance}}
folder: Send Message
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Send Message

# POST /message/sendLocation/{{instance}}

**Method:** `POST`  
**Path:** `/message/sendLocation/{{instance}}`  
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
    "name": "Bora Bora",
    "address": "French Polynesian",
    "latitude": -16.505538233564373,
    "longitude": -151.7422770494996
    // options
    // "delay": 1200,
    // "quoted": {
    //     // payload message or key.id only for get message in database
    //     "key": {
    //         "id": " MESSAGE_ID"
    //     },
    //     "message": {
    //         "conversation": "CONTENT_MESSAGE"
    //     }
    // },
    // "mentionsEveryOne": false,
    // "mentioned": [
    //     "{{remoteJid}}"
    // ]
}
```

