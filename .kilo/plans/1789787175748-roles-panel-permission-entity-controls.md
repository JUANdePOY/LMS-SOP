# Plan: RolesPanel Permission & Entity Control Enhancement

## Goal
Add role-level permission assignment (including `manage_businesses` / `manage_clients`) and per-entity (specific SOP, Course, Client, Business) permission controls directly into `RolesPanel.jsx`, keeping them grouped under their designated categories rather than in separate panels or tabs.

---

## Current State (from code inspection)

### Backend
- `permissions` table has `tasks.create_business` and `tasks.create_client` categorized under `tasks`, but **no** `manage_businesses`.
- `manage_clients` exists in `server/seed.js` but has **no `actions` JSON** defined.
- Business creation (`POST /api/businesses`) uses a hardcoded role check (`req.user.role !== 'super_admin'`), not `requirePermission`.
- Client creation (`POST /api/clients`) uses `requireAdmin`, not `requirePermission('manage_clients')`.
- `role_entity_permissions` and `entity_permission_overrides` tables + CRUD routes already exist in `server/routes/roles.js`.
- `updateRolePermissions` API exists in `client/src/services/api.js` but is **never called** from any frontend component.

### Frontend
- `RolesPanel.jsx` has **no permission assignment UI**. The Edit modal only edits role metadata (name, display name, description, active status).
- `UserEditDrawer.jsx` has entity access tabs (Course Access, SOP Access, Client Access) but imports `./roleUtils` which **does not exist** (runtime crash).
- `CATEGORY_LABELS` in `RolesPanel.jsx` is missing `businesses`, `clients`, `tasks`, `projects`, `banners`.
- `FALLBACK_ACTIONS` is missing `manage_businesses`, `manage_clients`.

---

## Step 1: Backend Permission Cleanup

### 1a. Database Migration
Create a migration that:
- Adds `actions` JSON to `manage_clients` (`["view","create","edit","delete"]`).
- Adds new `manage_businesses` permission with `category='businesses'` and `actions='["view","create","edit","delete"]'`.
- Removes or soft-deprecates `tasks.create_business` and `tasks.create_client` (keep rows but mark inactive, or delete if no dependencies).
- Assigns `manage_businesses` and `manage_clients` to `super_admin`, `admin`, and `department_head` roles in `role_permissions`.

### 1b. Seed Script Update
Update `server/seed.js`:
- Add `manage_businesses` to the permissions array.
- Add `actions` for `manage_clients` (or rely on migration to set it).
- Remove `tasks.create_business` and `tasks.create_client` from the seed array.
- Update `rolePermissions` to include `manage_businesses` for relevant roles.

### 1c. Route Middleware Updates
Update route files to use permission-based checks instead of hardcoded role checks:

| Route | Current Check | New Check |
|-------|--------------|-----------|
| `POST /api/businesses` | `req.user.role !== 'super_admin'` | `requirePermission('manage_businesses')` + `requirePermissionAction('manage_businesses', 'create')` |
| `PUT /api/businesses/:id` | `req.user.role !== 'super_admin' && req.user.role !== 'admin'` | `requirePermission('manage_businesses')` + `requirePermissionAction('manage_businesses', 'edit')` |
| `DELETE /api/businesses/:id` | `req.user.role !== 'super_admin'` | `requirePermission('manage_businesses')` + `requirePermissionAction('manage_businesses', 'delete')` |
| `POST /api/clients` | `requireAdmin` | `requirePermission('manage_clients')` + `requirePermissionAction('manage_clients', 'create')` |
| `PUT /api/clients/:id` | `requireAdmin` | `requirePermission('manage_clients')` + `requirePermissionAction('manage_clients', 'edit')` |
| `DELETE /api/clients/:id` | `requireAdmin` | `requirePermission('manage_clients')` + `requirePermissionAction('manage_clients', 'delete')` |

Keep existing business-scope and department-scope middleware; only replace the role-based access control.

---

## Step 2: Fix Missing `roleUtils.js`

Create `client/src/pages/management/roleUtils.js` containing:
- `getInitials`, `getAvatarColor` (if shared)
- `parseActions`
- `getDefinedActions`
- `buildEditorPermState`
- `CATEGORY_LABELS` (shared with RolesPanel)
- `FALLBACK_ACTIONS`
- `COURSE_ACTIONS`, `SOP_ACTIONS`, `CLIENT_ACTIONS` constants
- Any other helpers imported by `UserEditDrawer.jsx`

This fixes the runtime crash in `UserEditDrawer.jsx`.

---

## Step 3: RolesPanel.jsx — Role-Level Permission Assignment

### 3a. Add permission state and fetch logic
- Import `updateRolePermissions` from `@/services/api`.
- Add state: `rolePermissions`, `savingPermissions`, `permSearch`.
- When a role is expanded, fetch its permissions via `getRole(role.id)` (already returns `role.permissions`).

### 3b. Add permissions section in expanded role view
In the expanded `<tr>` below the users list, add a new section:

```
Permissions for this Role
├── [Search input]
├── Category: Dashboard
│   ├── view_dashboard [view]
├── Category: Users
│   ├── manage_users [view, create, edit, delete, manage_roles]
├── Category: Businesses
│   ├── manage_businesses [view, create, edit, delete]
├── Category: Clients
│   ├── manage_clients [view, create, edit, delete]
├── Category: SOPs
│   ├── manage_sops [view, create, edit, delete, approve, publish, assign]
│   └── Specific SOPs (entity controls) ← collapsible
│       ├── SOP #1 [view, edit]
│       ├── SOP #2 [view]
├── Category: Courses
│   ├── manage_courses [...]
│   └── Specific Courses (entity controls) ← collapsible
├── ...
```

Use existing UI components:
- `GrantRow` for global permissions (grant toggle + action chips)
- `EntityAccessList` (or inline version) for entity-specific controls
- `Toggle` for on/off
- `ActionChipGroup` for action selection

### 3c. Permission save logic
- On change, debounce and call `updateRolePermissions(roleName, selectedPermissionNames)`.
- For entity overrides, call `updateRoleEntityPermissions(roleName, overrides)`.
- Show saving state.

---

## Step 4: RolesPanel.jsx — Entity-Level Permissions in Expanded View

### 4a. Entity data fetching
- When a role is expanded, also fetch:
  - Entity lists: `GET /api/roles/entities?type=sop`, `type=course`, `type=client`, `type=business`
  - Existing role entity overrides: `GET /api/roles/:roleName/entity-permissions`

### 4b. Inline entity controls under each category
For categories that support entities (sops, courses, clients, businesses), add a collapsible **"Specific access"** sub-section inside the category block.

Each entity row shows:
- Entity name + ID
- Grant toggle (on/off)
- When granted, action chips (view, create, edit, delete, etc.) based on the permission's defined actions

Pattern follows `EntityAccessList` from `UserEditDrawer.jsx`, but inline without tabs.

### 4c. Save behavior
- Entity overrides are saved per-category or all at once via `updateRoleEntityPermissions(roleName, allOverrides)`.
- Debounce saves to avoid excessive API calls.

---

## Step 5: RolesPanel.jsx — Category Labels & Fallback Actions

Update the existing constants in `RolesPanel.jsx`:

```javascript
const CATEGORY_LABELS = {
  // existing...
  businesses: 'Businesses',
  clients: 'Clients',
  tasks: 'Tasks',
  projects: 'Projects',
  banners: 'Banners',
};

const FALLBACK_ACTIONS = {
  // existing...
  manage_businesses: ['view', 'create', 'edit', 'delete'],
  manage_clients: ['view', 'create', 'edit', 'delete'],
  // keep existing tasks.create_* removed or empty
};
```

---

## Step 6: Validation & Edge Cases

### Data Integrity
- Ensure migration does not break existing role_permissions for `tasks.create_business` / `tasks.create_client`.
- If old permissions are kept (inactive), ensure they don't appear in the UI.

### Permission Resolution
- `requirePermission` middleware checks `req.user.permissions` array. Confirm that `resolveUserPermissions` correctly includes `manage_businesses` / `manage_clients` when assigned.
- `requirePermissionAction` uses `permission_details` which is resolved lazily. Confirm business/client routes work with this.

### UI State Management
- Expanded role data grows (users, perms, entity overrides, entity lists). Keep it in `expandedRoleData` keyed by `role.name`.
- Debounce permission and entity override saves (300-500ms).
- Handle loading/error states for each async fetch.

### Security
- All new endpoints already require `requireSuperAdmin`.
- Frontend must still enforce super-admin check (already done via `isSuperAdmin`).

---

## Open Questions / Decisions Needed

1. **Role edit modal scope**: Should the Edit modal remain metadata-only, or should we add a "Permissions" tab inside it? **Recommendation**: Keep the Edit modal for metadata only; do all permission editing in the expanded role view. This avoids splitting the UX across two places and keeps "role management" in one expandable panel.

2. **Deprecation of `tasks.create_business` / `tasks.create_client`**: Should we delete them from the DB, or keep them as inactive for backward compatibility? **Recommendation**: Keep them but set `is_active = FALSE` and add a comment in the migration. Any code still referencing them will gracefully fall through to inactive.

3. **Entity controls placement**: In the expanded role view, should entity controls be nested under their category header (e.g., under "SOPs"), or in a separate "Entity Access" section below all categories? **Recommendation**: Nest them under their category header, collapsible, so they stay in their "designated area" as requested.

4. **Granularity of entity actions**: Should `manage_businesses` and `manage_clients` support per-entity overrides like SOPs and Courses do? **Recommendation**: Yes, for consistency. The backend tables already support any entity type.

---

## Files to Modify

| File | Change |
|------|--------|
| `server/config/database.js` (or new migration file) | Add `manage_businesses` permission, update `manage_clients` actions, update role_permissions |
| `server/seed.js` | Add `manage_businesses`, update/remove task permissions, update role assignments |
| `server/routes/businesses.js` | Replace hardcoded role checks with `requirePermission` + `requirePermissionAction` |
| `server/routes/clients.js` | Replace `requireAdmin` with `requirePermission` + `requirePermissionAction` |
| `client/src/pages/management/RolesPanel.jsx` | Add role permission matrix, entity controls, update constants |
| `client/src/pages/management/roleUtils.js` | Create missing file with shared helpers |
| `client/src/services/api.js` | No change needed (endpoints already exist) |

---

## Rollout / Migration Path

1. Run database migration on dev/staging first.
2. Verify `manage_businesses` and `manage_clients` appear in RolesPanel with correct actions.
3. Test business/client creation with users who have only the new permissions (not super_admin).
4. Test entity-level overrides for SOPs, Courses, Clients, Businesses.
5. Verify `UserEditDrawer` no longer crashes (roleUtils.js created).

---

## Risk: Production Readiness Check

Before declaring done:
- `npm run build` must succeed with zero errors.
- `UserEditDrawer` must not crash (roleUtils.js).
- No `TODO`, `FIXME`, `console.log`, or placeholder logic in production files.
- All entity/permission fetches must have loading and empty states.
