# Backend Workflow Guide

This document defines the standard workflow and architecture rules for building backend features inside the Airforce System.

The goal is to:

- Maintain clean architecture
- Avoid spaghetti code
- Keep code modular and testable
- Keep the backend scalable
- Provide consistent layering across routes → controller → service → model → DB

---

## Core Architecture Principles

### Separation of Concerns
Always separate:

- **Routes** (HTTP endpoints + validation wiring)
- **Controller** (request/response orchestration)
- **Service** (business logic + transaction boundaries when needed)
- **Model** (DB access)
- **SQL/Migrations/Queries** (schema and query definitions)
- **Middleware** (auth/role checks, file upload handling, etc.)

DO NOT:

- Put business logic in routes
- Put direct SQL calls in controllers
- Mix request validation with DB logic
- Return DB rows directly without mapping to a stable response shape

---

## Standard Folder Workflow (Backend)

Every feature should follow this workflow:

```txt
server/routes/
server/controllers/
server/services/
server/models/
server/sql/   (optional migrations/ups)
```

---

## Responsibilities

### server/routes/

Contains:

- Express route definitions (e.g. `router.get/post/...`)
- Middleware chaining
- Request validation wiring (if applicable)

Rules:

- Routes only define the endpoint contract.
- Keep route handlers thin; delegate to controllers.

---

### server/controllers/

Contains:

- HTTP request/response orchestration
- Input normalization (but not business rules)
- Calling the service layer
- Mapping service results to HTTP responses

Rules:

- Controllers should be thin.
- No direct SQL calls.

---

### server/services/

Contains:

- Business logic
- Orchestration across models
- Transaction handling when multiple DB writes must succeed together
- Auditing/logging integration (when applicable)

Rules:

- Services encapsulate the feature behavior.
- Keep service methods focused and reusable.

---

### server/models/

Contains:

- Data access logic (DB reads/writes)
- Query building / parameter binding
- Mapping raw DB rows to domain-friendly objects (light mapping)

Rules:

- Models should not understand HTTP.
- Models should not implement business rules.

---

### server/sql/ (optional)

Contains:

- Migration scripts (`*.up.sql`)
- Schema evolution steps

Rules:

- Keep migrations small and atomic.
- Prefer additive migrations; update app code accordingly.

---

## Request Flow (End-to-End)

1. **Route** receives request
2. **Middleware** runs (auth/rbac/upload/training upload checks)
3. **Controller** validates/normalizes inputs, calls service
4. **Service** performs business logic, calls models
5. **Model** executes DB operations
6. **Controller** returns mapped response
7. **Client** renders UI

---

## Feature Development Workflow (Backend)

### STEP 1 — Plan the Feature

Before coding:

- Define endpoint(s) (method + path + expected inputs/outputs)
- Identify business rules
- Identify DB tables/fields involved
- Decide whether transactions are required
- Decide what needs authorization (RBAC)

---

### STEP 2 — Add/Update Routes

- Create new route file or update existing one
- Wire middleware (auth/rbac/upload)
- Delegate to controller functions

---

### STEP 3 — Implement Controller

- Normalize input (dates, enums, ids)
- Call service methods
- Handle errors consistently (e.g., pass to error middleware)

---

### STEP 4 — Implement Service

- Implement business logic
- Orchestrate multiple model calls
- If needed, wrap DB changes in transactions

---

### STEP 5 — Implement Model

- Add read/write/query methods
- Use parameterized queries
- Keep query logic isolated from business rules

---

### STEP 6 — Update SQL/Migrations (if needed)

- Add migration scripts for schema changes
- Ensure app code matches new schema

---

### STEP 7 — Integration Testing (if applicable)

- Validate full request flow against a dev database
- Cover success and key failure cases (validation, RBAC, missing entities)

---

## Error Handling Standards

- Validate inputs at the boundary (route/controller)
- Use consistent error responses (message + code/status as per existing conventions)
- Services throw meaningful errors; controllers map them to HTTP responses

---

## Final Goal

Every backend feature should:

- Be scalable
- Be maintainable
- Follow clean layering
- Avoid spaghetti code
- Be easy to extend and test

