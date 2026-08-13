# Department Head Sidebar — Final RBAC Alignment

## Context
The department head (`department_head`) sidebar in `client/src/shared/components/navigation/sidebar/Sidebar.jsx` (`MENU_ITEMS`, lines 72-137) is filtered by hardcoded `roles` arrays via `filterMenuByRole`. Previous edits already excluded Events, Settings (Users/Roles), and Audit Logs for department head, and included Course Management, Quizzes, Certificates, Tasks & Projects, Announcements, Dashboard, and Messaging.

Open contradiction resolved with user: SOP Management should show **Dashboard + the SOP "Files" sub** (the SOP document management screen at `/sops`, gated by `manage_sops`, which department head holds), but **NOT** Businesses / Departments / Categories. The "Files" in the earlier NOT-list was a typo.

## Required department head sidebar

**Visible:**
- Dashboard (`/`)
- SOP Management → sub: Dashboard + **Files** (NOT Businesses, Departments, Categories)
- Course Management (`/courses`)
- Course Library (`/courses/library`)
- Quizzes (`/assessments`) → Manage + Leaderboard (NOT Integrity)
- Certificates (`/certificates`)
- Messaging (`/messaging`)
- Announcements (`/announcements`)
- Tasks & Projects (`/tasks`)
- Settings (`/employee/settings`) — employee-style, no Users/Roles

**Hidden:**
- Events (`/events`) — super_admin/admin only
- Settings (`/settings`) with Users/Roles — super_admin only
- Audit Logs (`/audit-logs`) — super_admin only

> Data scope (department-only) is enforced server-side via `scopedDepartmentIds`; the sidebar only controls nav-item visibility.

## Change
File: `client/src/shared/components/navigation/sidebar/Sidebar.jsx`

- Line 92, SOP Management `sub` "Files": change `roles: ['super_admin', 'admin']` → `roles: ['super_admin', 'admin', 'department_head']`.

No other edits required; all other role arrays already match the target.

## Validation
1. `cd client; npm run build` — must succeed with zero errors.
2. Manual: log in as the seeded department head (`mike.r@organization.com`) and confirm sidebar shows exactly the items above and hides Events, the `/settings` (Users/Roles) entry, and Audit Logs. Confirm SOP Management expands to Dashboard + Files only.
3. Confirm the SOP "Files" sub routes to `/sops` and that department-only data scoping still applies (server-side).
