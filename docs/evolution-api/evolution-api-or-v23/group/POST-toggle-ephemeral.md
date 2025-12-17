---
title: POST /group/toggleEphemeral/{{instance}}
method: POST
path: /group/toggleEphemeral/{{instance}}
folder: Group
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Group

# POST /group/toggleEphemeral/{{instance}}

**Method:** `POST`  
**Path:** `/group/toggleEphemeral/{{instance}}`  
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
  "expiration": 0 // 0 = Off 
                  // 86400 = 24 Hours 
                  // 604800 = 7 Days 
                  // 7776000 = 90 Days
}
```

