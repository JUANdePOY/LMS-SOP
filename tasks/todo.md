# Alert Notification Fix for Admin Roles

## objective
Fix the issue where Admin, Admin_arsen, Admin_group, and Admin_Squadron users cannot receive training assignment and registration notifications.

## root cause
In /server/routes/alerts.js line 583, personal training alerts are only fetched for reservist users due to conditional logic.

## implementation steps
- [x] Make code change to fetch personal training alerts for all users
- [x] Verify the fix by reviewing the logic flow

## validation
- [x] Code review for correctness
- [ ] No lint/type errors (no test command configured)

## review
**What was done**: Changed line 583 in `/server/routes/alerts.js` from conditionally fetching personal training alerts only for reservists to always fetching them for all users.

**Validation performed**: Code review - the logic now correctly fetches personal training alerts for all user roles, since the `getPersonalTrainingAlerts` function already filters by user ID via the `user_alerts` table.

**Caveats**: No automated tests available to run. Manual testing required to verify the fix works as expected.