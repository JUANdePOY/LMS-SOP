# Task & Project Management UI Redesign — Implementation Plan

## Context (grounded in the actual codebase)

This is the **LMS-SOP** app (React + Vite + react-router-dom + Tailwind via CSS variables + `cn()` + `lucide-react`, light/dark via `useTheme`). A `task-management` feature already exists but is a **flat task list** with no Client→Business→Project hierarchy, and no multi-view/custom-field engine.

The backend **already has most of the hierarchy foundation**:
- `clients` (id, client_name) and `client_businesses` (id, client_id, business_name) — the HubSpot-style external "Client → Business" layer.
- `tasks` already carry `client_id`, `client_business_id`, `business_id`, `parent_task_id` columns (FKs in place).
- `task_assignments` supports multiple assignees of types `User | Department | Position`.
- `task_comments`, `task_attachments`, `task_progress` exist.
- Org has a separate `businesses` table (business units → departments) used by SOP management — **distinct** from `client_businesses`.

**Missing:** the `projects` table, any `teams` table, the custom-fields engine, task **dependencies** (blocks/blocked-by), and all view UIs.

### Decisions confirmed with user
1. **"Business" layer = `client_businesses`** (external client businesses). `Project` is a child of `client_businesses`. Org-internal `businesses` stays for SOP/department use only; the task's `business_id` column is legacy/cross-link only and not used for the project tree.
2. **"Team" = org `departments`** (leaf departments). Task "team" is stored as a `task_assignments` row of type `Department`. No new teams table.
3. **Custom fields = per-project.**

### Naming collisions to respect
- Keep `client_businesses` (the spec's "Business") separate from `businesses` (org units).
- Do **not** rename existing tables. Add new tables only.
- Preserve all existing `/tasks`, `/tasks/:id`, `/tasks/my` routes; the new tree coexists with them (employees fall back to `/tasks/my`).

---

## Phase 1 — Data model + Information Architecture (build first)

### 1A. Database migrations (new file `server/migrations/projectManagement.js`)
Run via existing migration harness (idempotent, ignore-known dup codes like `clientManagement.js`).

Tables:
- **`projects`**
  - `id` PK, `client_business_id` FK → `client_businesses(id)` ON DELETE CASCADE, `name`, `description`, `status` ENUM(`planning`,`active`,`on_hold`,`completed`,`cancelled`), `start_date`, `due_date`, `color` VARCHAR (hex), `enabled_views` JSON (array of `list|board|table|timeline|calendar|workload|whiteboard`), `created_by` FK→users, `created_at`, `updated_at`, UNIQUE(`client_business_id`,`name`), INDEX on `client_business_id`.
- **`tasks` addition**: `ADD COLUMN project_id INT DEFAULT NULL`, FK → `projects(id)` ON DELETE CASCADE, INDEX `idx_tasks_project`.
- **`task_custom_field_definitions`**: `id`, `project_id` FK→projects ON DELETE CASCADE, `name`, `type` ENUM(`text`,`number`,`select`,`multiselect`,`date`,`user`), `options` JSON (for select types), `position` INT, `created_at`. UNIQUE(`project_id`,`name`).
- **`task_custom_field_values`**: `id`, `task_id` FK→tasks ON DELETE CASCADE, `field_id` FK→task_custom_field_definitions ON DELETE CASCADE, `value` TEXT, UNIQUE(`task_id`,`field_id`).
- **`project_tags`** + **`task_tags`** (lightweight, many-to-many): `project_tags(id, project_id, name, color)`, `task_tags(task_id, tag_id)` — optional, can slip to Phase 3 if time-boxed; tags can initially reuse the existing `tasks.category` text column.

### 1B. Server models / controllers / routes
- `server/models/projectModel.js`: CRUD + `listByClientBusiness`, `getWithStats` (aggregate task counts/status).
- `server/controllers/projectController.js` + `server/routes/projects.js`: `GET /api/projects`, `POST`, `GET /api/projects/:id`, `PUT`, `DELETE`; nested `GET /api/clients/:clientId/businesses/:businessId/projects`; custom-field endpoints `GET/POST/PUT/DELETE /api/projects/:id/fields`.
- Extend `server/models/taskModel.js` `create`/`update` to accept `project_id` and `custom_fields` ({field_id|name, value}) → write to `task_custom_field_values`. Extend `server/validators/taskValidator.js`.
- Extend `server/models/clientModel.js` to also return project counts per business (JOIN `projects`) for the overview/sidebar tree.
- All routes wrapped with the existing async-handler/error middleware; parameterized queries only; consistent `{ success, data, error }` shape.

### 1C. Client data layer
- `client/src/features/task-management/services/projectService.js`: CRUD + field CRUD + tree fetch.
- `client/src/features/task-management/hooks/useProjects.js` (list/create/update/delete + fields) and `useClientsTree.js` (fetches Clients→Businesses→Projects for the sidebar). Mirror the existing `useTasks` hook style (loading/error/pagination, `cn`-free).
- Extend `taskService.js` client to send `project_id` + `custom_fields`.

### 1D. Navigation — Notion-style sidebar tree
- Extend `client/src/shared/components/navigation/sidebar/Sidebar.jsx`: add a new **Clients** tree section (below existing groups), data-driven from `useClientsTree`. Each level expandable/collapsible (chevron on hover, like existing submenu pattern). Preserve existing collapsed/expanded rail, mobile drawer, role filtering (`filterMenuByRole`).
- Tree: `Clients ▸ {Client} ▸ {Business} ▸ {Project}`. Plus a top-level **Teams** section listing departments (from existing org API) and a **My Tasks** home entry (`/tasks/my`).
- Add **"+ New"** dropdown in `AppLayout.jsx` header (top-right): New Client / New Business / New Project / New Task, reusing existing dropdown patterns (see profile menu).

### 1E. Routing (`App.jsx`)
Add (lazy, role-wrapped like existing):
- `/clients` → `ClientsOverviewPage` (HubSpot-style: clients grid, aggregate counts, activity feed stub).
- `/clients/:clientId` → `ClientDetailPage` (businesses under it + counts).
- `/clients/:clientId/businesses/:businessId` → `BusinessProjectsPage` (Monday-style project card grid w/ progress bars).
- `/clients/:clientId/businesses/:businessId/projects/:projectId` → `ProjectWorkspacePage` (view switcher shell — see below).
- `/projects/:projectId` → alias redirect to the nested route above.
Keep `/tasks`, `/tasks/:id`, `/tasks/my`.

### 1F. Pages (Phase 1 = shell + tree, views land in Phases 2–5)
- `ClientsOverviewPage`, `ClientDetailPage`, `BusinessProjectsPage`: real data, loading/empty/error states, theme-aware, reuse existing `Card`/`Button`/`Avatar` components. Empty states: "Create your first client/business/project".
- `ProjectWorkspacePage`: renders the **view tab bar** (ClickUp-style, tabs: List/Board/Table/Timeline/Calendar/Workload/Whiteboard) + a `TaskDetailPanel` slide-over. In Phase 1 only the **List** tab is functional (basic grouped list reading the same task store); other tabs render a friendly empty/"coming soon" state so the IA is complete. Persist last-used view per project in `localStorage` keyed by project id.
- `TaskDetailPanel` (slide-over, not full nav): Phase 1 supports title/status/priority/assignees/team/dates/description + comment feed (reuse existing `TaskDetailsModal` internals where possible). Subtasks checklist + dynamic custom fields wired in Phase 2/3.

### Design-system tokens to add (in `index.css`, both themes)
Extend CSS variables (don't hardcode colors in components):
- `--status-backlog`, `--status-in-progress`, `--status-review`, `--status-done`, `--status-blocked` (+ `-fg`/`-bg`/`-border` triples) — Monday-saturated.
- `--priority-low/medium/high/critical`.
- `--card-radius`, `--card-shadow` (Board cards) vs flat rows.
Create a `statusStyles(status)` / `priorityStyles(priority)` util in `task-management/constants/taskConstants.js` that maps to these vars; keep status/priority lists centralized there. Reuse existing `--color-primary`, `--bg-sidebar`, `--text-on-sidebar`.

### Validation (Phase 1)
- `npm run build` (client) must pass with zero errors/warnings.
- Migration runs idempotently; `projects` + FKs present; existing tasks unaffected.
- Sidebar tree renders Clients→Businesses→Projects for admin roles; employees see Teams + My Tasks only.
- Create a Client → Business → Project → Task through the UI; task shows under the correct project; project count reflects it.
- Manual: light/dark toggle renders new tokens correctly; empty states show with CTA.

---

## Phase 2 — Core views (List + Board)
- **List view**: grouped rows (Status → Assignee → Due Date, toggleable), inline-edit title/status/priority, drag reorder. Reads `useTasks` filtered by `project_id`.
- **Board (Kanban)**: columns = project status set (Backlog/In Progress/Review/Done/Blocked, customizable per project), cards show title, stacked assignee avatars + `+N` overflow, priority flag, due chip, subtask progress `3/5`; drag between columns updates status. Use a single DnD lib already in the repo if present, else `@dnd-kit` (add to deps, document reason).

## Phase 3 — Table view + custom-fields engine
- Spreadsheet grid: columns = built-in + dynamic custom-field columns from `task_custom_field_definitions`; sortable/filterable headers; inline cell edit; "+ Add column" creates a field def on the fly (persisted). Render values via `task_custom_field_values`.

## Phase 4 — Timeline/Gantt + Calendar
- **Timeline**: date-axis bars per task, dependency lines. Requires `task_dependencies` table (id, task_id, depends_on_task_id, type `blocks`/`blocked_by`, UNIQUE). Bars draggable to reschedule (updates start/due). Group by assignee or team.
- **Calendar**: month/week grid, tasks by due date, color = priority or team.

## Phase 5 — Workload view (cross-project, team-based)
- Rows = departments (Teams), cols = days; cell = assigned task load; overload cells flagged red. Filter by team. Reads `task_assignments` (Department type) + task dates across all projects the viewer can see.

## Phase 6 — Whiteboard view (stretch)
- Freeform canvas per project: sticky notes, arrows, embedded task cards linked to real tasks. Lowest priority; isolate behind `enabled_views`.

## Phase 7 — Polish
- Empty states, animations (reuse `MotionProvider`), keyboard shortcuts, **Cmd/Ctrl+K command palette** (Linear/Notion-style) for quick capture/nav. Confirm before deleting any existing files.

---

## Risks / open questions
- **Permissions/visibility** (spec flagged, not yet designed): Phase 1 assumes admin roles (super_admin/admin/department_head) see the full tree; employees see only assigned projects/tasks (`/tasks/my`). Per-client row-level isolation is **out of scope for Phase 1** — flag if needed before launch.
- **`business_id` legacy column** on tasks is unused by the new tree; leave as-is to avoid breaking SOP cross-links.
- **DnD library choice** deferred to Phase 2; confirm repo already has one before adding a dependency.
- **Tags** may initially reuse `tasks.category` to avoid a new table; revisit in Phase 3.

## Out of scope
- Whiteboard (Phase 6) unless explicitly requested.
- Backend auth/role changes beyond existing `ProtectedRoute` + `filterMenuByRole`.
- Replacing the flat `/tasks` page (kept as a global task search alongside the tree).
