---
title: POST /group/updateParticipant/{{instance}}
method: POST
path: /group/updateParticipant/{{instance}}
folder: Group
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Group

# POST /group/updateParticipant/{{instance}}

**Method:** `POST`  
**Path:** `/group/updateParticipant/{{instance}}`  
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
  "action": "add", // add = Add new member on group
                   // remove = Remove existing member on group
                   // promote = Promote to group admin
                   // demote = Demote to group user
  "participants": [
    "5531900000000",
    "5531911111111",
    "5531922222222"
  ]
}
```

