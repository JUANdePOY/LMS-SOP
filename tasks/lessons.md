## 2026-05-26 - Fix Attachment View Button Error

**Context**: The "View" button for attachments in TrainingDetailsModal was failing with a 501 Not Implemented error when clicked, causing an unhandled promise rejection.

**Mistake**: Assuming that the downloadInternalAttachment service function would handle errors internally and return a consistent response format like other functions in the service.

**Pattern**: Service functions should always return a standardized response object with success/error handling, and components should check the result before using returned data.

**Action**: Always verify that service functions return consistent response objects and handle both success and error cases in components before proceeding with data usage.

## 2026-05-29 - Fix SQL syntax error in readiness.js

**Context**: The endpoint GET /api/readiness/reservists was throwing a SQL syntax error due to the LIMIT clause receiving a string value instead of an integer.

**Mistake**: Assuming that the limit and offset variables, despite being validated by express-validator, would always be passed as numbers to the SQL query without additional type conversion.

**Pattern**: When using variables in SQL LIMIT and OFFSET clauses, explicitly convert them to numbers to prevent type-related syntax errors, even if they have been validated elsewhere.

**Action**: Always explicitly convert numeric values to numbers using Number() or parseInt() when passing them as parameters for LIMIT and OFFSET in SQL queries.

## 2026-05-29 - Remove redundant navigation item

**Context**: While working on the navigation sidebar, I noticed the Settings item appeared twice - once from menuItems and once hardcoded in the System section.

**Mistake**: Duplicating navigation items that are already defined in the centralized menuItems configuration.

**Pattern**: Centralize navigation configuration in a single source of truth (like menuItems array) and avoid hardcoding duplicate items.

**Action**: Always check if an item exists in the centralized navigation configuration before adding it manually to prevent duplication and ensure consistent role-based filtering.

## 2026-05-29 - Move Settings to System section

**Context**: After removing the redundant Settings item, the user requested to place Settings at the bottom of the System section in the sidebar for better organization.

**Mistake**: Assuming that keeping Settings in the main navigation section (via menuItems) was the optimal placement for user experience.

**Pattern**: System-related navigation items (Alerts, Audit Logs, Settings) should be grouped together in the System section for logical organization and consistency.

**Action**: Move Settings from the main navigation menu to the System section, remove it from menuItems to prevent duplication, and apply appropriate role-based filtering (ADMIN_ROLES) to maintain access control.

## 2026-05-29 - Restrict Settings, Audit Logs, and Alerts to Super Admin Only

**Context**: The user requested that Settings, Audit Logs, and Alerts should only be accessible by super admin (role: 'admin') and hidden from other admin roles (admin_arsen, admin_group, admin_squadron) and non-admin roles.

**Mistake**: Assuming that all admin roles should have access to system-level features like Settings, Audit Logs, and Alerts.

**Pattern**: System-level features that affect the entire application should be restricted to super admins only, while allowing more granular permissions for other administrative functions.

**Action**: Created isSuperAdmin utility function in AuthContext and used it to conditionally render Settings, Audit Logs, and Alerts in the navigation sidebar, ensuring these items only appear for users with role 'admin'.
