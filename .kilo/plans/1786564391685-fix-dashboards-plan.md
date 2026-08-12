# Plan: Fix Admin & Employee Dashboards

## Root Causes Found

1. **500 on `/api/sops/acknowledgements/my`**: `sopController.js` line 538 calls `sopAcknowledgementService.listAcknowledgementsByUser(...)`, but the service exports `listUserAcknowledgements`. The function does not exist on the service object, so the call throws `TypeError: ...listAcknowledgementsByUser is not a function`, which becomes a 500.

2. **`sopStats.find is not a function`** (admin dashboard): The `getSopStats()` response is wrapped in `{ success, data }`. The old hook accessed `res.data` directly instead of unwrapping the inner `data` field, so `sopStats` ended up as the wrapper object rather than the array.

3. **`myTasks.filter is not a function`** (employee dashboard): The `getMyTasks()` response returns `{ success, data: { rows: [...] } }`. The old hook did not extract `rows`, so `myTasks` was an object instead of an array.

## Required Changes

### 1. Fix backend controller (`server/controllers/sopController.js`)
- Line 538: change `sopAcknowledgementService.listAcknowledgementsByUser(req.user.id)` to `sopAcknowledgementService.listUserAcknowledgements(req.user.id)`

### 2. Verify frontend hooks are robust
- `client/src/pages/hooks/useAdminDashboard.js` already has an `unwrap()` helper that handles both `{ success, data }` and `{ status, data }` response shapes, plus `ensureArray()` guards. No further changes needed.
- `client/src/features/employee/hooks/useEmployeeTrainingDashboard.js` already uses the same `unwrap()` + `ensureArray()` pattern and extracts `rows` from the `getMyTasks` response. No further changes needed.

### 3. Restart backend
- After editing `sopController.js`, restart the Node server so the route/controller change is loaded.

### 4. Smoke-test
- Admin dashboard: confirm stat cards render without `find is not a function` and announcements/events load.
- Employee dashboard: confirm SOP highlights, task counts, and announcements load without `filter is not a function` and no 500 on `/api/sops/acknowledgements/my`.
