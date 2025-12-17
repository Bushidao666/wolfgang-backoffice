---
title: POST /message/sendStatus/{{instance}}
method: POST
path: /message/sendStatus/{{instance}}
folder: Send Message
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Send Message

# POST /message/sendStatus/{{instance}}

**Method:** `POST`  
**Path:** `/message/sendStatus/{{instance}}`  
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
    "type": "text", /* text, image, video, audio */
    "content": "Hi, how are you today?", /* text or url */
    "caption": "This is my status/storie image", /* Optional for image or video */
    "backgroundColor": "#008000",
    "font": 1, /* Optional for text only. Accept the options below:
                      1 = SERIF
                      2 = NORICAN_REGULAR
                      3 = BRYNDAN_WRITE
                      4 = BEBASNEUE_REGULAR
                      5 = OSWALD_HEAVY */
    "allContacts": false, /* true to send to all contacts or false to send to statusJidList below */
    "statusJidList": [
        "{{remoteJid}}@s.whatsapp.net"
    ]
}
```

