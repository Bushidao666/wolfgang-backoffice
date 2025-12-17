---
title: POST /proxy/set/{{instance}}
method: POST
path: /proxy/set/{{instance}}
folder: Proxy
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › Proxy

# POST /proxy/set/{{instance}}

**Method:** `POST`  
**Path:** `/proxy/set/{{instance}}`  
**Folder:** `Proxy`  
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
  "host": "0.0.0.0",
  "port": "8000",
  "protocol": "http",
  "username": "user",
  "password": "pass"
}
```

