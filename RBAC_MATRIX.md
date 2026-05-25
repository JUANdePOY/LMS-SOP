# PAFR Role-Based Access Control (RBAC) Matrix

**Current Roles** (from `users.role` ENUM and `roles` table):
- `admin` – Super Administrator (full system access)
- `admin_arsen` – ARCEN / Area Administrator (scoped to one or more ARCENs)
- `admin_group` – Group Administrator (scoped to groups under their ARCEN)
- `admin_squadron` – Squadron Administrator (scoped to squadrons under their group)
- `reservist` – Regular reservist / end user (limited self-service)

**Scope Columns** (on `users` table):
- `scope_arsen_id`
- `scope_group_id`
- `scope_squadron_id`

These are mutually exclusive per user (only one scope level is set for unit admins).

---

## Recommended Permissions Matrix

### Page / Route Access

| Page / Feature                  | admin | admin_arsen | admin_group | admin_squadron | reservist          | Notes |
|--------------------------------|-------|-------------|-------------|----------------|--------------------|-------|
| **Dashboard**                  | Full  | Scoped view | Scoped view | Scoped view    | Personal stats only | Show aggregated data within scope |
| **Reservists** (list, view, create, edit) | Full CRUD | CRUD within scope | CRUD within scope | CRUD within scope | Read own profile only | Reservists cannot see list |
| **Reservists** (delete, bulk import/export) | Yes | Yes (scoped) | Yes (scoped) | Yes (scoped) | No | High-privilege actions |
| **Trainings & Activities**     | Full manage | Scoped | Scoped | Scoped | View enrolled + own history | Instructors can be any admin |
| **Attendance** (scans, records) | Full | Scoped | Scoped | Scoped | View own records | Facilitator scanning allowed for unit admins |
| **Airbase / ARCENs / Groups / Squadrons** | Full CRUD | View + manage own + children | View + manage own + children | View + manage own only | Hidden | Hierarchy management |
| **Logistics & Supplies**       | Full | Scoped | Scoped | Scoped | Hidden | Inventory, issuances, returns |
| **Reports**                    | All reports | Scoped reports | Scoped reports | Scoped reports | Limited (own data) | PDF/Excel exports respect scope |
| **Analytics / Readiness**      | Full | Scoped | Scoped | Scoped | Personal readiness | Charts filtered by scope |
| **Alerts & Announcements**     | Create any target | Create for scope | Create for scope | Create for scope | View only (targeted) | Already partially scoped in alerts.js |
| **Audit Logs**                 | Read-only | No access | No access | No access | No access | Super-admin only (current) |
| **Settings & User Management** | Full (roles, scopes, activate) | No | No | No | No | Only `admin` can change roles/scopes |
| **My Profile / Self-Service**  | — | — | — | — | Full access to own data | Future: edit contact info, view assignments |

### Data Scoping Rules (Backend Enforcement)

- `admin` sees **everything** (no filters added).
- `admin_arsen` sees only records whose ARCEN / area matches `scope_arsen_id`.
- `admin_group` sees only records under their `scope_group_id` (and its squadrons).
- `admin_squadron` sees only records under their `scope_squadron_id`.
- `reservist` can only access their own `reservists` row (via `user_id` linkage) and related personal data (trainings they are participants of, own attendance, own issuances).

**Important**: Most list endpoints currently do **not** automatically apply scope filters for unit admins. They accept `group_id`, `squadron_id` query params but do not enforce the user's own scope. This must be added for security.

### Action-Level Privileges

| Action                    | admin | admin_* (unit) | reservist |
|---------------------------|-------|----------------|-----------|
| Create / Edit / Delete users | Yes (any role + scope) | No | No |
| Change user roles / scopes | Yes | No | No |
| View Audit Logs | Yes | No | No |
| Create system-wide Alerts | Yes | Scoped only | No |
| Export all data (CSV/Excel) | Yes | Yes (own scope only) | No |
| Perform barcode attendance scans | Yes | Yes (within scope) | No (unless assigned as facilitator) |
| View other reservists' PII | Yes | Yes (scoped) | No |

### Menu Visibility (Frontend Sidebar)

- All 5 roles see: Dashboard, Trainings, Attendance, Analytics, Reports (with appropriate data).
- Reservists should **not** see: Airbase hierarchy management, Logistics, Settings, Audit Logs.
- Unit admins should see Airbase sub-pages but only actions allowed by their level.
- "Settings" and "Audit Logs" links should be hidden unless `role === 'admin'`.

---

## Current Implementation Gaps (as of 2026-05-22)

### ✅ Implemented (this session)

1. **Frontend route protection** (`App.jsx` + `ProtectedRoute.jsx`):
   - Settings and Audit Logs restricted to `admin` (super admin) only.
   - Reservists, Logistics, Airbase routes restricted to all admin roles.
   - Dashboard, Trainings, Attendance, Analytics, Reports, Alerts open to all authenticated users.

2. **Data scoping middleware** (`server/middleware/rbac.js`):
   - `getUserScopeFilter()` enhanced with configurable column names.
   - `enforceScope()` middleware factory added.
   - Applied to: `reservists.js` (list + single + export), `dashboard.js` (all queries), `readiness.js` (all list endpoints), `arsents.js`, `groups.js`, `squadron.js`, `hierarchy.js`.
   - Alerts already had scope filtering (unchanged).

3. **Sidebar menu** (`menuItems.js` + `Sidebar.jsx`):
   - Role-based filtering via `filterMenuByRole()` already working.
   - Settings and Audit Logs hidden unless `role === 'admin'`.
   - Reservists, Airbase, Logistics hidden for reservist role.

4. **Unit admin write access**:
   - Changed from `authorize('admin')` (super admin only) to `requireAdmin` (any admin role) in:
     - `trainings.js`, `reports.js`, `supplies.js`, `issuances.js`, `assignments.js`, `attendance.js` (facilitator management).

5. **Audit logs restricted to super admin**:
   - Changed from `requireAdmin` to `requireSuperAdmin` in `audit-logs.js`.

6. **Reservist self-service API endpoints**:
   - `GET /api/reservists/my/profile` — own profile
   - `GET /api/reservists/my/trainings` — own training history
   - `GET /api/reservists/my/attendance` — own attendance records
   - `GET /api/reservists/my/readiness` — own readiness score

7. **Frontend UI role guards**:
   - Trainings page: `isAdmin` → `isAnyAdmin` for create/edit/delete buttons.
   - Reports page: `isAdmin` → `isAnyAdmin` for create/edit/delete buttons.
   - Alerts page: create button already gated on `isAnyAdmin`.
   - `isReservist` helper added to `AuthContext`.

### Remaining Gaps

1. **Reservist self-service UI**: No dedicated "My Profile / My Trainings / My Attendance" frontend page for `reservist` role (API endpoints exist, UI not built).
2. **No granular per-feature permissions table**: The planned `/api/settings/permissions` endpoint does not exist (optional per matrix).
3. **Trainings list endpoint**: Read routes use `optionalAuthenticateToken` — no scope filtering on training reads (trainings are not scoped to a specific unit, they are system-wide with participant scoping).

---

## Recommended Next Steps (Implementation Order)

1. **Approve this matrix** (or provide adjustments).
2. Update `ProtectedRoute` and `App.jsx` to protect pages per the matrix (use arrays like `['admin', 'admin_arsen', 'admin_group', 'admin_squadron']` or helper `isAnyAdmin`).
3. Add role-based menu filtering in `Sidebar.jsx` (hide items based on `useAuth().user.role`).
4. Create a reusable `applyScopeFilter(req, baseWhere, params)` helper in middleware or utils.
5. Retrofit existing list endpoints (reservists, trainings, attendance, supplies, reports, airbase entities) to call the scope helper when `req.user.role !== 'admin'`.
6. Build a minimal "My Profile" dashboard for reservists (reuse existing components with role guards).
7. (Optional) Add a `permissions` table + UI in Settings for future fine-grained toggles (beyond role+scope).

---

## Quick Reference – Role Creation Rules (already in `settings.js`)

- `admin` → no scope required (full access)
- `admin_arsen` → **must** provide `scope_arsen_id`
- `admin_group` → **must** provide `scope_group_id`
- `admin_squadron` → **must** provide `scope_squadron_id`
- `reservist` → no scope (personal data only)

---

**Document owner**: PAFR development team  
**Last updated**: 2026-05-22  
**Status**: Implemented — core RBAC wiring complete (2026-05-22)

If this matrix looks good, reply with "Implement RBAC matrix" (or specify changes) and I will start wiring the route guards, menu visibility, and scope enforcement.
