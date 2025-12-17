---
title: POST /typebot/create/{{instance}}
method: POST
path: /typebot/create/{{instance}}
folder: Typebot
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › Typebot

# POST /typebot/create/{{instance}}

**Method:** `POST`  
**Path:** `/typebot/create/{{instance}}`  
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
    "enabled": true,
    "url": "https://bot.dgcode.com.br",
    "typebot": "my-typebot-uoz1rg9",
    "triggerType": "keyword", /* all or keyword */
    "triggerOperator": "regex", /* contains, equals, startsWith, endsWith, regex */
    "triggerValue": "^atend.*",
    "expire": 20,
    "keywordFinish": "#SAIR",
    "delayMessage": 1000,
    "unknownMessage": "Mensagem não reconhecida",
    "listeningFromMe": false,
    "stopBotFromMe": false,
    "keepOpen": false,
    "debounceTime": 10
}
```

