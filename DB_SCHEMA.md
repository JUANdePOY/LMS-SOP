# LMS-SOP Database Schema

## Overview

This document describes the complete database schema for the LMS-SOP system. The database uses MySQL and is hosted remotely on Hostinger (phpMyAdmin).

## Database: `u607968802_lms_sop`

---

## Table: `users`

Stores user accounts with LMS-SOP roles and department assignments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Primary key |
| `full_name` | VARCHAR(255) | YES | NULL | User's full name |
| `email` | VARCHAR(255) | YES | NULL | Login email (unique) |
| `password_hash` | VARCHAR(255) | YES | NULL | bcrypt-hashed password |
| `role` | VARCHAR(100) | YES | NULL | LMS-SOP role: `super_admin`, `admin`, `department_head`, `employee` |
| `department_id` | INT | YES | NULL | Foreign key to `departments.id` |
| `position_title` | VARCHAR(255) | YES | NULL | Job title |
| `employee_id` | VARCHAR(100) | YES | NULL | Employee identifier |
| `contact_number` | VARCHAR(50) | YES | NULL | Phone number |
| `employment_status` | ENUM | YES | 'Regular' | `Regular`, `Probationary`, `Contractual`, `Resigned/Terminated`, `Retired`, `On Leave` |
| `date_hired` | DATE | YES | NULL | Hire date |
| `birthdate` | DATE | YES | NULL | Date of birth |
| `address` | TEXT | YES | NULL | Home address |
| `avatar_url` | VARCHAR(500) | YES | NULL | Profile picture URL |
| `last_login_at` | DATETIME | YES | NULL | Last login timestamp |
| `is_active` | TINYINT(1) | NO | TRUE | Account active status |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | Record creation time |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update time |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_users_email (email)`
- `INDEX idx_users_role (role)`
- `INDEX idx_users_department (department_id)`
- `INDEX idx_users_active (is_active)`

---

## Table: `departments`

Stores organizational departments with hierarchy support.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(255) | NO | | Department name |
| `code` | VARCHAR(100) | NO | | Department code (unique) |
| `description` | TEXT | YES | NULL | Description |
| `parent_department_id` | INT | YES | NULL | Self-referencing FK for hierarchy |
| `head_user_id` | INT | YES | NULL | FK to `users.id` (department head) |
| `status` | ENUM | NO | 'active' | `active`, `inactive`, `archived` |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_departments_code (code)`
- `INDEX idx_departments_parent (parent_department_id)`
- `INDEX idx_departments_head (head_user_id)`

**Foreign Keys:**
- `parent_department_id` → `departments(id)` ON DELETE SET NULL
- `head_user_id` → `users(id)` ON DELETE SET NULL

---

## Table: `roles`

Defines LMS-SOP roles for RBAC.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(100) | NO | | Role name (unique) |
| `display_name` | VARCHAR(255) | NO | | Human-readable name |
| `description` | TEXT | YES | NULL | Description |
| `is_active` | BOOLEAN | NO | TRUE | Active status |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_roles_name (name)`

**Roles:**
| Name | Display Name | Description |
|------|-------------|-------------|
| `super_admin` | Super Admin | Full system access |
| `admin` | Admin | Admin with scope management |
| `department_head` | Department Head | Department-level manager |
| `employee` | Employee | Standard user / learner |

---

## Table: `permissions`

Defines granular permissions for RBAC.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(100) | NO | | Permission name (unique) |
| `display_name` | VARCHAR(255) | NO | | Human-readable name |
| `description` | TEXT | YES | NULL | Description |
| `category` | VARCHAR(100) | YES | NULL | Permission category |
| `is_active` | BOOLEAN | NO | TRUE | Active status |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_permissions_name (name)`

**Permissions:**
| Name | Display Name | Category |
|------|-------------|----------|
| `view_dashboard` | View Dashboard | dashboard |
| `manage_users` | Manage Users | users |
| `manage_departments` | Manage Departments | departments |
| `manage_sops` | Manage SOPs | sops |
| `manage_courses` | Manage Courses | courses |
| `manage_assessments` | Manage Assessments | assessments |
| `view_reports` | View Reports | reports |
| `manage_settings` | Manage Settings | settings |
| `view_audit_logs` | View Audit Logs | audit |

---

## Table: `role_permissions`

Maps roles to permissions (many-to-many).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Primary key |
| `role_name` | VARCHAR(100) | NO | | FK to `roles.name` |
| `permission_name` | VARCHAR(100) | NO | | FK to `permissions.name` |
| `granted_by` | INT | YES | NULL | FK to `users.id` |
| `granted_at` | DATETIME | NO | CURRENT_TIMESTAMP | |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_role_perm (role_name, permission_name)`

**Foreign Keys:**
- `role_name` → `roles(name)` ON DELETE CASCADE
- `permission_name` → `permissions(name)` ON DELETE CASCADE

---

## Table: `audit_logs`

Tracks system audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Primary key |
| `user_id` | INT | YES | NULL | FK to `users.id` |
| `action` | VARCHAR(100) | NO | | Action performed |
| `entity_type` | VARCHAR(100) | NO | | Entity type affected |
| `entity_id` | VARCHAR(100) | YES | NULL | Entity ID |
| `metadata` | JSON | YES | NULL | Additional metadata |
| `ip_address` | VARCHAR(45) | YES | NULL | Client IP |
| `user_agent` | VARCHAR(500) | YES | NULL | Client user agent |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | |

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_audit_logs_user (user_id)`
- `INDEX idx_audit_logs_action (action)`
- `INDEX idx_audit_logs_entity (entity_type, entity_id)`
- `INDEX idx_audit_logs_created (created_at)`

---

## Table: `notifications`

User notification system.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT | NO | AUTO_INCREMENT | Primary key |
| `user_id` | INT | NO | | FK to `users.id` |
| `title` | VARCHAR(255) | NO | | Notification title |
| `body` | TEXT | YES | NULL | Notification body |
| `type` | ENUM | NO | 'info' | `info`, `warning`, `success`, `error` |
| `is_read` | BOOLEAN | NO | FALSE | Read status |
| `link` | VARCHAR(500) | YES | NULL | Link URL |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | |

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_notifications_user (user_id)`
- `INDEX idx_notifications_read (is_read)`

---

## Role Hierarchy

```
super_admin > admin > department_head > employee
```

## Role-Permission Mapping

| Role | Permissions |
|------|------------|
| `super_admin` | All permissions |
| `admin` | view_dashboard, manage_users, manage_departments, manage_sops, manage_courses, manage_assessments, view_reports |
| `department_head` | view_dashboard, manage_sops, manage_courses, manage_assessments, view_reports |
| `employee` | view_dashboard, view_reports |

---

## Test Accounts

See [SEED_DATA.md](./SEED_DATA.md) for complete testing account details.