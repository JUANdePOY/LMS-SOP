# Plan: Row actions + wide, unblurred detail panel (Admin Tasks List tab)

## TL;DR — most of this slice already exists

Before planning changes, the agent (in plan mode) read the real code. The
assumptions in the posted prompt match an **older** version of the codebase.
Almost every requirement is already implemented today. This plan documents what
is already satisfied (so it is not re-done) and scopes the **two genuine gaps**
plus a few verifications.

### Already satisfied (do NOT rebuild)
- **`handleEdit` already opens the detail panel** — `TasksPage.jsx:271-273`
  already does `setViewingTaskId(task.id)`. No change needed.
- **`EntityDetailPanel` already supports `type="project"`** —
  `EntityDetailPanel.jsx:298-390` (`ProjectBody`) edits `name`, `description`,
  `status`, `start_date`, and shows `client`/`business` (read-only). Project
  section-header "Edit project" in `TaskHierarchyTable.jsx:412-419` already calls
  `onEditProject` → opens the panel. Fields exposed: name, description, status
  (Active/On Hold/Completed/Cancelled), start_date, client (display), business
  (display).
- **Panel is already a side panel, not a modal, and already unblurred** —
  `EntityDetailPanel.jsx:395` renders
  `<Drawer ... size="lg" showBackdrop={false} />`, and `Drawer.jsx:15-20` maps
  `lg` → `w-[42vw] min-w-[480px] max-w-[720px]`. This already meets the
  35–45% / 480–720px target and has no backdrop/blur. No change needed.
- **List-tab row already has all inline controls** — the List tab renders
  `TaskHierarchyTable` (`ProjectTaskViews.jsx:101-118`) → `TaskListRow.jsx`.
  `TaskListRow.jsx` already implements:
  - Complete toggle (left checkbox) → `TaskListRow.jsx:306-346`
  - Status dropdown → `StatusDropdown` `:27-46`
  - Priority dropdown → `PriorityDropdown` `:48-70`
  - Searchable assignee picker (real endpoint) → `AssigneePicker` `:113-204`
  - Clickable due-date cell → `DueDateCell` `:72-111`
  - "..." menu: Open / Duplicate (disabled) / Move-to-project / Delete
    (inline confirm) → `MoreActionsMenu` `:248-301`
  - Inline "Delete?" confirm (replaces modal at row) → `InlineDeleteConfirm`
    `:238-246`
  - "Move to project" picker → `MoveToProjectPicker` `:206-236`, wired with
    `project_id` (`:319`).
- **Assignee list source EXISTS** — `getUsersForAssignment`
  (`assignment.api.js:3`) hits `GET /users` (server `settings.js:197`). So the
  picker is NOT limited to already-assigned people. No flag needed.
- **Project section "+ Add task" already exists** — `TaskHierarchyTable.jsx:291,
  312-320` (inline button → `onAddProjectTask` → opens `TaskForm`; acceptable per
  prompt's fallback option).

## Genuine gaps to implement

### Gap 1 — Row "Delete" still opens a centered modal (violates constraint #1)
`TaskListRow`'s `InlineDeleteConfirm` "Delete" calls `onDelete` →
`ProjectTaskViews` → `TasksPage.handleDelete` (`TasksPage.jsx:286-288`) which
sets `pendingDeleteId` → renders the centered `ConfirmationDialog`
(`TasksPage.jsx:528-536`). This reintroduces a modal despite the inline confirm
already asking "Delete?".

Fix (scoped to row-level trigger only):
1. In `TasksPage.jsx`, add a direct-delete handler, e.g.
   `const deleteTaskNow = async (id) => { await remove(id); await refreshStats(); };`
   (reuse `remove`/`refreshStats` already in scope; no new modal).
2. Pass it as a new prop through `ProjectTaskViews` (`onDeleteImmediate`) →
   `TaskHierarchyTable` (`onDelete` for rows) → `TaskListRow` `TaskRow`
   `MoreActionsMenu`. `TaskListRow.jsx:375-381` currently maps
   `onDelete?.(t.id)`; change `InlineDeleteConfirm`'s onConfirm to call this
   direct handler instead of the modal path.
3. After this, the row never opens `ConfirmationDialog`. Leave `ConfirmationDialog`
   alone everywhere else (it is still used by `EntityDetailPanel` for attachment
   delete — `EntityDetailPanel.jsx:254-262`). The `pendingDeleteId`/`ConfirmationDialog`
   block in `TasksPage.jsx:284-293, 528-536` becomes dead for task rows; remove
   it only if no other call site uses `handleDelete` (verify; Board/tree views
   pass their own `onDelete`). Keep `remove` + `refreshStats` wiring.

### Gap 2 — Duplicate task has no endpoint (flagged per prompt)
`TaskListRow.jsx:288-290` renders Duplicate **disabled** with
`title="No duplicate endpoint yet"`. No server route exists
(`server/routes/tasks.js` has no `:id/duplicate`).

Recommendation: implement a server duplicate endpoint mirroring the existing quiz
pattern (`server/controllers/quizController.js:441-482` + `routes/quizzes.js:37`):
1. `server/controllers/taskController.js`: add `duplicateTask(req, res)` that
   loads the source via `taskModel.findById`, creates a copy with
   `title = \`${title} (copy)\``, copies `assignments` (and optionally subtasks),
   returns `201 { success:true, data:{ id } }`. Use `requireAdmin` and
   `logAudit('task.duplicate', ...)`.
2. `server/routes/tasks.js`: `router.post('/:id/duplicate', authenticateToken,
   requireAdmin, taskController.duplicateTask);`
3. `client/.../services/taskService.js`: add `duplicateTask(id)` →
   `api.post(\`/tasks/${id}/duplicate\`)`.
4. `TaskListRow.jsx:288`: enable the Duplicate button; on click call
   `duplicateTask(task.id)` then trigger a list refresh (via a new
   `onDuplicated` callback → `TasksPage` `refreshTasks()`). Keep the
   disable-with-tooltip fallback only if the endpoint is absent.

Note: confirm with user whether duplicate should also copy subtasks/comments or
just the task row + assignments. Recommend: task row + assignments only (matches
quiz duplicate's "copy questions" but comments/history are not duplicated).

## Optional (not required by prompt; flag for decision)
- **Interactive progress % in the List tab**: `TaskListRow.jsx:368-372` renders
  a non-interactive bar (no `onProgressChange` is even passed in). The prompt says
  "keep however it's currently exposed… don't regress." Recommend leaving it
  read-only in the List tab to stay in scope, OR wire a small slider using
  `handleProgressChange` (already exists in `TasksPage.jsx:311`). Decision needed
  only if interactivity is desired here.
- **Click-outside-to-close on the panel**: with `showBackdrop=false`, clicking the
  empty left area currently does nothing (panel closes only via the X). Asana
  closes on outside click without dimming. Optional: add a transparent click-catcher
  in `Drawer` (only when `showBackdrop=false`) that calls `onClose`. Non-blocking.

## Verify before done
- Hover a List-tab row: status/priority/assignee/date controls appear and work
  with NO modal.
- Row "… → Delete": confirms inline (Cancel / Delete) anchored to the row; NO
  centered `ConfirmationDialog` appears; task is removed and stats update.
- Open a task's panel: list behind is fully visible, undimmed, panel width ≈42vw
  (between 480–720px).
- Project section header "… → Edit project" opens `EntityDetailPanel type="project"`
  and edits name/description/status/start_date.
- Duplicate now works end-to-end (after Gap 2) and is no longer disabled.
- Filters, saved views, and other `ProjectTaskViews` modes (board/timeline/etc.)
  still work — only the List-tab row delete wiring changed.
- Run the repo's lint/test command before marking complete.

## Open questions to confirm with user
1. Should the duplicate endpoint copy assignments only, or also subtasks?
   (Recommend: task + assignments.)
2. Enable interactive progress slider in the List tab, or leave read-only?
   (Recommend: leave read-only to stay scoped.)
3. Approve adding the server `POST /tasks/:id/duplicate` endpoint + client
   `duplicateTask` (Gap 2)? This is new backend work beyond pure front-end.
