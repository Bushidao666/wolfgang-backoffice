---
title: POST /typebot/start/{{instance}}
method: POST
path: /typebot/start/{{instance}}
folder: Typebot
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › Typebot

# POST /typebot/start/{{instance}}

**Method:** `POST`  
**Path:** `/typebot/start/{{instance}}`  
**Folder:** `Typebot`  
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
{
  "url": "https://bot.dgcode.com.br",
  "typebot": "fluxo-unico-3uuso28",
  "remoteJid": "557499879409@s.whatsapp.net",
  "startSession": false,
  "variables": [
    {
      "name": "pushName",
      "value": "Davidson Gomes"
    }
  ]
}
```

