---
title: POST /webhook/set/{{instance}}
method: POST
path: /webhook/set/{{instance}}
folder: Webhook
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Events](./events/index.md) › Webhook

# POST /webhook/set/{{instance}}

**Method:** `POST`  
**Path:** `/webhook/set/{{instance}}`  
**Folder:** `Webhook`  
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
  "webhook": {
    "enabled": true,
    "url": "https://webhook.site",
    "headers": {
      "autorization": "Bearer TOKEN",
      "Content-Type": "application/json"
    },
    "byEvents": false,
    "base64": false,
    "events": [
      "APPLICATION_STARTUP",
      "QRCODE_UPDATED",
      "MESSAGES_SET",
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "MESSAGES_DELETE",
      "SEND_MESSAGE",
      "CONTACTS_SET",
      "CONTACTS_UPSERT",
      "CONTACTS_UPDATE",
      "PRESENCE_UPDATE",
      "CHATS_SET",
      "CHATS_UPSERT",
      "CHATS_UPDATE",
      "CHATS_DELETE",
      "GROUPS_UPSERT",
      "GROUP_UPDATE",
      "GROUP_PARTICIPANTS_UPDATE",
      "CONNECTION_UPDATE",
      "LABELS_EDIT",
      "LABELS_ASSOCIATION",
      "CALL",
      "TYPEBOT_START",
      "TYPEBOT_CHANGE_STATUS"
    ]
  }
}
```

