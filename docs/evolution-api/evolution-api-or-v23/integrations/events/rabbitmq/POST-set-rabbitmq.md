---
title: POST /rabbitmq/set/{{instance}}
method: POST
path: /rabbitmq/set/{{instance}}
folder: Rabbitmq
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Events](./events/index.md) › Rabbitmq

# POST /rabbitmq/set/{{instance}}

**Method:** `POST`  
**Path:** `/rabbitmq/set/{{instance}}`  
**Folder:** `Rabbitmq`  
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
  "rabbitmq": {
    "enabled": true,
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

