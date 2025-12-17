---
title: POST /message/sendWhatsAppAudio/{{instance}}
method: POST
path: /message/sendWhatsAppAudio/{{instance}}
folder: Send Message
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Send Message

# POST /message/sendWhatsAppAudio/{{instance}}

**Method:** `POST`  
**Path:** `/message/sendWhatsAppAudio/{{instance}}`  
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
    "audio": "https://evolution-api.com/files/narratedaudio.mp3" /* url or base64 */
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
    // ],
    // "encoding": true
}
```

