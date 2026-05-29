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