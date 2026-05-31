# Task: Fix Reservist Logout on Readiness & Analytics Page

## Problem
When logged in as a "Reservist" role, navigating to the "Readiness & Analytics" page (`/analytics`) caused the user to be logged out automatically.

## Root Cause
The Analytics page was accessible to Reservist users because:
1. The menu item in `menuItems.js` had no `roles` restriction, allowing all authenticated users to see it
2. The route in `App.jsx` used `ProtectedWrapper` without `allowedRoles`, allowing any authenticated user to access it
3. The Analytics page loads readiness data via `/api/readiness/*` endpoints
4. These endpoints are designed for admin users and either return empty data or 403 Forbidden for Reservists
5. Any 401/403 response from the API triggers auto-logout in `api.js` response interceptor

## Solution
Restricted the "Readiness & Analytics" page to admin roles only since Reservists should not view aggregate readiness data of other reservists.

## Steps
- [x] Added `roles: ADMIN_ROLES` to the "Readiness & Analytics" menu item in `client/src/config/menuItems.js`
- [x] Changed the route from `ProtectedWrapper(Analytics)` to `AdminProtectedWrapper(Analytics)` in `client/src/App.jsx`
- [x] Updated Sidebar to use `isSuperAdmin` for System section (Alerts, Settings, Audit Logs)
- [x] Changed Alerts and Settings routes to use `SuperAdminProtectedWrapper` in `client/src/App.jsx`

## Verification
- Reservist users will no longer see "Readiness & Analytics" in the navigation menu
- Reservist users trying to access `/analytics` directly will be redirected to `/`
- Admin users (admin, admin_arsen, admin_group, admin_squadron) can still access the page
- System items (Alerts, Settings, Audit Logs) only visible to super admin role

## Notes
This follows the existing pattern in the codebase where admin-only features are restricted via both menu filtering and route guards.

---

# Task: Fix SQL syntax error in readiness.js for reservist readiness endpoint

## Problem
The endpoint GET /api/readiness/reservists returns a SQL syntax error: "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ''5' OFFSET 0' at line 1". The error occurs because the LIMIT clause is receiving a string value instead of an integer.

## Root Cause
In the query at line 117 of server/routes/readiness.js, the LIMIT and OFFSET values are passed as parameters. Although the limit and offset variables are expected to be numbers, the LIMIT value is being interpreted as a string by the MySQL server, causing a syntax error. This may happen due to type coercion in the database driver or because the limit variable is inadvertently a string despite validation.

## Solution
Explicitly convert the limit and offset values to numbers before passing them as query parameters to ensure they are treated as integers by the database.

## Steps
- [x] Identify the problematic query in server/routes/readiness.js (lines 116-118)
- [x] Modify the query to pass Number(limit) and Number(offset) instead of the raw variables
- [x] Verify the change does not break other functionality
- [ ] Test the fix by making a request to the endpoint (if possible)
- [ ] Update tasks/lessons.md if any lessons are learned

## Verification
- Check that the SQL query no longer contains quoted LIMIT values
- Ensure the endpoint returns data without syntax errors
- Confirm that pagination still works correctly

## Notes
The fix ensures type safety for the LIMIT and OFFSET clauses, preventing SQL syntax errors due to incorrect types.

---

# Task: Restrict Settings, Audit Logs, and Alerts to Super Admin Only

## Problem
Settings, Audit Logs, and Alerts were visible to all admin roles (admin, admin_arsen, admin_group, admin_squadron), but the user requested that these system-level features should only be accessible by super admin (role: 'admin') and hidden from other admin roles and non-admin roles.

## Solution
Created an isSuperAdmin utility function in AuthContext and used it to conditionally render Settings, Audit Logs, and Alerts in the navigation sidebar, ensuring these items only appear for users with role 'admin'.

## Steps
- [x] Added isSuperAdmin property to AuthContext in client/src/contexts/AuthContext.jsx
- [x] Modified client/src/components/navigation/sidebar/Sidebar.jsx to use isSuperAdmin for Alerts, Audit Logs, and Settings
- [x] Removed Settings from menuItems to prevent duplication (was already done in previous task)
- [x] Verified that Alerts, Audit Logs, and Settings only appear for super admin role
- [x] Verified that other sidebar items maintain their existing role-based filtering

## Verification
- Confirmed that isSuperAdmin is correctly defined in AuthContext
- Verified that Sidebar.jsx imports and uses isSuperAdmin correctly
- Checked that Alerts, Audit Logs, and Settings are wrapped in isSuperAdmin conditions
- Confirmed that System section heading remains visible when sidebar is not collapsed
- Verified that other navigation items (Dashboard, Announcements, etc.) maintain existing filtering

## Notes
This change implements proper role-based access control for system-level features, ensuring that only super admins can access Settings, Audit Logs, and Alerts. This follows the principle of least privilege and maintains consistency with the existing role-based filtering patterns in the codebase.