# Task: Implement Organization Hierarchy Management

You are implementing the Organization Hierarchy module for an LMS-SOP system.

## Existing Tech Stack

Frontend:
- React
- Vite
- JavaScript
- Tailwind CSS
- Shadcn UI

Backend:
- Node.js
- Express.js
- MySQL

Database:
- MySQL

Follow the existing project architecture and do not introduce unnecessary dependencies.

---

# Feature Name

Organization Hierarchy Management

Sidebar:

🏢 Organization Management

Submenus:

├── Hierarchy Overview
├── Business
├── Departments
├── Categories
└── SOP Management


---

# Database Relationship

Implement the hierarchy:

Business
    |
    |
Department
    |
    |
Category (optional)
    |
    |
SOP


Existing database:

users
departments
roles
permissions
audit_logs


Important:

Do NOT duplicate existing department functionality.

Extend existing tables where necessary.

---

# Database Requirements

## Business Table

Create:

businesses


Columns:

id
business_code
business_name
description
logo_url
email
phone
address
status
created_by
updated_by
created_at
updated_at


Rules:

- id must match existing database convention (INT)
- created_by references users.id
- updated_by references users.id
- Use existing timestamp conventions


---

# Department Integration

Existing table:

departments


Current columns:

id
name
code
description
business_id
head_user_id
status
created_at
updated_at


Relationship:

businesses.id

↓

departments.business_id


Support:

- Multiple departments per business
- Flat department structure (no nesting)


Example:

Business

ABC Corporation

    |
    |
    +-- Operations

    |
    +-- IT

          |
          +-- Infrastructure

          +-- Support


---

# Frontend Implementation


Create feature folder:

src/features/organization-management/


Structure:

organization-management/

├── api/
│   ├── business.api.js
│   ├── department.api.js
│   └── hierarchy.api.js


├── components/

│
├── hierarchy/
│   ├── OrganizationTree.jsx
│   ├── BusinessNode.jsx
│   ├── DepartmentNode.jsx
│   └── HierarchyToolbar.jsx


├── business/

│   ├── BusinessTable.jsx
│   ├── BusinessForm.jsx
│   └── BusinessModal.jsx


├── department/

│   ├── DepartmentTable.jsx
│   ├── DepartmentForm.jsx
│   └── DepartmentModal.jsx


├── pages/

│   ├── HierarchyOverviewPage.jsx
│   ├── BusinessPage.jsx
│   └── DepartmentPage.jsx


├── hooks/

│   ├── useBusinesses.js
│   ├── useDepartments.js
│   └── useHierarchy.js


├── services/

│   ├── business.service.js
│   ├── department.service.js
│   └── hierarchy.service.js


└── routes/

    └── organization.routes.js


---

# Hierarchy Overview Page


Create a visual organization tree.


Example:


ABC Corporation

▼

Departments


▼


Operations

    ├── Logistics

    └── Maintenance



IT

    ├── Infrastructure

    └── Development



Features:

- Expand/collapse nodes
- Search hierarchy
- Click node to view details
- Show department head
- Show employee count
- Show SOP count


---

# Business Management Page


CRUD:


Create Business

Fields:

- Business Code
- Business Name
- Description
- Status


Actions:

- Create
- Edit
- Activate
- Deactivate


---

# Department Management Page


CRUD:


Create Department


Fields:

- Business
- Department Name
- Department Code
- Parent Department
- Department Head
- Description
- Status


Support:


Parent Department selection:


Example:


Operations

    └── Logistics

          └── Warehouse


---

# API Endpoints


## Business


GET

/businesses


POST

/businesses


PUT

/businesses/:id


DELETE

/businesses/:id



## Departments


GET

/departments


GET

/departments/tree


POST

/departments


PUT

/departments/:id


DELETE

/departments/:id



## Hierarchy


GET

/hierarchy


Response:


[
 {
   business:"ABC Corporation",
   departments:[
      {
        name:"Operations",
        children:[]
      }
   ]
 }
]


---

# Permissions


Add permissions:

manage_businesses

manage_departments

view_hierarchy


Roles:


super_admin

- Full access


admin

- Manage businesses
- Manage departments


department_head

- View own department hierarchy


employee

- View hierarchy only


---

# Audit Logging


Every action must create audit_logs:


Examples:


CREATE BUSINESS

UPDATE BUSINESS

CREATE DEPARTMENT

UPDATE DEPARTMENT

DELETE DEPARTMENT


Use existing audit_logs table.


---

# UI Requirements


Use:

- Shadcn UI
- Tailwind CSS


Components:

Card

Table

Dialog

Dropdown Menu

Tree View


Responsive design.


---

# Important Rules

1. Do not modify users table.
2. Do not duplicate departments table.
3. Keep existing RBAC system.
4. Follow existing database naming conventions.
5. Use service layer between controllers and database.
6. Use validation before saving.
7. Add loading and error states.
8. Keep feature isolated and scalable.

---

# Expected Result


A complete Organization Management module where users can:

- Create businesses
- Assign departments
- Build department hierarchy
- View organization tree
- Connect hierarchy to SOP ownership
- Prepare structure for future LMS reporting