---
title: POST /message/sendMedia/{{instance}}
method: POST
path: /message/sendMedia/{{instance}}
folder: Send Message
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Send Message

# POST /message/sendMedia/{{instance}}

**Method:** `POST`  
**Path:** `/message/sendMedia/{{instance}}`  
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
    "mediatype": "image", // image, video or document
    "mimetype": "image/png",
    "caption": "Teste de caption",
    "media": "https://s3.amazonaws.com/atendai/company-3708fcdf-954b-48f8-91ff-25babaccac67/1712605171932.jpeg", /* url or base64 */
    "fileName": "Imagem.png"
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

