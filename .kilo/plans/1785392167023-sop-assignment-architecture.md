# SOP Assignment Architecture Improvement Plan

## 1. Problem Statement

The current SOP assignment system has the following gaps:

- **No cascading dropdowns**: Business → Department → Position → User filtering is missing
- **Positions are free-form text**: `assignment_positions.position_name` stores positions as plain strings (no dedicated positions table, no dropdown)
- **No Business → Department relationship**: Departments have no `business_id` column, so departments cannot be filtered by business
- **No position dropdown**: Position selection is a text input, not a dropdown from a reference list
- **No user dropdown filtered by dept/position**: User selection is not cascading — users are not filtered by the selected department or position
- **No frontend assignment UI components**: Assignment creation currently lives in SOPListPage.jsx for SOP creation only; there are no assignment management components in the SOP workspace
- The validator supports `Department`, `Position`, `User` types, but the frontend doesn't expose these as proper cascading dropdowns

## 2. Proposed Architecture

### 2.1 Target Workflow

When assigning an SOP to comply with, the user should see cascading dropdowns:

```
Business ▼        → Filters available Departments
  Department ▼    → Filters available Positions (and Users)
    Position ▼    → Filters Users in that position
      User ▼      → Specific user assignment
```

The user can assign to any combination of:
- A specific Business (cascades to its Departments)
- A specific Department within that Business (cascades to Positions)
- A specific Position (cascades to Users)
- A specific User (final leaf node)

### 2.2 Assignment Types

| Type | Requires | Cascades From |
|---|---|---|
| `Business` | `business_id` | — (top level) |
| `Department` | `department_id` | Business |
| `Position` | `position_id` | Department |
| `User` | `user_id` | Position or Department |

The current system already supports `Department`, `Position`, and `User`. We add `Business` as a new top-level assignment type and introduce a proper `positions` reference table.

## 3. Database Changes

### 3.1 New Table: `positions`

A proper reference table for job positions, scoped to businesses.

```sql
CREATE TABLE IF NOT EXISTS positions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(36)  NOT NULL DEFAULT (UUID()),
  business_id     INT       NOT NULL,
  name            VARCHAR(100) NOT NULL,
  description     TEXT NULL,
  created_by      INT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  CONSTRAINT pk_positions PRIMARY KEY (id),
  CONSTRAINT uq_positions_business_name UNIQUE (business_id, name),
  CONSTRAINT fk_positions_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_positions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_positions_business (business_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.2 Alter `departments` — Add `business_id`

```sql
ALTER TABLE departments
  ADD COLUMN business_id INT NULL AFTER parent_department_id,
  ADD INDEX idx_departments_business (business_id),
  ADD CONSTRAINT fk_departments_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;
```

### 3.3 Alter `assignment_positions` — Replace `position_name` with `position_id` FK

The current `assignment_positions` table stores `position_name` as VARCHAR (no FK). We replace this with a proper FK to the `positions` table:

```sql
-- Step 1: Add position_id column
ALTER TABLE assignment_positions
  ADD COLUMN position_id INT NULL AFTER assignment_id,
  ADD INDEX idx_ap_position (position_id);

-- Step 2: Backfill position_id from positions table using position_name + business match
-- (run once after migration)

-- Step 3: Drop the old position_name column and add FK
ALTER TABLE assignment_positions
  DROP COLUMN position_name,
  ADD CONSTRAINT fk_ap_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE;
```

### 3.4 New table: `assignment_businesses` (optional, for business-level assignment)

If Business-level assignment is desired (assigning an SOP to all users in a business):

```sql
CREATE TABLE IF NOT EXISTS assignment_businesses (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id   INT NOT NULL,
  business_id     INT NOT NULL,
  CONSTRAINT pk_assignment_businesses PRIMARY KEY (id),
  CONSTRAINT uq_assignment_business UNIQUE (assignment_id, business_id),
  CONSTRAINT fk_ab_assignment FOREIGN KEY (assignment_id) REFERENCES sop_assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_ab_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.5 Alter `assignment_users` — Add `department_id` for direct user assignment

When a user is assigned directly (not via position), we need to know which department context:

```sql
ALTER TABLE assignment_users
  ADD COLUMN department_id INT NULL AFTER user_id,
  ADD INDEX idx_au_department (department_id),
  ADD CONSTRAINT fk_au_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
```

### 3.6 Migration File

Create `server/migrations/sopAssignmentArchitecture.js` following the existing migration pattern (`server/migrations/courseManagement.js`).

## 4. Backend Changes

### 4.1 New Files

| File | Purpose |
|---|---|
| `server/models/positionModel.js` | CRUD for `positions` table |
| `server/services/assignmentCascadeService.js` | Cascading dropdown queries (business → departments → positions → users) |
| `server/validators/sopAssignmentValidator.js` (updated) | Add cascaded validation: business_id → department_id → position_id → user_id must form a valid chain |

### 4.2 Modified Files

| File | Changes |
|---|---|
| `server/services/sopAssignmentService.js` | Add `business_id` to validation; add cascade-aware `createAssignment()` that resolves users based on business→dept→position→user chain |
| `server/models/sopComplianceModel.js` | Update `createAssignment()` to accept `business_id` and `position_id`; update `listAssignments()` to include business/position info; update `findDuplicateAssignment()` to check cascaded chains |
| `server/services/sopAssignmentService.js` | Add `getDepartmentsByBusiness(businessId)`, `getPositionsByDepartment(deptId)`, `getUsersByDepartmentAndPosition(deptId, positionId)` helper methods for the cascading dropdowns |
| `server/routes/sops.js` | Add GET routes for cascade endpoints: `/sops/assignment/departments?businessId=X`, `/sops/assignment/positions?departmentId=X`, `/sops/assignment/users?departmentId=X&positionId=Y` |
| `server/routes/sops.js` | Add `/sops/:sopId/assignments` POST to create assignment with cascading payload |

### 4.3 New API Endpoints

```
# Cascading dropdown data
GET   /sops/assignment/businesses              # List businesses for dropdown
GET   /sops/assignment/departments?businessId  # Departments filtered by Business
GET   /sops/assignment/positions?departmentId  # Positions filtered by Department
GET   /sops/assignment/users?departmentId&positionId  # Users filtered by Dept + Position

# Assignment CRUD (existing, enhanced)
GET    /sops/:sopId/assignments               # List assignments with cascade info
POST   /sops/:sopId/assignments               # Create assignment with cascaded payload
DELETE /sops/assignments/:id                  # Delete assignment
```

### 4.4 Updated Assignment Payload Schema

```json
{
  "assignment_type": "Department" | "Position" | "User" | "Business",
  "business_id": 1,         // required for Business type
  "department_id": 2,       // required for Department/Position types, cascaded from Business
  "position_id": 3,         // required for Position type, cascaded from Department
  "user_id": 4,             // required for User type, cascaded from Position or Department
  "due_date": "2026-12-31",
  "notes": "Review quarterly"
}
```

### 4.5 Validation Rules

- **Business type**: `business_id` required; no department/position/user needed (resolves all users in that business)
- **Department type**: `department_id` required; must belong to the `business_id` selected; `business_id` optional but validated if present
- **Position type**: `position_id` required; must belong to the `department_id` selected; both `department_id` and `business_id` validated if present
- **User type**: `user_id` required; if `department_id` is provided, the user must belong to that department; if `position_id` is provided, the user must hold that position
- **Cascade integrity**: `business_id → department_id → position_id → user_id` must form a valid chain. Cannot skip levels unless the prior level is null
- **Duplicate detection**: An identical assignment (same type + target) cannot exist for the same SOP version

### 4.6 Resolve Users Logic (Updated)

When resolving which users an SOP assignment applies to, the chain resolves as follows:

| Assignment Type | Resolution |
|---|---|
| `Business` | All users in all departments of that business |
| `Department` | All users in that department |
| `Position` | All users holding that position (in the department chain) |
| `User` | The specific user |

## 5. Frontend Changes

### 5.1 New Files

| File | Purpose |
|---|---|
| `client/src/features/sop-management/components/SOPWorkspace/AssignmentForm.jsx` | Cascading dropdown form for creating assignments |
| `client/src/features/sop-management/components/SOPWorkspace/AssignmentList.jsx` | List of current assignments with cascade display |
| `client/src/features/sop-management/hooks/useAssignmentCascade.js` | Hook for fetching cascading dropdown data with caching |
| `client/src/features/sop-management/hooks/useAssignments.js` | Hook for CRUD operations on assignments |
| `client/src/features/sop-management/services/assignmentService.js` | API service for assignment endpoints + cascade endpoints |

### 5.2 Modified Files

| File | Changes |
|---|---|
| `client/src/features/sop-management/pages/SOPWorkspacePage.jsx` | Add Assignment section with AssignmentForm and AssignmentList components |
| `client/src/features/sop-management/services/sopService.js` | Add cascade endpoint calls |
| `client/src/features/sop-management/services/sopAssignmentService.js` | Update payload shape to match new cascaded format |

### 5.3 Cascading Dropdown UI Pattern

The `AssignmentForm` component follows this pattern:

1. **Business dropdown** (load on mount): `GET /sops/assignment/businesses`
   - Selecting a business sets `selectedBusiness` and clears dependent fields
2. **Department dropdown** (depends on Business): `GET /sops/assignment/departments?businessId=X`
   - Only enabled when a business is selected
   - Selecting a department sets `selectedDepartment` and clears position/user
3. **Position dropdown** (depends on Department): `GET /sops/assignment/positions?departmentId=X`
   - Only enabled when a department is selected
   - Selecting a position sets `selectedPosition` and clears user
4. **User dropdown** (depends on Position or Department):
   - If Position selected: `GET /sops/assignment/users?departmentId=X&positionId=Y`
   - If no Position but Department selected: `GET /sops/assignment/users?departmentId=X`
   - Only enabled when a department (and optionally position) is selected

The form also has an **Assignment Type** selector that switches between:
- Single target (Business, Department, Position, or User)
- Or multi-target (multiple departments/positions/users)

### 5.4 Component Size Constraints

Per architecture rules, no component exceeds 300 lines. The `AssignmentForm.jsx` should be kept under 300 lines by extracting the individual dropdown sub-components into their own files if needed.

## 6. Security Considerations

- All cascade endpoints are authenticated (`authenticateToken` middleware)
- Authorization: only SOP owner/admin can create assignments
- All user inputs validated server-side (business_id must belong to selected department chain, etc.)
- Cascade queries use parameterized queries to prevent SQL injection
- User dropdowns only return active users (`is_active = TRUE`)
- Duplicate assignment detection prevents the same target from being assigned twice to the same SOP version

## 7. Performance Considerations

- Cascade endpoints return paginated results (default 50 per page) for department and user lists
- Add composite index on `departments(business_id)` for fast filtering
- Add composite index on `positions(business_id, name)` for fast position lookups
- Add composite index on `assignment_users(department_id, position_id)` for user resolution
- Frontend implements debounced search on user dropdown for large departments
- Cascade data is cached in React query state (useSWR or React Query) to avoid redundant API calls when switching between assignment types

## 8. Migration Order

1. **DB Migration**: Add `business_id` to departments, create `positions` table, migrate `assignment_positions.position_name` → `position_id` FK, add `assignment_businesses` table
2. **Backend Models**: Create `positionModel.js`, update `sopComplianceModel.js`
3. **Backend Services**: Create `assignmentCascadeService.js`, update `sopAssignmentService.js`
4. **Backend Validator**: Update `sopAssignmentValidator.js` with cascaded validation
5. **Backend Controllers/Routes**: Add cascade endpoints, update assignment endpoints
6. **Frontend Services**: Create `assignmentService.js`, update `sopService.js`
7. **Frontend Hooks**: Create `useAssignmentCascade.js`, `useAssignments.js`
8. **Frontend Components**: Create `AssignmentForm.jsx`, `AssignmentList.jsx`, update `SOPWorkspacePage.jsx`
9. **Testing**: Test cascade chain integrity, validation, duplicate prevention, user resolution
