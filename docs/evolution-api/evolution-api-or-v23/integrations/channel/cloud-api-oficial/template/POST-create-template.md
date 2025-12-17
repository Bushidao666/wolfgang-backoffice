---
title: POST /template/create/{{instance}}
method: POST
path: /template/create/{{instance}}
folder: Template
collection: Evolution API | v2.3.*
---

[Evolution API | v2.3.*](./index.md) › [Integrations](./integrations/index.md) › [Channel](./channel/index.md) › [Cloud API Oficial](./cloud-api-oficial/index.md) › Template

# POST /template/create/{{instance}}

**Method:** `POST`  
**Path:** `/template/create/{{instance}}`  
**Folder:** `Template`  
**Collection:** `Evolution API | v2.3.*`

---

## Description

_No description provided in the Postman collection._

## Authentication

This endpoint does not appear to require authentication based on the Postman collection.

## Variables used

- `{{1}}`
- `{{2}}`
- `{{baseUrl}}`
- `{{instance}}`

## Request body

Content type: `raw`

```json
{
    "name": "teste_evolution",
    "category": "MARKETING", /* AUTHENTICATION, MARKETING, UTILITY */
    "allowCategoryChange": false,
    "language": "en_US",
    // "webhookUrl": "", (optional)
    "components": [
        {
            "type": "BODY",
            "text": "Thank you for your order, {{1}}! Your confirmation number is {{2}}. If you have any questions, please use the buttons below to contact support. Thank you for being a customer!",
            "example": {
                "body_text": [
                    [
                        "Pablo",
                        "860198-230332"
                    ]
                ]
            }
        },
        {
            "type": "BUTTONS",
            "buttons": [
                {
                    "type": "QUICK_REPLY",
                    "text": "Unsubscribe from Promos"
                },
                {
                    "type": "URL",
                    "text": "Contact Support",
                    "url": "https://atendai.com"
                }
            ]
        }
    ]
}
```

