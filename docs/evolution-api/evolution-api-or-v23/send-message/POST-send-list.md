---
title: POST /message/sendList/{{instance}}
method: POST
path: /message/sendList/{{instance}}
folder: Send Message
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Send Message

# POST /message/sendList/{{instance}}

**Method:** `POST`  
**Path:** `/message/sendList/{{instance}}`  
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
    "title": "List Title",
    "description": "List description",
    "buttonText": "Click Here",
    "footerText": "footer list\nhttps://examplelink.com.br",
    "sections": [
        {
            "title": "Row tilte 01",
            "rows": [
                {
                    "title": "Title row 01",
                    "description": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
                    "rowId": "rowId 001"
                },
                {
                    "title": "Title row 02",
                    "description": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
                    "rowId": "rowId 002"
                }
            ]
        },
        {
            "title": "Row tilte 02",
            "rows": [
                {
                    "title": "Title row 01",
                    "description": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
                    "rowId": "rowId 001"
                },
                {
                    "title": "Title row 02",
                    "description": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
                    "rowId": "rowId 002"
                }
            ]
        }
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

