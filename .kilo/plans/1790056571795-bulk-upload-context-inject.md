# Task Bulk Upload Context-Aware Refactor

## Goal
Move the bulk-upload trigger from the global TasksPage header into each business row in the hierarchy list. When triggered from a business row, auto-inject that row's client, business, and departments into every uploaded task. Clear `assigned_users` so they can be edited later in the task table. Remove client/business/assignment inputs from the modal UI.

## Key Decisions
- **Trigger location**: Beside the existing "Add task" button inside each business row's expanded children in `TaskHierarchyTable.jsx`. Only visible when `canManage` is true.
- **Auto-populated fields**: `client_id`, `client_business_id`, and `assigned_departments` are injected from the clicked business row. `assigned_users` is forced to empty.
- **Backend mechanism**: Frontend sends context as additional `FormData` fields (`client_id`, `client_business_id`, `assigned_departments`). Backend applies them as row-level overrides during validation and creation. File columns for client/business remain optional.
- **Modal location**: State remains in `TasksPage.jsx`; callbacks are threaded through `ProjectTaskViews` → `TaskHierarchyTable`.

## Frontend Changes

### 1. `TaskBulkUploadModal.jsx`
- Add props: `businessId`, `businessName`, `clientId`, `clientName`, `departments`
- In `handleImport`, build a `context` object from these props and pass it to `bulkUploadTasks(file, format, context)`
- In `parsePreview`, auto-inject `client_id`, `client_business_id`, and `assigned_departments` into preview rows so the preview reflects what will actually be imported
- Remove **Client** and **Business** columns from the preview table
- Show **Departments** column populated with the auto-injected departments
- Clear `assigned_users` in the preview

### 2. `services/taskService.js` (frontend)
- Update `bulkUploadTasks(file, format)` to `bulkUploadTasks(file, format, context = {})`
- Append `client_id`, `client_business_id`, and `assigned_departments` (JSON-stringified array) to `FormData` when present in context

### 3. `TaskHierarchyTable.jsx`
- Import `Upload` icon from `lucide-react`
- Accept new prop: `onOpenBulkUpload`
- Inside each business row's expanded children, beside the "Add task" button, add a "Bulk Upload" button
- On click, call `onOpenBulkUpload` with `{ businessId, businessName, clientId, clientName, departments }`
- `departments` comes from `businessDepartments[String(business.id)]` (already loaded in the table)

### 4. `ProjectTaskViews.jsx`
- Accept new prop: `onOpenBulkUpload`
- Pass it through to `TaskHierarchyTable`

### 5. `TasksPage.jsx`
- Remove `showBulkUpload` state
- Remove header "Bulk Upload" button (lines 816-820)
- Remove `TaskBulkUploadModal` instance from this file
- Add `bulkUploadContext` state and `setBulkUploadContext`
- Add `handleOpenBulkUpload = (ctx) => { setBulkUploadContext(ctx); setShowBulkUpload(true); }`
- Pass `onOpenBulkUpload={handleOpenBulkUpload}` to `ProjectTaskViews`
- Render `TaskBulkUploadModal` at the page level with `businessId={bulkUploadContext?.businessId}` etc.

## Backend Changes

### 1. `controllers/taskController.js`
- Read optional overrides from `req.body`: `client_id`, `client_business_id`, `assigned_departments`
- Pass overrides to `validateRows(rawRows, req.user.id, overrides)`
- Pass overrides to `taskService.bulkCreateTasks(valid, req.user.id, overrides)`

### 2. `utils/taskBulkValidation.js`
- Update `validateRows(rows, actorId, overrides = {})`
- When `overrides.client_id` and `overrides.client_business_id` are present, skip `resolveClientBusiness` and use override values directly
- When `overrides.assigned_departments` is present, replace `assigned_departments` in the payload with the override array
- Clear `assigned_users` from the payload (set to `[]` or remove key)

### 3. `services/taskService.js` (backend)
- Update `bulkCreateTasks(rows, actorId, overrides = {})`
- Apply overrides to each row's payload before INSERT:
  - `payload.client_id = overrides.client_id ?? payload.client_id`
  - `payload.client_business_id = overrides.client_business_id ?? payload.client_business_id`
  - `payload.assigned_departments = overrides.assigned_departments ?? payload.assigned_departments`
  - `payload.assigned_users = []` (force empty)

## Validation & Edge Cases
- If `departments` array is empty, `assigned_departments` override is not sent; backend falls back to file data (which will be empty since user didn't upload assignments)
- Backend still validates scope: `assertClientScopeForTaskCreate` runs for department_head actors
- All-or-nothing behavior preserved: any invalid row rolls back the entire transaction
- 25 MB / 50k row limits preserved (multer config unchanged)
- No notifications added (toast behavior unchanged)

## Rollout Order
1. Backend: `taskBulkValidation.js` + `taskService.js` (backend) + `taskController.js`
2. Frontend: `services/taskService.js` (frontend)
3. Frontend: `TaskBulkUploadModal.jsx`
4. Frontend: `TaskHierarchyTable.jsx` + `ProjectTaskViews.jsx`
5. Frontend: `TasksPage.jsx`
6. Build + lint + manual test
