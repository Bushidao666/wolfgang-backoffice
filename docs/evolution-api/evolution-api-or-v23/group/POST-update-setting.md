---
title: POST /group/updateSetting/{{instance}}
method: POST
path: /group/updateSetting/{{instance}}
folder: Group
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Group

# POST /group/updateSetting/{{instance}}

**Method:** `POST`  
**Path:** `/group/updateSetting/{{instance}}`  
**Folder:** `Group`  
**Collection:** `Evolution API | v2.3.*`

---

## Description

_No description provided in the Postman collection._

## Authentication

This endpoint does not appear to require authentication based on the Postman collection.

## Variables used

- `{{baseUrl}}`
- `{{instance}}`
- `{{groupJid}}`

## Query parameters

| Name | Type | Example | Required | Description |
|------|------|---------|----------|-------------|
| groupJid | string | `{{groupJid}}` | No |  |

## Request body

Content type: `raw`

```json
{
  "action": "not_announcement" // announcement = Only Admins send messages
                               // not_announcement = All Members send messages
                               // locked = Only Admins edit group settings
                               // unlocked = All Members edit group settings
}
```

