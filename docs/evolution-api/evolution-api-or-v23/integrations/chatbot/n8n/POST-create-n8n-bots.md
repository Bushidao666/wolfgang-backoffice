---
title: POST /n8n/create/{{instance}}
method: POST
path: /n8n/create/{{instance}}
folder: N8N
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › N8N

# POST /n8n/create/{{instance}}

**Method:** `POST`  
**Path:** `/n8n/create/{{instance}}`  
**Folder:** `N8N`  
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

