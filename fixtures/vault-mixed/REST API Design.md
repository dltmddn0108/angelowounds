---
aliases: [REST API, RESTful API, API design]
tags: [backend, api, architecture]
---

# REST API Design

REST (Representational State Transfer) is the dominant architectural style for web APIs. Good API design makes the difference between a joy and a nightmare for consumers.

## Resource Naming

Use nouns, not verbs. Use plural forms consistently.

```
GET    /api/users          # list users
GET    /api/users/:id      # get single user
POST   /api/users          # create user
PUT    /api/users/:id      # full update
PATCH  /api/users/:id      # partial update
DELETE /api/users/:id      # delete user
```

## Status Codes

- `200` OK, `201` Created, `204` No Content
- `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found
- `500` Internal Server Error

## Pagination and Filtering

Always paginate list endpoints. Use cursor-based pagination for large datasets.

```
GET /api/users?page=2&limit=20&sort=-createdAt&role=admin
```

## Versioning

Prefer URL versioning (`/api/v1/users`) for simplicity. Header versioning is more "pure" REST but harder to test and debug.

## Security

Every API endpoint needs proper authentication and authorization. See Security Best Practices for CSRF protection, rate limiting, and input validation patterns. Always validate and sanitize inputs at the database layer too.

> [!info] Design First
> Write your OpenAPI spec before implementing. This forces you to think about the contract and enables parallel frontend/backend development.
