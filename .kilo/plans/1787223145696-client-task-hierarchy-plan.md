# Client Management + Task Hierarchy (Main/Sub-Task) Plan

## Context
The `task-management` module currently lets admins create flat tasks. We need to:
1. Add a **Client** sub-tab (admin + department head) to CRUD clients, where each client has a unique name and a list of unique business names.
2. Extend `TaskForm` with **Business** (from BusinessPage), **Client Name** (dropdown of clients), and **Client Business** (dropdown filtered by selected client).
3. Remove the **Plus icon in the task table header**.
4. Introduce a **Main Task / Sub-Task hierarchy**: main tasks render as parents with a plus button to create inline sub-tasks; sub-tasks nest under their parent and inherit the parent's Client/Business. A main task's progress auto-computes as the **average of its direct sub-tasks' progress** (read-only when it has sub-tasks).

Confirmed decisions: Client Businesses = free-text per client; Client tab = in-page tab on Tasks page; parent progress = average of **direct** sub-tasks.

---

## 1. Database changes (MySQL migrations + sql file)
Add to `server/migrations/taskManagement.js` and `server/sql/taskManagement.sql`:

- New tables:
  - `clients` — `id PK`, `client_name VARCHAR(255) NOT NULL UNIQUE`, `created_by INT`, `created_at`, `updated_at`, FK `created_by -> users(id)`.
  - `client_businesses` — `id PK`, `client_id INT NOT NULL`, `business_name VARCHAR(255) NOT NULL`, `created_at`, `updated_at`, FK `client_id -> clients(id) ON DELETE CASCADE`, **UNIQUE KEY (client_id, business_name)**.
- Alter `tasks`:
  - `parent_task_id INT NULL` + FK `tasks(parent_task_id) -> tasks(id) ON DELETE CASCADE`.
  - `client_id INT NULL` + FK `clients(id) ON DELETE SET NULL`.
  - `client_business_id INT NULL` + FK `client_businesses(id) ON DELETE SET NULL`.
  - `business_id INT NULL` + FK `businesses(id) ON DELETE SET NULL`.
  - Indexes: `idx_tasks_parent (parent_task_id)`, `idx_tasks_client (client_id)`, `idx_tasks_business (business_id)`.

## 2. Backend — Clients CRUD
- `server/models/clientModel.js` (new): `createClient({client_name, businesses[], created_by})` (transaction: insert client, insert businesses), `listClients()` (with businesses joined), `getClient(id)`, `updateClient(id, {client_name, businesses[]})` (replace businesses in transaction), `deleteClient(id)` (cascade via FK), `listClientOptions()` for dropdowns.
- `server/validators/clientValidator.js` (new): `client_name` required, 1–255 chars, enforce uniqueness (DB unique key + catch duplicate error → 409). Business names: array of non-empty strings, each ≤255, uniqueness enforced by `(client_id, business_name)`.
- `server/controllers/clientController.js` (new): list/create/update/delete + options.
- `server/routes/clients.js` (new): register under `/api/clients`. Middleware = `authenticateToken` + custom `requireAdminOrDeptHead` (allow `super_admin`, `admin`, `department_head`). Register router in `server/app` (or main server entry).
- Return shape: `{ success, data, message }` consistent with other endpoints.

## 3. Backend — Tasks with hierarchy + auto progress
- `server/models/taskModel.js`:
  - `create`: accept `parent_task_id`, `client_id`, `client_business_id`, `business_id`; insert them.
  - `update`: allow those columns in `allowed` list.
  - `findAll`: `SELECT ... , parent_task_id, client_id, client_business_id, business_id` (join client/business names for display).
  - `findById`: same columns.
- `server/services/taskService.js` `listTasks`: after building `tasks` rows, compute `progress_rate` per task. For a parent (has children), set `progress_rate = round(avg(direct children completion_rate))`; for leaf, keep latest `task_progress.completion_rate`. Also attach `subtasks` array (direct children) to each parent for the client tree. Sub-tasks still appear as their own rows (for filters/MyTasks), but the client builds the tree by `parent_task_id`.
- `server/validators/taskValidator.js`: accept new optional fields; `business_id`/`client_id`/`client_business_id` must be integers or null.

## 4. Frontend — shared services/api
- `client/src/features/task-management/api/client.api.js` (new): `getClients`, `createClient`, `updateClient`, `deleteClient`, `getClientOptions`.
- `client/src/features/task-management/hooks/useClients.js` (new): load/list/create/update/remove + loading/error.
- `client/src/features/organization-management/api/business.api.js` already exposes `getBusinesses` — reuse for the **Business** dropdown.

## 5. Frontend — Client sub-tab
- `client/src/features/task-management/pages/ClientsPage.jsx` (new): tab content with KPI/table (reuse pattern from `BusinessPage.jsx` + `KPICards`), search by client name, CRUD via a modal (`components/client/ClientModal.jsx` new) that edits client name + a dynamic list of business names (add/remove rows, enforce non-empty + no duplicates within the client). Uses `useClients` + `useToast`.
- `TasksPage.jsx`: add tab state (`'tasks' | 'clients'`) with a tab bar ("Tasks" / "Clients"). Render `ClientsPage` when `clients` selected. Access already covered by `isAnyAdmin` (includes `department_head`).

## 6. Frontend — TaskForm fields (REQUIRED, placed before Title)
- `TaskForm.jsx`: add three fields at the **top of the form, BEFORE Title** (order: Business → Client Name → Client Business → Title → rest):
  - **Business**: `<select>` populated from `getBusinesses` (business_name). **Required.** Stored as `business_id`.
  - **Client Name**: `<select>` from `getClientOptions` (client names). **Required.** On change, load that client's businesses into the Client Business dropdown and reset it. Stored as `client_id`.
  - **Client Business**: `<select>` populated from selected client's businesses. **Required.** Stored as `client_business_id`.
- Validation (`client/src/features/task-management/utils/taskValidation.js` `validateTaskPayload`): add required errors when `business_id`, `client_id`, or `client_business_id` is missing/empty. Also validate in `server/validators/taskValidator.js` (400 on missing). These three are required for **main task** creation; inline sub-task creation inherits them from the parent (see §7), so they are not re-validated for sub-tasks.
- Pass `business_id`, `client_id`, `client_business_id` through `handleSubmit` payload. `TasksPage.handleSubmit` / `useTasks.create` / `taskService.createTask` already forward the payload; ensure new keys reach the backend (no stripping).

## 7. Frontend — Hierarchy UI (remove header Plus, add parent plus + inline sub-task)
- `TaskListTable.jsx`: **remove the header `<Plus>` button** (lines ~190–201) and the `canManage &&` create toggle. Keep `min-w-[1400px]` grid. Add prop `onSubtaskCreate(parentId, payload)` and `tasks` already grouped; build a `parent -> children` map from `tasks` (using `parent_task_id`). In each `StatusGroup`, after rendering a parent `TaskRow`, render its children indented.
- `StatusGroup.jsx`: add support for an inline sub-task create row scoped to a parent. Keep existing inline create logic but gate it behind `parentId` (only shown when a parent's plus is clicked). On submit, call `onSubtaskCreate(parentId, {...})` and include `parent_task_id`, and inherit `client_id`, `client_business_id`, `business_id` from the parent.
- `TaskRow.jsx`:
  - Render a **plus button** (left/leading) when `canManage` and the task is a parent (top-level) → toggles inline sub-task creation beneath it (calls `onAddSubtask(task)`).
  - For parent tasks, render `ProgressBar` in **read-only** mode using `task.progress_rate` (computed). For sub-tasks, keep the editable slider.
  - Show indentation/badge for sub-tasks (e.g., left padding + "Sub-task" tag) to convey hierarchy.
  - Sub-tasks inherit parent Client/Business automatically (no separate fields in inline create).
- `useTasks.js` / `taskService.getTasks`: ensure returned rows include `parent_task_id`, `client_id`, `client_business_id`, `business_id`, `progress_rate`, and (optionally) `subtasks`.

## 8. Edge cases / validation
- Deleting a client with businesses → cascade delete businesses (FK). Deleting a parent task → cascade delete sub-tasks (FK `ON DELETE CASCADE`).
- Duplicate client name → 409 with friendly message; duplicate business within a client → 409.
- Parent with zero sub-tasks → progress stays manually editable (normal slider).
- Inline sub-task requires at least a title (reuse `validateCreateForm`).
- Refresh after sub-task progress change recomputes parent progress (existing `refresh()` already reloads tasks).

## 9. Validation / testing
- `npm run build` (client) and server start must succeed with no new errors.
- Manual: create client + businesses (verify uniqueness), create main task with Business/Client/Client Business, add inline sub-tasks, confirm parent progress = avg of sub-tasks and is read-only, confirm header Plus removed, confirm department head can open Client tab.
- Backend: test client CRUD uniqueness via API; verify `parent_task_id` stored and parent `progress_rate` computed.

## Open items (implementation-time)
- Decide whether sub-tasks should also be visible in `MyTasksPage` (out of scope for now; leave unchanged).
- `requireAdminOrDeptHead` helper may already exist in `server/middleware/auth` — reuse if present, else add.
