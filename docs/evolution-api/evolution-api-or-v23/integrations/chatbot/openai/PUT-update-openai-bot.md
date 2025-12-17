---
title: PUT /openai/update/:openaiBotId/{{instance}}
method: PUT
path: /openai/update/:openaiBotId/{{instance}}
folder: Openai
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Chatbot](./chatbot/index.md) › Openai

# PUT /openai/update/:openaiBotId/{{instance}}

**Method:** `PUT`  
**Path:** `/openai/update/:openaiBotId/{{instance}}`  
**Folder:** `Openai`  
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
	"openaiCredsId": "clyrx36wj0001119ucjjzxik1",
	"botType": "assistant", /* assistant or chatCompletion */
	// for assistants
	"assistantId": "asst_LRNyh6qC4qq8NTyPjHbcJjSp",
    "functionUrl": "https://webhook.com",
	// for chat completion
	"model": "gpt-4o",
	"systemMessages": [
		"You are a helpful assistant."
	],
	"assistantMessages": [
		"\n\nHello there, how may I assist you today?"
	],
	"userMessages": [
		"Hello!"
	],
	"maxTokens": 300,
	// options
	"triggerType": "keyword", /* all or keyword */
	"triggerOperator": "equals", /* contains, equals, startsWith, endsWith, regex, none */
	"triggerValue": "teste",
	"expire": 20,
	"keywordFinish": "#SAIR",
	"delayMessage": 1000,
	"unknownMessage": "Mensagem não reconhecida",
	"listeningFromMe": false,
	"stopBotFromMe": false,
	"keepOpen": false,
	"debounceTime": 10,
	"ignoreJids": []
}
```

