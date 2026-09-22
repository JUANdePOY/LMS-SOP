# Task Bulk Upload Plan

## Goal
Add a bulk-upload flow for tasks in `TasksPage.jsx` that supports CSV, XLSX, and JSON files, validates every row on the server, and imports all-or-nothing.

## Decisions
- Formats: CSV + XLSX + JSON
- Behavior: all-or-nothing; if any row is invalid, nothing is created
- Limits: 50,000 rows / 25 MB per file
- Required fields: title only
- Assignments: user + department **names** resolved server-side
- Scope: required per row (client + business); project optional
- Duplicates: reject rows whose title already exists
- Headers: support snake_case and human-readable aliases
- Dates: accept human-readable strings and normalize to MySQL DATETIME
- Notifications: disabled for bulk-created tasks
- Flow: client preview then server import (all-or-nothing)

## Frontend Changes
1. `client/src/features/task-management/components/TaskBulkUploadModal.jsx`
   - New modal reusing `Modal` and `Button`
   - Steps: upload/paste -> preview -> import
   - Parse CSV/XLSX via `xlsx`; JSON via `JSON.parse`
   - Normalize headers to snake_case aliases
   - Send `FormData(file, format)` to `/api/tasks/bulk-upload`
   - Display server-returned valid/invalid row summary
2. `client/src/features/task-management/pages/TasksPage.jsx`
   - Add `showBulkUpload` state + "Bulk Upload" button in header when `canManageTasks`
   - Render `TaskBulkUploadModal` and call `refreshTasks` / `refreshStats` on success
3. `client/src/features/task-management/services/taskService.js`
   - Add `bulkUploadTasks(file, format)` returning server response

## Backend Changes
1. `server/routes/tasks.js`
   - Add `POST /bulk-upload` with `authenticateToken`, `requirePermissionAction('manage_tasks', 'create')`, and `multer` memory storage (`file`, 25 MB, `.csv/.xlsx/.xls/.json`)
2. `server/controllers/taskController.js`
   - Add `bulkUploadTasks(req, res)`:
     - Parse file by format
     - Normalize headers
     - Validate rows (title required, dates parseable, scope resolvable, assignments resolvable, duplicate title check)
     - If invalid: `400` with `{ success: false, data: { summary, invalid } }`
     - If valid: call `taskService.bulkCreateTasks(rows, req.user.id)` inside a transaction
     - Log `task.bulk_upload`
     - Return `{ success: true, data: { imported, summary } }`
3. `server/services/taskService.js`
   - Add `bulkCreateTasks(rows, actorId)`:
     - Preload users and departments for name resolution
     - Enforce assignment scope via `validateAssignmentScope`
     - Enforce client scope via `assertClientScopeForTaskCreate`
     - Insert tasks + assignments in a single DB transaction
     - Skip notifications / due reminders
     - Return `{ imported, errors }`
4. New parser/validator helpers (can live in `server/utils/taskBulkValidation.js`):
   - `normalizeRow(rawRow)`
   - `resolveClientBusiness(client_id, business_id, client_name, business_name)`
   - `resolveAssignmentNames(assignments)`
   - `parseHumanDate(value)`

## Database
- No schema changes required
- Uses existing `tasks`, `task_assignments`, `audit_logs` tables
- Bulk insert must use parameterized queries with placeholders; keep transaction short

## Security / Auth
- Route: `manage_tasks` + `create` action
- Department heads: scope enforced by existing `assertClientScopeForTaskCreate`
- Admins/super_admins: business scope enforced by existing scoping logic inside creation helpers
- Assignment scope enforced per row via `validateAssignmentScope`

## Failure Modes
- File too large / wrong type: rejected by multer before parsing
- Invalid headers / unreadable file: `400` with parse error
- Row validation failure: `400` with per-row errors; zero rows created
- DB error mid-transaction: rollback, `500`, no partial data
- Name lookups for users/departments cache within request; unknown names become row errors

## Validation
- Manual: upload valid CSV/XLSX/JSON, invalid rows, wrong permissions
- Confirm all-or-nothing behavior on DB failure
- Verify `refreshTasks` updates UI after successful import
- Verify no push notifications are sent for bulk-created tasks

## Open Questions
- None; ready for implementation
