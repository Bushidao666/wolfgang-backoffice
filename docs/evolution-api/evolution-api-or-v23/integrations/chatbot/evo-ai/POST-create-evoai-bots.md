---
title: POST /evoai/create/{{instance}}
method: POST
path: /evoai/create/{{instance}}
folder: Evo AI
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › Evo AI

# POST /evoai/create/{{instance}}

**Method:** `POST`  
**Path:** `/evoai/create/{{instance}}`  
**Folder:** `Evo AI`  
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
    "enabled": true,
    "apiUrl": "http://flowise.site.com/v1",
    "apiKey": "app-123456", // optional
    // options
    "triggerType": "keyword", /* all or keyword */
    "triggerOperator": "equals", /* contains, equals, startsWith, endsWith, regex, none */
    "triggerValue": "teste",
    "expire": 0,
    "keywordFinish": "#SAIR",
    "delayMessage": 1000,
    "unknownMessage": "Mensagem não reconhecida",
    "listeningFromMe": false,
    "stopBotFromMe": false,
    "keepOpen": false,
    "debounceTime": 0,
    "ignoreJids": []
}
```

