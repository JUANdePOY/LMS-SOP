# LMS-SOP Seed Data & Testing Accounts

## Overview

This document describes the demo seed data loaded by `npm run seed` and provides testing account credentials for manual QA.

## How to Seed

```bash
# Run the seed script
npm run seed

# Or from the server directory
cd server && node seed.js
```

The seed script creates:
1. 4 roles (`super_admin`, `admin`, `department_head`, `employee`)
2. 9 permissions
3. Role-to-permission mappings
4. 5 departments
5. 8 demo users (all with password `password123`)

---

## Roles

| Role | Display Name | Description |
|------|-------------|-------------|
| `super_admin` | Super Admin | Full system access — can manage everything |
| `admin` | Admin | Admin with user/department/scope management |
| `department_head` | Department Head | Department-level manager — can manage SOPs, courses, assessments, reports |
| `employee` | Employee | Standard user / learner — can view dashboard and reports |

## Permissions

| Permission | Display Name | Category |
|-----------|-------------|----------|
| `view_dashboard` | View Dashboard | dashboard |
| `manage_users` | Manage Users | users |
| `manage_departments` | Manage Departments | departments |
| `manage_sops` | Manage SOPs | sops |
| `manage_courses` | Manage Courses | courses |
| `manage_assessments` | Manage Assessments | assessments |
| `view_reports` | View Reports | reports |
| `manage_settings` | Manage Settings | settings |
| `view_audit_logs` | View Audit Logs | audit |

## Role-Permission Mapping

| Role | Permissions |
|------|------------|
| `super_admin` | All 9 permissions |
| `admin` | view_dashboard, manage_users, manage_departments, manage_sops, manage_courses, manage_assessments, view_reports |
| `department_head` | view_dashboard, manage_sops, manage_courses, manage_assessments, view_reports |
| `employee` | view_dashboard, view_reports |

---

## Departments

| ID | Name | Code | Description |
|----|------|------|-------------|
| 1 | Operations | OPS | Operations department |
| 2 | HR & Admin | HR | Human Resources & Administration |
| 3 | Sales & Marketing | S&M | Sales and Marketing department |
| 4 | Finance | FIN | Finance department |
| 5 | IT | IT | Information Technology department |

---

## Testing Accounts

### Super Admin

| Field | Value |
|-------|-------|
| **Email** | `john.d@organization.com` |
| **Password** | `password123` |
| **Role** | `super_admin` |
| **Department** | Operations |
| **Position** | System Administrator |
| **Employee ID** | EMP-001 |
| **Contact** | +1-555-0101 |
| **Status** | Regular |
| **Date Hired** | 2020-01-15 |
| **Birthdate** | 1985-03-10 |

**Capabilities:** Full access to all pages, settings, user/department management, audit logs, SOP/course/assessment management, reports.

---

### Admin

| Field | Value |
|-------|-------|
| **Email** | `jane.s@organization.com` |
| **Password** | `password123` |
| **Role** | `admin` |
| **Department** | HR & Admin |
| **Position** | HR Manager |
| **Employee ID** | EMP-002 |
| **Contact** | +1-555-0102 |
| **Status** | Regular |
| **Date Hired** | 2021-06-01 |
| **Birthdate** | 1990-07-22 |

**Capabilities:** User/department management, SOP/course/assessment management, reports. Cannot access settings or audit logs.

---

### Department Head (Operations)

| Field | Value |
|-------|-------|
| **Email** | `mike.r@organization.com` |
| **Password** | `password123` |
| **Role** | `department_head` |
| **Department** | Operations |
| **Position** | Operations Lead |
| **Employee ID** | EMP-003 |
| **Contact** | +1-555-0103 |
| **Status** | Regular |
| **Date Hired** | 2019-03-15 |
| **Birthdate** | 1988-11-05 |

**Capabilities:** View dashboard, manage SOPs/courses/assessments for own department, view reports. Cannot manage users or departments.

---

### Employee (Sales & Marketing)

| Field | Value |
|-------|-------|
| **Email** | `sarah.m@organization.com` |
| **Password** | `password123` |
| **Role** | `employee` |
| **Department** | Sales & Marketing |
| **Position** | Sales Representative |
| **Employee ID** | EMP-004 |
| **Contact** | +1-555-0104 |
| **Status** | Regular |
| **Date Hired** | 2022-09-01 |
| **Birthdate** | 1995-01-18 |

**Capabilities:** View dashboard and reports only. Cannot manage SOPs, courses, assessments, users, or departments.

---

### Employee (IT)

| Field | Value |
|-------|-------|
| **Email** | `tom.k@organization.com` |
| **Password** | `password123` |
| **Role** | `employee` |
| **Department** | IT |
| **Position** | IT Specialist |
| **Employee ID** | EMP-005 |
| **Contact** | +1-555-0105 |
| **Status** | Regular |
| **Date Hired** | 2021-02-10 |
| **Birthdate** | 1992-06-30 |

**Capabilities:** View dashboard and reports only.

---

### Employee (Finance)

| Field | Value |
|-------|-------|
| **Email** | `lisa.w@organization.com` |
| **Password** | `password123` |
| **Role** | `employee` |
| **Department** | Finance |
| **Position** | Financial Analyst |
| **Employee ID** | EMP-006 |
| **Contact** | +1-555-0106 |
| **Status** | Regular |
| **Date Hired** | 2023-01-15 |
| **Birthdate** | 1993-09-14 |

**Capabilities:** View dashboard and reports only.

---

### Employee (Operations - Probationary)

| Field | Value |
|-------|-------|
| **Email** | `david.p@organization.com` |
| **Password** | `password123` |
| **Role** | `employee` |
| **Department** | Operations |
| **Position** | Operations Coordinator |
| **Employee ID** | EMP-007 |
| **Contact** | +1-555-0107 |
| **Status** | Probationary |
| **Date Hired** | 2024-04-01 |
| **Birthdate** | 1998-04-25 |

**Capabilities:** View dashboard and reports only.

---

### Employee (HR - Assistant)

| Field | Value |
|-------|-------|
| **Email** | `emma.l@organization.com` |
| **Password** | `password123` |
| **Role** | `employee` |
| **Department** | HR & Admin |
| **Position** | HR Assistant |
| **Employee ID** | EMP-008 |
| **Contact** | +1-555-0108 |
| **Status** | Regular |
| **Date Hired** | 2023-08-15 |
| **Birthdate** | 1996-12-08 |

**Capabilities:** View dashboard and reports only.

---

## Testing Scenarios

### 1. Login Flow
1. Navigate to `/login`
2. Enter `john.d@organization.com` / `password123`
3. Verify redirect to `/dashboard`
4. Verify the user sees the super admin sidebar menu

### 2. Role-Based Menu Visibility
1. Login as `employee` (`sarah.m@organization.com`)
2. Verify sidebar only shows Dashboard and Reports
3. Login as `department_head` (`mike.r@organization.com`)
4. Verify sidebar shows Dashboard, SOP Management, Course Management, Assessments, Reports
5. Login as `admin` (`jane.s@organization.com`)
6. Verify sidebar shows Dashboard, User Management, Department Management, SOP Management, Course Management, Assessments, Reports
7. Login as `super_admin` (`john.d@organization.com`)
8. Verify sidebar shows all menu items including Settings and Audit Logs

### 3. User Management (Admin/Super Admin only)
1. Login as `super_admin`
2. Navigate to Users page
3. Verify all 8 users are listed
4. Verify search/filter by role and department works
5. Verify create/edit/delete user modals are accessible

### 4. Department Management (Admin/Super Admin only)
1. Login as `super_admin`
2. Navigate to Departments page
3. Verify all 5 departments are listed
4. Verify hierarchy tree view works
5. Verify create/edit/delete department modals are accessible

### 5. Dashboard
1. Login as any user
2. Verify dashboard loads with stat cards, charts, and tables
3. Verify data matches the seed data

### 6. Profile Page
1. Login as any user
2. Navigate to Profile
3. Verify user details are displayed correctly
4. Verify profile update works

### 7. Settings Page
1. Login as `super_admin`
2. Navigate to Settings
3. Verify general settings and user management tabs are accessible

### 8. Audit Logs (Super Admin only)
1. Login as `super_admin`
2. Navigate to Audit Logs (if menu item is visible)
3. Verify audit log entries are displayed

### 9. RBAC Protection
1. Login as `employee` (`sarah.m@organization.com`)
2. Try to navigate directly to `/users`
3. Verify access is denied (redirected or shown as unauthorized)
4. Try to navigate directly to `/departments`
5. Verify access is denied
6. Try to navigate directly to `/settings`
7. Verify access is denied

### 10. Password Change
1. Login as any user
2. Navigate to Profile or Settings
3. Change password
4. Verify the new password works on next login

---

## Password Policy

All demo accounts use the same password: **`password123`**

In production, passwords are hashed with bcrypt (12 salt rounds) and should be changed immediately after first login.