---
title: POST /chat/getBase64FromMediaMessage/{{instance}}
method: POST
path: /chat/getBase64FromMediaMessage/{{instance}}
folder: Chat
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Chat

# POST /chat/getBase64FromMediaMessage/{{instance}}

**Method:** `POST`  
**Path:** `/chat/getBase64FromMediaMessage/{{instance}}`  
**Folder:** `Chat`  
**Collection:** `Evolution API | v2.3.*`

---

## Description

_No description provided in the Postman collection._

## Authentication

This endpoint does not appear to require authentication based on the Postman collection.

## Variables used

- `{{baseUrl}}`
- `{{instance}}`

## Request body

Content type: `raw`

```json
/*
  In this endpoint it is possible to extract the Base64 of the media 
  received in the messages, passing the message ID as a parameter.
  Make sure that the received message is stored in MongoDB or in a file,
  otherwise the error 400 - Bad Request will be displayed.
  If the media type is audio, the mimetype audio/ogg is returned by default. 
  If you need an MP4 file, check the "convertToMp4" option as "true"
*/
{
    // payload message or key.id only for get message in database
    "message": {
        "key": {
            "id": "3EB0F4A1F841F02958FB74"
        }
    },
    "convertToMp4": false
}
```

