---
title: PUT /typebot/update/:typebotId/{{instance}}
method: PUT
path: /typebot/update/:typebotId/{{instance}}
folder: Typebot
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › Typebot

# PUT /typebot/update/:typebotId/{{instance}}

**Method:** `PUT`  
**Path:** `/typebot/update/:typebotId/{{instance}}`  
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
    "typebot":  "my-typebot-uoz1rg9",
    "expire": 20,
    "keywordFinish": "#SAIR",
    "delayMessage": 1000,
    "unknownMessage": "Mensagem não reconhecida",
    "listeningFromMe": false,
    "stopBotFromMe": false,
    "keepOpen": false,
    "debounceTime": 10,
    "triggerType": "keyword", /* all or keyword */
    "triggerOperator": "contains", /* contains, equals, startsWith, endsWith */
    "triggerValue": "evolution"
}
```

