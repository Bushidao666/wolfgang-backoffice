---
title: POST /group/updateGroupPicture/{{instance}}
method: POST
path: /group/updateGroupPicture/{{instance}}
folder: Group
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Group

# POST /group/updateGroupPicture/{{instance}}

**Method:** `POST`  
**Path:** `/group/updateGroupPicture/{{instance}}`  
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
  "image": "https://evolution-api.com/files/sticker.png"
}
```

