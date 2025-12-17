---
title: POST /webhook/evolution
method: POST
path: /webhook/evolution
folder: Evolution Channel
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Channel](./channel/index.md) › Evolution Channel

# POST /webhook/evolution

**Method:** `POST`  
**Path:** `/webhook/evolution`  
**Folder:** `Evolution Channel`  
**Collection:** `Evolution API | v2.3.*`

---

## Description

_No description provided in the Postman collection._

## Authentication

This endpoint does not appear to require authentication based on the Postman collection.

## Variables used

- `{{number}}`
- `{{remoteJid}}`
- `{{baseUrl}}`

## Request body

Content type: `raw`

```json
{
    "numberId": "{{number}}", // instance number
    "key": {
        "remoteJid": "{{remoteJid}}",
        "fromMe": false,
        "id": "ABC1234"
    },
    "pushName": "Contact Name",
    "message": {
        "conversation": "oi" // message text
        // for medias
        // "imageMessage": { // imageMessage, videoMessage, documentMessage
        //     "caption": "O que tem nessa foto?"
        // },
        // "mediaUrl": "https://t3.ftcdn.net/jpg/03/26/50/04/360_F_326500445_ZD1zFSz2cMT1qOOjDy7C5xCD4shawQfM.jpg"
    },
    "messageType": "conversation" // conversation. imageMessage, videoMessage, documentMessage, audioMessage
}
```

