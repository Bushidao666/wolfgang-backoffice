---
title: POST /instance/create
method: POST
path: /instance/create
folder: Instance
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Instance

# POST /instance/create

**Method:** `POST`  
**Path:** `/instance/create`  
**Folder:** `Instance`  
**Collection:** `Evolution API | v2.3.*`

---

## Description

_No description provided in the Postman collection._

## Authentication

This endpoint does not appear to require authentication based on the Postman collection.

## Variables used

- `{{globalApikey}}`
- `{{instance}}`
- `{{apikey}}`
- `{{number}}`
- `{{baseUrl}}`

## Request body

Content type: `raw`

```json
{
    // instance
    "instanceName": "{{instance}}",
    // "token": "{{apikey}}", // (Optional)
    // "number": "{{number}}", // (Optional)
    "qrcode": true, // (Optional)
    "integration": "WHATSAPP-BAILEYS" // WHATSAPP-BAILEYS | WHATSAPP-BUSINESS | EVOLUTION (Default WHATSAPP-BAILEYS) 
    // settings (Optional)
    // "rejectCall": false,
    // "msgCall": "",
    // "groupsIgnore": false,
    // "alwaysOnline": false,
    // "readMessages": false,
    // "readStatus": false,
    // "syncFullHistory": false,
    // // proxy (Optional)
    // "proxyHost": "",
    // "proxyPort": "",
    // "proxyProtocol": "",
    // "proxyUsername": "",
    // "proxyPassword": "",
    // webhook (Optional)
    // "webhook": {
    //     "url": "",
    //     "byEvents": false,
    //     "base64": true,
    //     "headers": {
    //         "autorization": "Bearer TOKEN",
    //         "Content-Type": "application/json"
    //     },
    //     "events": [
    //         "APPLICATION_STARTUP",
    //         "QRCODE_UPDATED",
    //         "MESSAGES_SET",
    //         "MESSAGES_UPSERT",
    //         "MESSAGES_UPDATE",
    //         "MESSAGES_DELETE",
    //         "SEND_MESSAGE",
    //         "CONTACTS_SET",
    //         "CONTACTS_UPSERT",
    //         "CONTACTS_UPDATE",
    //         "PRESENCE_UPDATE",
    //         "CHATS_SET",
    //         "CHATS_UPSERT",
    //         "CHATS_UPDATE",
    //         "CHATS_DELETE",
    //         "GROUPS_UPSERT",
    //         "GROUP_UPDATE",
    //         "GROUP_PARTICIPANTS_UPDATE",
    //         "CONNECTION_UPDATE",
    //         "LABELS_EDIT",
    //         "LABELS_ASSOCIATION",
    //         "CALL",
    //         "TYPEBOT_START",
    //         "TYPEBOT_CHANGE_STATUS"
    //     ]
    // },
    // // rabbitmq (Optional)
    // "rabbitmq": {
    //     "enabled": true,
    //     "events": [
    //         "APPLICATION_STARTUP",
    //         "QRCODE_UPDATED",
    //         "MESSAGES_SET",
    //         "MESSAGES_UPSERT",
    //         "MESSAGES_UPDATE",
    //         "MESSAGES_DELETE",
    //         "SEND_MESSAGE",
    //         "CONTACTS_SET",
    //         "CONTACTS_UPSERT",
    //         "CONTACTS_UPDATE",
    //         "PRESENCE_UPDATE",
    //         "CHATS_SET",
    //         "CHATS_UPSERT",
    //         "CHATS_UPDATE",
    //         "CHATS_DELETE",
    //         "GROUPS_UPSERT",
    //         "GROUP_UPDATE",
    //         "GROUP_PARTICIPANTS_UPDATE",
    //         "CONNECTION_UPDATE",
    //         "LABELS_EDIT",
    //         "LABELS_ASSOCIATION",
    //         "CALL",
    //         "TYPEBOT_START",
    //         "TYPEBOT_CHANGE_STATUS"
    //     ]
    // },
    // // sqs (Optional)
    // "sqs": {
    //     "enabled": true,
    //     "events": [
    //         "APPLICATION_STARTUP",
    //         "QRCODE_UPDATED",
    //         "MESSAGES_SET",
    //         "MESSAGES_UPSERT",
    //         "MESSAGES_UPDATE",
    //         "MESSAGES_DELETE",
    //         "SEND_MESSAGE",
    //         "CONTACTS_SET",
    //         "CONTACTS_UPSERT",
    //         "CONTACTS_UPDATE",
    //         "PRESENCE_UPDATE",
    //         "CHATS_SET",
    //         "CHATS_UPSERT",
    //         "CHATS_UPDATE",
    //         "CHATS_DELETE",
    //         "GROUPS_UPSERT",
    //         "GROUP_UPDATE",
    //         "GROUP_PARTICIPANTS_UPDATE",
    //         "CONNECTION_UPDATE",
    //         "LABELS_EDIT",
    //         "LABELS_ASSOCIATION",
    //         "CALL",
    //         "TYPEBOT_START",
    //         "TYPEBOT_CHANGE_STATUS"
    //     ]
    // },
    // // chatwoot (Optional)
    // "chatwootAccountId": "1",
    // "chatwootToken": "TOKEN",
    // "chatwootUrl": "https://chatoot.com",
    // "chatwootSignMsg": true,
    // "chatwootReopenConversation": true,
    // "chatwootConversationPending": false,
    // "chatwootImportContacts": true,
    // "chatwootNameInbox": "evolution",
    // "chatwootMergeBrazilContacts": true,
    // "chatwootImportMessages": true,
    // "chatwootDaysLimitImportMessages": 3,
    // "chatwootOrganization": "Evolution Bot",
    // "chatwootLogo": "https://evolution-api.com/files/evolution-api-favicon.png",
}
```

