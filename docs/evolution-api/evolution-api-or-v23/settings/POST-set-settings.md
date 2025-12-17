---
title: POST /settings/set/{{instance}}
method: POST
path: /settings/set/{{instance}}
folder: Settings
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Settings

# POST /settings/set/{{instance}}

**Method:** `POST`  
**Path:** `/settings/set/{{instance}}`  
**Folder:** `Settings`  
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
  "rejectCall": true,
  "msgCall": "I do not accept calls",
  "groupsIgnore": false,
  "alwaysOnline": true,
  "readMessages": false,
  "syncFullHistory": false,
  "readStatus": false
}
```

