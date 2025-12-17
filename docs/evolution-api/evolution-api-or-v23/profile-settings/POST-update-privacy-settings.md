---
title: POST /chat/updatePrivacySettings/{{instance}}
method: POST
path: /chat/updatePrivacySettings/{{instance}}
folder: Profile Settings
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Profile Settings

# POST /chat/updatePrivacySettings/{{instance}}

**Method:** `POST`  
**Path:** `/chat/updatePrivacySettings/{{instance}}`  
**Folder:** `Profile Settings`  
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
    "readreceipts": "all", /*'all', 'none'*/
    "profile": "all", /*'all', 'contacts', 'contact_blacklist', 'none'*/
    "status": "contacts", /*'all', 'contacts', 'contact_blacklist', 'none'*/
    "online": "all", /*'all', 'match_last_seen'*/
    "last": "contacts", /*'all', 'contacts', 'contact_blacklist', 'none'*/
    "groupadd": "none" /*'all', 'contacts', 'contact_blacklist'*/
}
```

