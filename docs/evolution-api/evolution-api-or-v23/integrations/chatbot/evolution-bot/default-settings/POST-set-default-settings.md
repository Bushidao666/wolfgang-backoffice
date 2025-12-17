---
title: POST /evolutionBot/settings/{{instance}}
method: POST
path: /evolutionBot/settings/{{instance}}
folder: Default Settings
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › [Evolution Bot](./evolution-bot/index.md) › Default Settings

# POST /evolutionBot/settings/{{instance}}

**Method:** `POST`  
**Path:** `/evolutionBot/settings/{{instance}}`  
**Folder:** `Default Settings`  
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
  "expire": 20,
  "keywordFinish": "#SAIR",
  "delayMessage": 1000,
  "unknownMessage": "Mensagem não reconhecida",
  "listeningFromMe": false,
  "stopBotFromMe": false,
  "keepOpen": false,
  "debounceTime": 0,
  "ignoreJids": [],
  "botIdFallback": "clyja4oys0a3uqpy7k3bd7swe"
}
```

