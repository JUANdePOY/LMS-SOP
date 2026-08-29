# Employee "My Tasks" UX Redesign — Plan

## Goal
Improve the employee-facing task view (`client/src/features/task-management/pages/MyTasksPage.jsx`) with a modern, productivity-tool-grade experience inspired by **Monday.com / ClickUp**: a drag-and-drop Kanban board with intuitive status transitions, a compact data-visualization summary, and a retained (enhanced) list view. All changes are employee-scoped and reuse existing, battle-tested components.

## Key Context (verified in code)
- `TaskBoard.jsx` already implements native HTML5 drag-and-drop Kanban and calls `onStatusChange(Number(id), status)` on drop. It is currently only used by admin (`TasksPage` → `ProjectTaskViews`).
- `TaskCard.jsx` renders title, priority, status, due date, progress, assignees, and already supports `canManage` to hide edit/delete.
- `TaskListTable.jsx` already has inline `StatusCell` + `ProgressCell` controls, but they only render when `canManage` is true.
- Backend `taskService.updateProgress` (`server/services/taskService.js:568-574`) allows **any assigned user** to update their own task's status/progress. So enabling employee status changes is authorized.
- `@dnd-kit/*` is installed but **not needed** — `TaskBoard` uses native DnD, which keeps the change small and dependency-free. `recharts` is installed for the summary donut.
- **Decision (confirmed with user):** Employees may transition only `Pending → In Progress → Completed`. `Overdue` is auto-derived (display-only, not a drop target). `Cancelled` is excluded from the employee board (lead/admin action).

## UX Improvements
1. **Kanban board (primary view, default):** Drag a task card between `Pending` / `In Progress` / `Completed` columns to change status. Overdue tasks appear in a read-only `Overdue` column so they stay visible. Drop into a non-allowed column is rejected.
2. **Accessible status change (keyboard/no-drag alternative):** A compact status menu on each card / list row (limited to the 3 employee-safe statuses) so status can be changed without dragging (HTML5 DnD is not keyboard-accessible).
3. **Data-visualization summary bar** (ClickUp-style): completion donut + count chips (Total, In Progress, Completed, Overdue, Avg %).
4. **View switcher** Board / List (persisted in `localStorage`), replacing the old Flat/Group-by toggle. List view is enhanced so employees can now change status & progress inline (previously read-only).
5. **Stronger visual hierarchy:** overdue red accent, priority flag, due-date chip, progress bar — already present in `TaskCard`/`TaskListTable`, now actually editable for employees.
6. **Optimistic updates + rollback + toasts** for status/progress (mirrors admin `useTasks.patchTask`).

## Files to Change / Create

### 1. `constants/taskConstants.js` (edit)
Add employee-safe status sets:
```js
// Statuses an assigned employee may set via board drag / menu (no Cancelled, Overdue is auto-derived)
export const EMPLOYEE_DRAGGABLE_STATUSES = ['Pending', 'In Progress', 'Completed'];
// Columns shown in the employee board (Overdue is display-only)
export const EMPLOYEE_BOARD_STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue'];
```

### 2. `hooks/useMyTasks.js` (edit)
Add an optimistic `patchTask(taskId, changes)` (returning a rollback fn) — identical pattern to `useTasks.patchTask` (`hooks/useTasks.js:62`). Expose it in the return object. (No double-fetch: the page will rely on the debounced filter effect instead of a separate mount `refresh()`.)

### 3. `components/TaskBoard.jsx` (edit — small, keep <120 lines)
- New props: `statusColumns = TASK_STATUSES` and `droppableStatuses` (Set/array). Default behavior unchanged for admin.
- When `statusColumns` provided (employee), render only those columns.
- In `BoardColumn.handleDrop`, reject drop unless `droppableStatuses?.includes(status)` (so `Overdue` is non-droppable). Keep `onStatusChange(Number(id), status)` call.
- `DraggableCard` already sets `draggable` unconditionally → employees can drag. No change needed there.

### 4. `components/TaskListTable.jsx` (edit — small)
- Add props `canChangeStatus` and `canChangeProgress` (independent of `canManage`).
- `StatusCell`: render the dropdown when `canManage || canChangeStatus`.
- `ProgressCell`: editable when `canManage || canChangeProgress`.
- Employee usage: `canManage={false} canChangeStatus canChangeProgress`.

### 5. `components/TaskCard.jsx` (edit — small)
- Add prop `allowStatusChange` (bool) + reuse existing `onStatusChange` (already passed by `TaskBoard` as `(id, status)`? — note `TaskCard` currently has no status menu; add a compact `<select>`/menu limited to `EMPLOYEE_DRAGGABLE_STATUSES` when `allowStatusChange` is true, calling `onStatusChange(task.id, status)`). This is the keyboard-accessible alternative to dragging. Keep `canManage` edit/delete gating intact.

### 6. NEW `components/MyTasksSummary.jsx` (<120 lines)
- Props: `tasks`.
- Computes counts + average completion from `tasks` (client-side; no new endpoint).
- Renders a `recharts` `PieChart` donut (Pending/In Progress/Completed/Overdue) + 4–5 count chips. Loading: render skeleton chips; empty: render neutral placeholder. Accessible (`role="img"` + `aria-label` summarizing distribution).

### 7. `pages/MyTasksPage.jsx` (rewrite — centerpiece)
Rewrite to:
- Header: title + view switcher (Board/List) persisted at `ppm:mytasks:view`, default `board`.
- `<MyTasksSummary tasks={tasks} />` above filters.
- Filters: search + status (limits to `EMPLOYEE_BOARD_STATUSES`) + priority (`TASK_PRIORITIES`). Reuse existing input styling.
- Board view: `<TaskBoard tasks={tasks} statusColumns={EMPLOYEE_BOARD_STATUSES} droppableStatuses={EMPLOYEE_DRAGGABLE_STATUSES} onStatusChange={handleStatusChangeById} onView={handleView} canManage={false} allowStatusChange />`.
- List view: `<TaskListTable tasks={tasks} canManage={false} canChangeStatus canChangeProgress onStatusChange={handleStatusChangeById} onProgressChange={handleProgressChange} onViewTask={handleView} projectsById={projectsById} />`.
- Handlers:
  - `handleStatusChangeById(id, newStatus)` → optimistic `patchTask`, then `updateProgress({ task_id: id, status: newStatus, ...(newStatus==='Completed' ? { completion_rate: 100 } : {}) })`; rollback + toast on error.
  - `handleProgressChange(id, rate)` → clamp 0–100; if 100 also set `status:'Completed'`; optimistic `patchTask`; `updateProgress`; rollback + toast on error.
- Keep `TaskDetailsModal` for full view; keep `isAnyAdmin` guard.
- Loading: `TaskListTableSkeleton` for list; board shows per-column empty hint. Error: red banner. Empty: `ppm-empty`.
- Remove the redundant mount `refresh()` (filters effect already runs on mount).

## Behavior / Edge Cases
- Dragging to `Overdue`/`Cancelled` → rejected (no-op), matches server semantics (`Overdue` is derived; `Cancelled` blocked for employees).
- Setting progress to 100 → auto `Completed` (mirrors existing rule in `taskService.js:599-602` and current `handleProgressChange`).
- Completed/Cancelled tasks block progress edits server-side (`taskService.js:579`) → handler shows the returned error via toast + rollback.
- Overdue tasks assigned to employee remain visible in the read-only Overdue column (no action needed).
- `Cancelled` tasks: excluded from board; still visible in list view if filtered. (Acceptable; employees cannot cancel.)

## Validation
1. `cd client && npm run lint` — no new errors/warnings.
2. `cd client && npm run build` — zero build errors.
3. Manual:
   - As a non-admin user, open My Tasks → board is default.
   - Drag a `Pending` card to `In Progress` → status updates instantly, toast, persists after refresh.
   - Try dragging into `Overdue` → no change.
   - Use the card status menu (keyboard) → same result.
   - Switch to List → change status dropdown + progress bar now work for employee.
   - Set progress to 100 → card moves to Completed.
   - Search / status / priority filters narrow both views; summary updates.
   - Empty state and error banner render correctly.

## Risks / Notes
- `TaskCard` uses `task.progress_rate`; `getMyTasks` may return `completion_rate`. Normalize in `useMyTasks.load`: set `progress_rate = completion_rate ?? progress_rate` when mapping rows, so the card/progress UI is correct for employees.
- Native DnD is mouse/touch only; the status menu covers keyboard/a11y.
- No backend changes required (existing `updateProgress` already authorizes assigned users).
