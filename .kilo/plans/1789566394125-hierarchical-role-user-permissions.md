# Plan: Hierarchical Role-User Permissions with Module-Specific Actions

## Goal
Transform the Roles table into an expandable hierarchy where clicking a role reveals its assigned users, and each user can have individual permission overrides with **module-specific action granularity** (e.g., SOPs: view/create/edit/delete/approve/publish/assign; Courses: view/create/edit/delete/publish/archive/enroll/grade).

## Current State
- `user_permission_overrides` table already exists (created in `server/config/database.js` migrations, not in `sql/schema.sql`)
- 13 permissions across 11 categories: `view_dashboard`, `manage_users`, `manage_departments`, `manage_sops`, `manage_courses`, `manage_assessments`, `manage_announcements`, `manage_events`, `view_reports`, `manage_settings`, `view_audit_logs`, `notifications.send`, `notifications.broadcast`
- User overrides are boolean-only (`granted TRUE/FALSE`) with no action granularity
- `resolveUserPermissions` returns `string[]`
- Frontend `hasPermission` checks string inclusion
- RolesPanel has a detail modal (lines 553-660) and an inline permission overlay panel (lines 662-740)
- Certificate management feature exists but has no permissions defined; **out of scope for this feature**

## Key Design Decisions

### 1. Actions Defined Per Permission in `permissions` Table (Approach B - Selected)
- Add `actions JSON DEFAULT NULL` column to `permissions` table
- Each permission defines its own valid actions
- `NULL` = legacy default (universal CRUD for manage_*, view-only for view_*)
- Rationale: Your `permissions` table is already admin-manageable and has `category`. Adding `actions` JSON is one `ALTER TABLE`, same pattern as existing `user_permission_overrides`. Avoids hardcoded maps and unnecessary lookup tables.

### 2. Module-Specific Actions (Confirmed)

| Permission | Category | Module | Valid Actions |
|------------|----------|--------|---------------|
| `view_dashboard` | dashboard | Dashboard | `["view"]` |
| `manage_users` | users | Users | `["view","create","edit","delete","manage_roles"]` |
| `manage_departments` | departments | Departments | `["view","create","edit","delete","manage_head"]` |
| `manage_sops` | sops | SOPs | `["view","create","edit","delete","approve","publish","assign"]` |
| `manage_courses` | courses | Courses | `["view","create","edit","delete","publish","archive","enroll","grade"]` |
| `manage_assessments` | assessments | Assessments | `["view","create","edit","delete","assign","grade","publish"]` |
| `manage_announcements` | announcements | Announcements | `["view","create","edit","delete","publish"]` |
| `manage_events` | events | Events | `["view","create","edit","delete","register","manage_registrations"]` |
| `view_reports` | reports | Reports | `["view","export","schedule"]` |
| `manage_settings` | settings | Settings | `["view","edit"]` |
| `view_audit_logs` | audit | Audit | `["view","export"]` |
| `notifications.send` | notifications | Notifications | `["send"]` |
| `notifications.broadcast` | notifications | Notifications | `["broadcast"]` |

### 3. Actions Storage on User Overrides
- Add `actions JSON DEFAULT NULL` to `user_permission_overrides`
- User actions must be a **subset** of the permission's defined actions
- `NULL` = all defined actions for that permission (backward compatible)
- Example: For `manage_sops` (actions: view,create,edit,delete,approve,publish,assign), a user override could be `["view","approve"]`

### 4. Permission Resolution Logic (Backend)
- Role grants permission -> user gets **all defined actions** for that permission
- User override `granted=FALSE` -> permission denied entirely
- User override `granted=TRUE, actions=NULL` -> all defined actions
- User override `granted=TRUE, actions=["view","approve"]` -> only those actions allowed

### 5. Backward Compatibility (Critical - No Breaking Changes)
- **Existing 63 `requirePermission` calls**: Unchanged - they check permission name only
- **Existing 3 `hasPermission` calls**: Unchanged - they check permission name only
- **Auth profile / login / register**: Return `permissions: string[]` (names only) + new `permission_details: Array<{name, actions}>`
- **New function**: `resolveUserPermissionDetails(userId, role)` returns objects with actions
- **New middleware**: `requirePermissionAction(permissionName, action)` for granular checks

## Implementation Tasks

### Task 1: Database Migrations
**Files**: `server/config/database.js` (migrations array)
1. `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS actions JSON DEFAULT NULL AFTER category;`
2. Backfill actions for each permission per the table in Section 2
3. `ALTER TABLE user_permission_overrides ADD COLUMN IF NOT EXISTS actions JSON DEFAULT NULL AFTER granted;`

### Task 2: Backend - New Permission Resolution Functions
**File**: `server/middleware/scope.js`
- Keep `resolveUserPermissions(userId, role)` returning `string[]` (backward compatible)
- Add `resolveUserPermissionDetails(userId, role)` returning `Array<{ name: string, actions: string[] }>`
  - For super_admin: all permissions with their full defined actions
  - For others: join role_permissions + permissions + LEFT JOIN user_permission_overrides
  - Validate user actions against permission's defined actions

### Task 3: Backend - Auth Middleware
**File**: `server/middleware/auth.js`
- Update `resolveScope` to attach BOTH:
  - `req.user.permissions` = `string[]` (from `resolveUserPermissions`) - for existing checks
  - `req.user.permission_details` = `Array<{name, actions}>` (from `resolveUserPermissionDetails`) - for new granular checks

### Task 4: Backend - Profile / Login / Register Endpoints
**File**: `server/routes/auth.js`
- Profile (line 605): Return both `permissions` (string[]) and `permission_details` (objects)
- Login (line 453): Same
- Register (line 199): Same
- My-permissions endpoint (`server/routes/roles.js` line 15): Return both

### Task 5: Backend - User Permission Routes
**File**: `server/routes/roles.js`
- `GET /users/:userId/permissions`: Return overrides with actions
- `PUT /users/:userId/permissions`: Accept `{ permission_name, granted, actions }[]`
  - Validate: `actions` must be subset of permission's defined actions
  - Store in `user_permission_overrides`

### Task 6: Backend - New Granular Permission Middleware
**File**: `server/middleware/scope.js`
- Add `requirePermissionAction(permissionName, action)` middleware
- Checks `req.user.permission_details` for the permission and verifies action is included
- Super_admin and admin bypass action checks (they get all actions)
- Used for new granular route protection (not retrofitting existing 63 calls)

### Task 7: Frontend - API Client
**File**: `client/src/services/api.js`
- User permission endpoints already exist; ensure types include `actions`

### Task 8: Frontend - AuthContext
**File**: `client/src/contexts/AuthContext.jsx`
- Store `permission_details` from login/profile response
- Keep `permissions` as `string[]` for backward compat
- Add `hasPermissionAction(permission, action)` hook:
  - Returns true if permission exists AND actions include the action
  - Super_admin always true

### Task 9: Frontend - RolesPanel UI Rewrite
**File**: `client/src/pages/management/RolesPanel.jsx`
- **Replace detail modal with inline expandable rows**:
  - Click role row -> expand below to show users in that role
  - Users displayed in nested table/list
- **User row shows**:
  - Avatar, name, email
  - Effective permissions as action chips (e.g., "SOPs: view, approve, publish")
  - "Edit" button opens permission editor
- **Permission Editor** (replaces overlay panel):
  - Permissions grouped by category
  - For each permission, render **its specific actions** as checkboxes (from permission definition)
  - "Use role defaults" toggle per permission (clears override)
  - Save sends `{ permission_name, granted: true, actions: [...] }` to backend

### Task 10: Validation & Edge Cases
- User override actions must be subset of permission's defined actions (400 if not)
- Empty actions array = deny all actions for that permission
- Super_admin always has all permissions with all defined actions (bypass override)
- Deleting role cascades to role_permissions; user_permission_overrides remain but are ignored without matching role grant

## Rollout
1. Deploy database migrations (add columns, backfill actions)
2. Deploy backend (new resolution functions, middleware, endpoints)
3. Deploy frontend (AuthContext, RolesPanel rewrite)
4. Verify: super admin expands roles, sees users, edits per-user module-specific actions
5. Verify: all existing features still work (63 route guards, 3 UI checks)

## Out of Scope
- Certificate management permissions (`manage_certificates`) are not included. The infrastructure supports adding them later by inserting a permission row with its `actions` array; no core changes required.

## Open Questions
None - all design decisions resolved.
