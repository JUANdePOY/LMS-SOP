# BACKEND_WORKFLOW.MD
# Backend Development Workflow Guide

This document defines the standard backend architecture and workflow rules for building scalable features inside the Airforce System.

## Core Principles

- Separate Routes, Controllers, Services, Models, Middleware, and Utilities
- Avoid spaghetti code
- Keep backend modular and scalable
- Keep SQL queries organized
- Keep controllers thin

# Recommended Structure
```txt
server/
 ┣ config/
 ┃ ┗ db.js
 ┣ controllers/
 ┣ middleware/
 ┣ models/
 ┣ routes/
 ┣ services/
 ┣ utils/
 ┣ uploads/
 ┣ app.js
 ┗ server.js
```

---

# Backend Flow

```txt
Route
 ↓
Controller
 ↓
Service
 ↓
Model
 ↓
Database
```

---

# Routes

Responsibilities:
- Define API endpoints
- Attach middleware
- Call controllers

Example:

```txt
routes/
 ┣ trainings.js
 ┣ attendance.js
 ┗ registrations.js
```

DO NOT:
- Put SQL queries in routes
- Put business logic in routes

---

# Controllers

Responsibilities:
- Handle request/response
- Validate request flow
- Call services

Example:

```txt
controllers/
 ┣ trainingsController.js
 ┣ attendanceController.js
 ┗ registrationController.js
```

DO NOT:
- Write SQL queries
- Create giant controller files

---

# Services

Responsibilities:
- Business logic
- Data processing
- Feature workflows

Example:

```txt
services/
 ┣ trainingsService.js
 ┣ attendanceService.js
 ┗ registrationService.js
```

---

# Models

Responsibilities:
- Database queries
- MySQL operations

Example:

```txt
models/
 ┣ trainingModel.js
 ┣ attendanceModel.js
 ┗ registrationModel.js
```

DO:
- Use parameterized queries
- Reuse query methods

DO NOT:
- Duplicate queries
- Concatenate unsafe SQL strings

---

# Middleware

Responsibilities:
- Authentication
- Validation
- File uploads
- Error handling

Example:

```txt
middleware/
 ┣ authMiddleware.js
 ┣ uploadMiddleware.js
 ┗ errorMiddleware.js
```

---

# Utils

Responsibilities:
- Shared helper functions
- Date formatting
- Validation helpers

Example:

```txt
utils/
 ┣ dateUtils.js
 ┣ validationUtils.js
 ┗ responseFormatter.js
```

---

# Uploads

Example:

```txt
uploads/
 ┣ letter-orders/
 ┣ certificates/
 ┣ trainings/            (internal training attachments; metadata in internal_training_attachments)
 ┣ external-trainings/   (external training attachments; metadata in external_training_attachments)
 ┗ attachments/
```

Database tables: `internal_training_attachments` (FK `trainings`), `external_training_attachments` (FK `external_trainings`). Legacy `training_attachments` was renamed via `server/sql/rename_training_attachments_to_internal.up.sql`.

Rules:
- Validate file type
- Use unique filenames
- Organize uploads properly

---

# API Response Standard

Success:

```json
{
  "success": true,
  "message": "Training created successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed"
}
```

---

# Feature Development Workflow

## Step 1 — Create Route

```txt
routes/trainings.js
```

## Step 2 — Create Controller

```txt
controllers/trainingsController.js
```

## Step 3 — Create Service

```txt
services/trainingsService.js
```

## Step 4 — Create Model

```txt
models/trainingModel.js
```

---

# Clean Code Rules

DO:
- Keep functions small
- Reuse services and models
- Use descriptive names
- Separate concerns

DO NOT:
- Create giant backend files
- Mix responsibilities
- Put everything in one file

---

# Naming Conventions

Routes:
```txt
feature.js
```

Controllers:
```txt
featureController.js
```

Services:
```txt
featureService.js
```

Models:
```txt
featureModel.js
```

---

# Final Goal

Every backend feature should:
- Be scalable
- Be maintainable
- Avoid spaghetti code
- Follow clean architecture
- Be easy to extend
