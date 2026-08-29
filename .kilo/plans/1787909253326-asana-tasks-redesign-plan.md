# Asana-style Tasks & Projects redesign — REVISED plan

> This revision supersedes the greenfield plan originally provided. The earlier plan was written assuming only `MyTasksPage.jsx` + `TasksPage.jsx` and a short list of shared components existed. The codebase already contains most of what the plan proposed to build. This document re-bases the work onto **what actually exists** and scopes the effort to the real gaps.

## 0. Reality check (corrections to the original §0 assumptions)

- **A. Sidebar/top-bar shell: CONFIRMED, more than assumed.** `client/src/layout/AppLayout.jsx` renders `Sidebar` (main rail; has "My Tasks" `/tasks/my` and "Tasks & Projects" `/tasks`) + `SecondarySidebar`. The `SecondarySidebar` (`client/src/shared/components/navigation/SecondarySidebar.jsx`) already implements a **Client → Business** tree (search, expand/collapse, "New Client"), driven by `useProjectTree()`. No Projects level, no per-row "+"/"..." menus, no edit/delete yet.
- **B. `ProjectTaskViews`: far ahead of assumption.** It already exposes **8 views** — `list, board, timeline, calendar, workload, portfolio, whiteboard, tree` — with localStorage persistence (`TASK_VIEWS` / `TASK_VIEW_KEYS`). The "list" view renders `TaskHierarchyTable` (sectioned by project with headers), not a flat table.
- **C. Design tokens: CONFIRMED but with DIFFERENT names than the plan invented.** Real tokens in `client/src/index.css` are `--bg-surface`, `--text-primary`, `--text-muted`, `--text-secondary`, `--border`, `--bg-hover`, `--bg-sidebar`, `--bg-active`, `--text-on-sidebar`, `--color-primary` (#C14E08), plus `ppm-*` utility classes in `client/src/features/task-management/styles/minimal.css` (`ppm-card`, `ppm-btn-primary`, `ppm-empty`, `ppm-stat`, `ppm-breadcrumb`, `ppm-tab(s)`, `ppm-fade`, `--ppm-surface/--ppm-border`). **Do NOT introduce `--ppm-border`/`--ppm-surface` as top-level globals — they already exist scoped inside minimal.css; new tokens must follow the existing `--bg-*`/`--text-*`/`ppm-*` conventions.**
- **D. Client/Business CRUD: PARTIAL, not "unconfirmed".** `ClientFormModal` POSTs `/clients` (with inline businesses list); `BusinessFormModal` POSTs `/clients/:id/businesses`. `client/src/features/task-management/services/projectService.js` has full **Project** CRUD + custom-field endpoints. **Edit/delete for Client and Business is the genuine gap** (modals are create-only; no `updateClient`/`deleteClient`/`updateBusiness`/`deleteBusiness` found on the client). Confirm backend endpoints before Phase 5.
- **E. Tailwind + `ppm-*` custom classes: CONFIRMED.** Both used directly in JSX. Keep Tailwind as the mechanism.
- **F. Quick-add / command palette: already richer than Asana.** `TaskCommandPalette` (admin) and `QuickCreateMenu` (global, Client/Project/Task) already exist. **Gap:** `QuickCreateMenu` is missing "Business" and has no per-parent scoping UI.

## 1. Component reconciliation (existing vs. to build)

| Original plan item | Actual state | Action |
|---|---|---|
| `Avatar` | `shared/components/ui/Avatar` (`UserAvatar`) exists | Reuse; add deterministic color map if absent |
| `PriorityPill`/`StatusPill` | `PriorityFlag`, `StatusBadge`, `StatusDot` exist | Reuse; standardize to one pill API |
| `TaskListView` (build) | `TaskHierarchyTable` (sectioned list, project headers) + `TaskListTable` already exist | Enhance them to Asana sections; do not rebuild |
| `TaskDetailPanel` (build generic) | `TaskDetailPanel` (Drawer) + `TaskDetailsModal` (centered, full) BOTH exist | **Unify on the Drawer** (user decision): extend `TaskDetailPanel` → `EntityDetailPanel` (task/project/business/client), port modal's assignments/attachments/progress history, **retire `TaskDetailsModal`** |
| `EntityFormModal` (unify) | `ClientFormModal`, `BusinessFormModal`, `ProjectFormModal` exist (create-only) | Wrap into `EntityFormModal` OR reuse the three; add Business to quick-create |
| `EntityQuickCreateMenu` | `QuickCreateMenu` exists (Client/Project/Task) | Add "Business"; keep the richer palette (don't downgrade to Asana's nav-only Cmd+K) |
| `ViewTabs` | `ProjectTaskViews` already renders the tab row | No rebuild; restyle only |
| `BoardView`/DnD (Phase 6, dnd-kit) | `TaskBoard` already does kanban with **native HTML5 DnD** (`onStatusChange` on drop) | No dnd-kit; restyle + enrich `TaskCard` (avatar, due chip) |
| `TaskFilters` | Already separates a "Filters" dropdown from saved-view chips | Minor restyle only |
| `Breadcrumb` | Exists; no per-segment "..." menu | Add hover "..." (edit/delete) — low priority |
| `Timeline`/`Calendar`/`Subtasks`/`Comments` | `TaskTimeline`, `TaskCalendar`, `SubtaskInlineRow`, `CommentSection` already exist | Verify wiring; these are stretch-complete |
| `BulkActionBar` | Does NOT exist | **Build** (admin only) |

## 2. Decisions (resolved)

1. **Detail surface = unified Drawer.** `TaskDetailPanel` becomes `EntityDetailPanel` supporting `type: 'task' | 'project' | 'business' | 'client'`. `TaskDetailsModal` is retired after its capabilities (assignments, attachments, progress history, comments) are moved into the panel. Both pages swap `TaskDetailsModal` → `EntityDetailPanel`.
2. **Keep the richer `TaskCommandPalette` semantics** (create/switch/jump), not Asana's nav-only Cmd+K. Keep `N` = new task (already bound); do not adopt `Tab+Q`.
3. **Client/Business editing is the real backend gap** — Phase 5 cannot ship its management story without confirm/create of edit+delete endpoints and cascade reporting.

## 2b. Interaction principles (Asana parity — explicit)

**No navigation for create / edit / delete.** Nothing about creating, renaming, editing, or deleting a Task, Project, Business, or Client may require leaving the current view or changing route. Every action is a popover/panel/modal in place. Concretely:
- The top-bar **"New" menu** (`QuickCreateMenu`) offers **Client / Business / Project / Task**; choosing one opens `EntityFormModal` (or the existing scoped modal) in place. Its `onCreated` handler must **refresh the tree/list and stay put** — remove the current `navigate(...)` calls in `QuickCreateMenu.jsx:62-63` and `ProjectFormModal`/`ClientFormModal` `onCreated` so we no longer jump to a detail route.
- **List view — section headers:** each project (or date) section header has a hover-revealed **"+ Add task"** button that opens an inline quick-add row (title + project/status). Employees see it hidden (no create rights).
- **List view — rows:** hover actions = complete toggle + inline edit (due date / priority / assignee open a small popover) + a **"…" menu** (Edit / Delete) — no route change.
- **Board view — columns:** each status column header has a **"+"** to add a task directly into that column (status pre-set); the existing `TaskBoard` "New Task" affordance covers this.
- **Sidebar tree rows** (Client / Business / Project): a hover **"+"** adds a child (pre-scoped) and a **"…"** menu renames/edits/deletes, reusing the same forms/detail panel.
- **Breadcrumb segments** get a hover **"…"** (edit/delete) in addition to being a link.

**Asana-style detail layout (applies to `EntityDetailPanel`).** The right slide-over must follow Asana's detail anatomy, not a raw dump of the old modal tabs:
- Right-side Drawer (~40% width, overlays the list; closing/opening another row swaps content without unmounting the list).
- **Header:** editable title (click-to-edit input), entity-type eyebrow (Task/Project/Client/Business), and a close (X) button. No centered modal chrome.
- **Field grid:** compact labeled rows for Status, Priority, Assignee(s), Start, Due, and any custom fields — each field is **inline-editable** via a popover (Status/Priority = pill dropdown, Assignee = picker, dates = date popover), matching Asana's "click a field to change it" pattern.
- **Description:** a writable block under the fields.
- **Activity / comments:** a collapsible "Activity" section at the bottom (comments + progress updates merged into one chronological feed, Asana-style), with an inline comment box.
- Assignments editor, attachments, and progress history from `TaskDetailsModal` are ported into these field/description/activity areas — not kept as separate tabs.
- Body content swaps by `type` (task/project/business/client) but the shell, header, field-grid, and activity footer are identical across all four.

## 3. Revised phased plan (gap-driven, each phase independently shippable)

**Phase 1 — Token + primitive reconciliation (S).** Add only missing tokens (deterministic avatar palette, per-status/priority color vars, `--ppm-shadow-panel` for the slide-over) into `index.css`/`minimal.css` using existing naming. Verify `UserAvatar` has a deterministic color function; if not, add one. Standardize `StatusBadge`/`PriorityFlag` as the single pill source. No page change.

**Phase 2 — MyTasksPage list + sections (M).** Replace the Flat/Group-by-Project toggle with a "Sort: Due date / Project" control. Under Due date, render Asana sections `Recently assigned / Today / Upcoming / Later / No due date` (Overdue stays a red due-date flag inline, not a section). Reuse `TaskHierarchyTable` for Project sort. Add collapsible section headers w/ count + a hover **"+ Add task"** button that opens an inline quick-add row (title + project/status) — admin only; employees hidden. **Row hover actions:** complete toggle, inline edit popovers (due date / priority / assignee), and a **"…"** menu (Edit / Delete) — all in place, no navigation. Wire row click to open `EntityDetailPanel` (type task). Restyle `TaskFilters` search+status to match admin.

**Phase 3 — EntityDetailPanel (Drawer unification) (M).** Build the Asana-style detail layout per §2b (editable title header, inline-editable field grid, description, collapsible Activity feed). Extend `TaskDetailPanel` to accept `type` and render body per entity; port assignments editor, attachments, progress history, and comments from `TaskDetailsModal` into the field/description/activity areas. Retire `TaskDetailsModal`; update `TasksPage.jsx:532` and `MyTasksPage.jsx:206` to use `EntityDetailPanel`. Keep the `viewingTaskId` open/close contract.

**Phase 4 — Admin list/filters polish (S).** Condense the 6 `ppm-stat` tiles (`TasksPage.jsx:446`) into a slim strip or disclosure. Confirm `TaskFilters` saved-view chips are visually distinct from `ProjectTaskViews` tabs (they already are). Ensure list view uses the enhanced `TaskHierarchyTable` with per-project section **"+ Add task"** quick-add (`handleAddProjectTask` already wired) and per-row **"…"** edit/delete.

**Phase 5 — Unified Client/Business/Project management (L, needs backend).** (a) Extend `SecondarySidebar` tree to a 3rd level (Projects) — confirm `getProjectTree()` payload includes projects; if not, extend the endpoint. (b) Add per-row hover **"+"** (add child, pre-scoped) and **"…"** (rename/edit/delete) on tree rows via a `TreeRow` component, reusing the existing three form modals (prefilled) or a new `EntityFormModal` wrapper. (c) Add **"Business"** to the top-bar `QuickCreateMenu` (currently missing) and make its `onCreated` refresh-in-place instead of navigating. (d) Breadcrumb segments get a hover **"…"** (edit/delete). (e) Clicking an entity name (tree row / breadcrumb / scope chip) opens `EntityDetailPanel` typed to that entity. **All create/edit/delete stays on the current view — remove existing `navigate(...)` calls in `QuickCreateMenu`, `ProjectFormModal`, `ClientFormModal` `onCreated`.** **Backend prerequisite:** create/update/delete for Client & Business + cascade-count on delete. Delete uses existing `ConfirmationDialog` with the affected-count warning.

**Phase 6 — Board view (S, mostly done).** `TaskBoard` already works with native DnD and has a per-column "New Task" add button. Restyle to match; enrich `TaskCard` (assignee avatar, due-date chip). Ensure each column header exposes the **"+"** add affordance (pre-set to that status) and that `onStatusChange` is wired on `TasksPage` (yes); optionally expose board on `MyTasksPage`. No dnd-kit.

**Phase 7 — Bulk actions (M).** Build `BulkActionBar` (status / assignee / delete) + row checkboxes in admin list (`TaskHierarchyTable`). **Backend prerequisite:** batch update endpoint (or accept N sequential calls). Employee page excluded.

**Phase 8 — Global quick-add + palette (S).** Move `TaskCommandPalette` + `QuickCreateMenu` into the shared top-bar shell so they're available outside Tasks pages. Add "Business" to the menu.

**Phase 9 — Stretch (verify, don't build blindly).** `TaskTimeline`, `TaskCalendar`, `SubtaskInlineRow`, `CommentSection` already exist. Confirm they render correctly per entity; real work is only if backend lacks support for: manual task ordering/position, subtasks API, activity log, and the Phase 5/7 endpoints above.

## 4. Backend confirmations required (blocks Phases 5 & 7)

1. `PUT/DELETE /clients/:id` and `PUT/DELETE /clients/:id/businesses/:id` (or equivalent) — edit/delete for Client & Business.
2. Delete cascade reporting: an endpoint/payload that returns counts of affected businesses/projects/tasks for the confirm dialog.
3. `getProjectTree()` payload shape — does it include `projects` under each business? (drives sidebar 3rd level).
4. Batch task update endpoint for bulk actions (Phase 7), or confirm N sequential `update()` calls are acceptable.

## 5. Risks

- Retiring `TaskDetailsModal` risks losing its richer capabilities if not ported fully — port assignments/attachments/progress-history before deletion.
- The two detail components currently diverge in field coverage; unifying on the Drawer must not regress the admin's ability to edit assignments/attachments.
- `getProjectTree` may not include projects — Phase 5 tree extension depends on it.

## 6. Validation

- `npm run build` (client) passes with no new warnings after each phase.
- MyTasksPage: due-date sections render only when non-empty; Overdue shows as red flag; row click opens right Drawer; `N` opens new task.
- TasksPage: all 8 views render; board drag changes status via `onStatusChange`; stat strip condensed; bulk bar appears on multi-select (admin).
- Sidebar: Client → Business → Project expandable; "+" pre-scopes create; "..." edit/delete opens modal; Business available in top-bar "New".
- No `TaskDetailsModal` references remain after Phase 3; `EntityDetailPanel` handles all four entity types.
