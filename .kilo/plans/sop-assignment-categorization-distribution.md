# SOP Assignment System Refactor: Categorization vs Distribution

## 1. Core Concept

The SOP assignment system is split into two distinct phases:

1. **Categorization** — Defines **where the SOP belongs** (Business + Department ownership).
2. **Distribution** — Defines **who can view the SOP** (Employees, Departments, or Businesses with access).

These phases are separated to prevent permission escalation and cross-business data leaks.

---

## 2. Data Model

### 2.1 SOP Table (`sops`)

```sql
ALTER TABLE sops
  ADD COLUMN business_id INT NULL AFTER id,
  ADD COLUMN department_id INT NULL AFTER business_id,
  ADD COLUMN restriction_type ENUM('public','department','assigned','private') NOT NULL DEFAULT 'public',
  ADD CONSTRAINT fk_sop_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_sop_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  ADD INDEX idx_sops_business_department (business_id, department_id);
```

**Semantics:**
- `business_id` / `department_id` — Categorization ownership. Immutable after creation for non-super-admins.
- `restriction_type` — Distribution visibility mode:
  - `public` — visible to all employees in the business
  - `department` — visible to all employees in the assigned department
  - `assigned` — visible only to explicitly assigned users/positions/departments
  - `private` — visible only to the owner

---

## 3. Phase 1: Categorization (Ownership)

### 3.1 Rules by Role

| Role | Business Selection | Department Selection | Post-Creation Edit |
|------|-------------------|---------------------|-------------------|
| **Department Head** | Auto-assigned to user's `business_id`; locked, disabled | Auto-assigned to first scoped department; locked, disabled | Cannot change |
| **Admin** | Auto-assigned to user's `business_id`; locked, disabled | Can select any department within their business | Cannot change business; can change department within business |
| **Super Admin** | Free select any business | Free select any department | Free edit |

### 3.2 Frontend Behavior

#### SOP Create Form
- **Department Head**: Business and Department fields are hidden or disabled, pre-filled with user's own values.
- **Admin**: Business field disabled/pre-filled; Department dropdown enabled but filtered to departments in admin's business.
- **Super Admin**: Both fields enabled with no restrictions.

#### SOP Edit Form
- **Department Head**: Business/Department fields locked; cannot modify categorization.
- **Admin**: Business field locked; Department field editable within business scope.
- **Super Admin**: Full edit access.

### 3.3 Backend Enforcement

**`POST /api/sops` (create)**
```javascript
// In sopService.createSop()
if (actor.role === 'department_head') {
  data.business_id = actor.business_id; // enforce
  data.department_id = actor.scoped_department_ids[0]; // enforce first scoped dept
} else if (actor.role === 'admin') {
  data.business_id = actor.business_id; // enforce
  // department_id must belong to actor.business_id
  if (departmentId && !isDepartmentInBusiness(departmentId, actor.business_id)) {
    throw new Error('Access denied: Department outside your business scope');
  }
}
// super_admin: no enforcement
```

**`PUT /api/sops/:id` (update)**
```javascript
// Categorization fields immutable for department_head and admin
if (actor.role !== 'super_admin') {
  const forbidden = ['business_id', 'department_id'];
  for (const field of forbidden) {
    if (payload[field] !== undefined && payload[field] !== existing[field]) {
      throw new Error('Access denied: Cannot change categorization');
    }
  }
}
// admin can still change department within business
if (actor.role === 'admin' && payload.department_id !== undefined) {
  if (!isDepartmentInBusiness(payload.department_id, actor.business_id)) {
    throw new Error('Access denied: Department outside your business scope');
  }
}
```

---

## 4. Phase 2: Distribution (Viewing Permissions)

### 4.1 Rules by Role

| Role | Can Assign To | Restrictions |
|------|--------------|-------------|
| **Department Head** | Employees in own department only | Cannot assign to other departments, positions, or businesses |
| **Admin** | Any employee/department within own business | Cannot assign to entities outside their business |
| **Super Admin** | Any employee/department/business across org | No restrictions |

### 4.2 Distribution UI Locking

#### Assignment Modal (`AssignmentForm.jsx`)

| UI Element | Department Head | Admin | Super Admin |
|-----------|---------------|-------|-------------|
| Business checkbox list | **Disabled/Locked** — auto-selected to own business | **Disabled/Locked** — auto-selected to own business | Enabled |
| Department checkbox list | **Disabled/Locked** — auto-selected to scoped departments | Enabled (filtered to own business departments) | Enabled |
| Position list | **Disabled/Locked** — auto-selected to positions in locked departments | Enabled (filtered to selected departments) | Enabled |
| User list | **Disabled/Locked** — auto-selected to users in locked departments | Enabled (filtered to selected departments) | Enabled |

### 4.3 Backend Enforcement

**`POST /api/sops/:sopId/assignments`**

```javascript
// In sopAssignmentService.createAssignment()
const actor = await getUser(assignedBy);

// department_head: only own scoped departments
if (actor.role === 'department_head') {
  const scoped = getScopedDepartmentIds(actor.id);
  const invalid = department_ids.filter(id => !scoped.includes(id));
  if (invalid.length > 0) {
    throw new Error('DEPT_SCOPE_DENIED');
  }
}

// admin: only departments within own business
if (actor.role === 'admin') {
  for (const deptId of department_ids) {
    const dept = await getDepartment(deptId);
    if (dept.business_id !== actor.business_id) {
      throw new Error('BUSINESS_SCOPE_DENIED');
    }
  }
}

// super_admin: no enforcement
```

**`GET /api/sops/assignment/departments` (cascade endpoint)**

```javascript
// In assignmentCascadeController.listDepartments()
if (req.user.role === 'department_head') {
  departments = departments.filter(d => scopedDepartmentIds.includes(d.id));
} else if (req.user.role === 'admin') {
  departments = departments.filter(d => d.business_id === req.user.business_id);
}
// super_admin: all departments
```

---

## 5. Frontend Component Changes

### 5.1 `SOPCreateForm.jsx`

**New Props:**
- `lockedDepartmentIds` (array | null) — Pre-selects and disables Business/Department pickers.

**Behavior:**
- When `lockedDepartmentIds` is provided:
  - Business picker: disabled, auto-selects the business of the first locked department.
  - Department picker: disabled, auto-selects only `lockedDepartmentIds`.
  - Positions/Users: load only for locked departments.

### 5.2 `AssignmentForm.jsx`

**New Props:**
- `lockedDepartmentIds` (array | null) — Locks the entire assignment to specific departments.

**Behavior:**
- When `lockedDepartmentIds` is provided:
  - Business picker: disabled.
  - Department picker: disabled, pre-selected to `lockedDepartmentIds`.
  - Positions/Users: load only for locked departments.
  - Submit button: enabled only if locked departments are selected.

### 5.3 `SOPListPage.jsx`

**Changes:**
- Passes `lockedDepartmentIds` to `SOPCreateForm` based on `useAuth().isDepartmentHead ? scopedDepartmentIds : null`.

### 5.4 `AssignmentModal.jsx`

**Changes:**
- Passes `lockedDepartmentIds` to `AssignmentForm` based on `useAuth().isDepartmentHead ? scopedDepartmentIds : null`.

---

## 6. Backend Service Changes

### 6.1 `sopService.js`

**`createSop(data, actorId)`**
- Enforces categorization based on role.
- Auto-assigns department for department_head if none provided.

### 6.2 `sopAssignmentService.js`

**`createAssignment(sopId, payload, assignedBy)`**
- Validates department scope for `department_head`.
- Validates business scope for `admin`.
- Rejects out-of-scope assignments with clear error codes:
  - `DEPT_SCOPE_DENIED`
  - `BUSINESS_SCOPE_DENIED`

### 6.3 `assignmentCascadeController.js`

**`listDepartments()`**
- Filters departments by `scoped_department_ids` for `department_head`.
- Filters departments by `business_id` for `admin`.
- Returns all for `super_admin`.

### 6.4 `assignmentCascadeService.js`

**`getDepartments(activeOnly, businessId)`**
- No changes needed; filtering happens in controller.

---

## 7. API Contract

### 7.1 Create SOP

**Request:**
```json
POST /api/sops
{
  "title": "Safety Procedure",
  "description": "...",
  "department_id": 5,        // optional for super_admin/admin; ignored for department_head
  "category_id": null,
  "status": "Draft",
  "restriction_type": "assigned",
  "is_default_onboarding": false,
  "min_time_limit": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "title": "Safety Procedure",
    "code": "OPS-2026-123",
    "business_id": 3,
    "department_id": 5,
    "restriction_type": "assigned",
    "status": "Draft"
  }
}
```

### 7.2 Assign SOP

**Request:**
```json
POST /api/sops/42/assignments
{
  "department_ids": [5, 6],
  "position_names": ["Manager"],
  "user_ids": [10, 11],
  "due_date": null,
  "notes": ""
}
```

**Error Responses:**
```json
// department_head assigning outside scope
{ "success": false, "error": { "code": "DEPT_SCOPE_DENIED", "message": "..." } }

// admin assigning outside business
{ "success": false, "error": { "code": "BUSINESS_SCOPE_DENIED", "message": "..." } }
```

---

## 8. Security & Authorization Matrix

| Action | Department Head | Admin | Super Admin |
|--------|----------------|-------|-------------|
| Create SOP — choose business | ❌ Auto | ❌ Auto | ✅ Free |
| Create SOP — choose department | ❌ Auto (first scoped) | ✅ Within business | ✅ Free |
| Edit SOP — change business | ❌ | ❌ | ✅ |
| Edit SOP — change department | ❌ | ✅ Within business | ✅ |
| Assign SOP — choose business | ❌ Auto | ❌ Auto | ✅ Free |
| Assign SOP — choose departments | ✅ Own scoped only | ✅ Within business | ✅ Free |
| Assign SOP — choose positions | ✅ Own dept only | ✅ Within business | ✅ Free |
| Assign SOP — choose users | ✅ Own dept only | ✅ Within business | ✅ Free |

---

## 9. Migration & Rollout

1. **Database**: Add `business_id`, `department_id` to `sops` table if not present.
2. **Backend**: Deploy updated `sopService.js`, `sopAssignmentService.js`, `assignmentCascadeController.js`.
3. **Frontend**: Deploy updated `SOPCreateForm.jsx`, `AssignmentForm.jsx`, `AssignmentModal.jsx`, `SOPListPage.jsx`, `BusinessSopCreateForm.jsx`.
4. **Validation**: Run existing tests; add role-based integration tests for categorization and distribution.
5. **Rollback**: Feature can be rolled back by reverting frontend prop passing and backend enforcement blocks.

---

## 10. Edge Cases

- **No scoped departments**: If a department_head has no grants and no `department_id`, creation fails with clear error.
- **Admin without business_id**: Creation/assignment fails with `FORBIDDEN` error.
- **Super Admin editing department_head's SOP**: Can change categorization freely; distribution still respects current user's role.
- **Existing SOPs without business_id/department_id**: Run a backfill migration to set these from the owner's role.
