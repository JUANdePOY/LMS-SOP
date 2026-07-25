# Database Schema

## Overview

This document defines the database architecture for the Learning Management System (LMS) with a primary focus on the SOP Management module.

## Database Information

- Database: lms
- Engine: InnoDB
- Charset: utf8mb4
- Collation: utf8mb4_unicode_ci

---

# Modules

- Authentication
- User Management
- Department Management
- Role & Permission Management
- SOP Management
- Audit Logs

---

# Entity Relationship Overview

```text
Departments
      │
      ▼
Categories
      │
      ▼
     SOPs
      │
      ▼
 SOP Versions
      │
 ┌────┼─────────────┬─────────────┬─────────────┐
 ▼    ▼             ▼             ▼             ▼
Sections Steps   Documents   Approvals   Assignments
                     │
                     ▼
            Acknowledgements
```

---

# User Management

## users

### Purpose

Stores application users.

### Relationships

- belongs to Department
- has many Roles
- owns SOPs
- approves SOPs

### Columns

| Column | Type | Description |
|---------|------|-------------|

---

# Departments

...

---

# SOP Management

## sops

### Purpose

Master record for each SOP.

### Relationships

- belongs to Department
- belongs to Category
- has many Versions

### Columns

| Column | Type | Description |

---

## sop_versions

Purpose

Stores every revision of an SOP.

Each published revision is immutable.

---

## sop_sections

Purpose

Stores structured sections.

Examples

- Purpose
- Scope
- References
- Safety Notes

---

## sop_steps

Purpose

Stores ordered procedural steps.

Supports:

- drag & drop
- insert
- duplicate
- comments

---

## sop_documents

Purpose

Stores uploaded files.

Supports

- PDF
- Word
- Image
- Video

---

## sop_assignments

Purpose

Determines who must comply with an SOP.

Supports

- Department
- Position
- User

---

## sop_acknowledgements

Purpose

Tracks employee acknowledgement.

---

## sop_approvals

Purpose

Tracks workflow approvals.

---

## sop_change_logs

Purpose

Tracks field-level changes between versions.

---

# Indexes

## sops

- idx_sop_code
- idx_sop_title

## sop_versions

- idx_status

## acknowledgements

- idx_ack_user_status

---

# Workflow

Draft
↓

For Review
↓

Approved
↓

Published
↓

Archived

---

# Version Lifecycle

Version 1.0

↓

Version 1.1

↓

Version 2.0

↓

Version 3.0

---

# Publishing Flow

Create Draft
↓

Submit
↓

Review
↓

Approve
↓

Publish
↓

Notify Users
↓

Create Acknowledgements

---

# Design Principles

- Third Normal Form (3NF)
- Immutable Version History
- Soft Delete Friendly
- Audit Ready
- ISO/QMS Ready
- Enterprise Scalable

---

# Future Modules

- Course Management
- Quiz Management
- Certificate Management
- Notification Management
- Reports