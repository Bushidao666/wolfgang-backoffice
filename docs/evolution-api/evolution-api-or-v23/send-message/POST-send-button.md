---
title: POST /message/sendButtons/{{instance}}
method: POST
path: /message/sendButtons/{{instance}}
folder: Send Message
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Send Message

# POST /message/sendButtons/{{instance}}

**Method:** `POST`  
**Path:** `/message/sendButtons/{{instance}}`  
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
    "title": "Title Button",
    "description": "Description Button",
    "footer": "Footer Button",
    "buttons": [
        {
            "type": "reply",
            "displayText": "Resposta",
            "id": "123"
        }
        // {
        //     "type": "copy",
        //     "displayText": "Copia Código",
        //     "copyCode": "ZXN0ZSDDqSB1bSBjw7NkaWdvIGRlIHRleHRvIGNvcGnDoXZlbC4="
        // },
        // {
        //     "type": "url",
        //     "displayText": "Evolution API",
        //     "url": "http://evolution-api.com"
        // },
        // {
        //     "type": "call",
        //     "displayText": "Me ligue",
        //     "phoneNumber": "557499879409"
        // }
        // {
        //     "type": "pix",
        //     "currency": "BRL",
        //     "name": "Davidson Gomes",
        //     "keyType": "random", /* phone, email, cpf, cnpj, random  */
        //     "key": "0ea59ac5-f001-4f0e-9785-c772200f1b1e"
        // }
    ]
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

