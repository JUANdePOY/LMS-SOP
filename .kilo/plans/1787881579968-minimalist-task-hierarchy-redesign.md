# Minimalist / Monochrome Redesign — Task & Client Hierarchy

## Context (what already exists today)
The hierarchy the user described is **largely already built**, so this is a *visual reskin + consolidation*, not a from-scratch build. Verified in code:

- **Routing** (`client/src/App.jsx:236-240`) already encodes the full path:
  `/clients` → `ClientsOverviewPage`, `/clients/:clientId` → `ClientDetailPage`,
  `/clients/:clientId/businesses/:businessId` → `BusinessProjectsPage`,
  `/clients/:clientId/businesses/:businessId/projects/:projectId` → `ProjectWorkspacePage`.
- **Breadcrumbs** already exist but are **hand-rolled per page** (`ClientDetailPage.jsx:41-45`, `ProjectWorkspacePage.jsx:144-152`) with inconsistent separators (`ChevronRight` vs `/`). No shared `Breadcrumb` component exists.
- **`TasksPage.jsx`** (flat global) is the **only** place with all 7 working views (list/board/timeline/calendar/workload/portfolio/whiteboard) and a `TaskCommandPalette` that already indexes projects.
- **`ProjectWorkspacePage.jsx`** only implements the **List** view; the other 6 are "Coming Soon" stubs (lines 82-90). It already scopes data to one project.
- **`ClientsPage.jsx`** is **orphaned / dead code** — not wired into the router (router uses `ClientsOverviewPage`). Duplicate of `ClientsOverviewPagePage`.
- **Design system** (`client/src/index.css`) is a **warm, colorful brand theme** (navy `#132F45`, orange `#F25C05`, gold, warm paper `#F3F0EA`) with **saturated Monday-style filled status pills** (`.status-pill`, `.s-*`) and boxed `rounded-xl` + `shadow` cards everywhere.
- Shared UI primitives exist: `Button`, `Card`, `Avatar`, `badge`, `modal`, `ConfirmationDialog`.

## Decisions (confirmed with user)
1. **Scope = feature-scoped.** Only the task-management + client hierarchy area is reskinned. A scoped token layer is added; the rest of the LMS (courses, SOP, assessments, messaging) keeps the current brand theme. Do **not** rewrite global `index.css` tokens.
2. **Palette = brand orange + neutral grays.** Keep `--color-primary` (orange) as the *single* accent. Shift surfaces/neutrals toward calm near-monochrome. Status shown as **desaturated dot + text**, not filled pills.
3. **View engine = shared.** Extract the 7 views into one shared component reused by both `ProjectWorkspacePage` (scoped to a project) and `TasksPage` (admin portfolio). Removes duplication; deletes the "Coming Soon" stubs.

## Design tokens (feature-scoped — new file, does NOT touch global tokens)
Add `client/src/features/task-management/styles/minimal.css`, imported once by the task feature root. Define a scoped `.ppm` namespace so it cannot leak into other modules:

```css
.ppm {
  --ppm-bg: #FAFAFA;            /* page */
  --ppm-surface: #FFFFFF;       /* cards/rows */
  --ppm-surface-hover: #F5F5F5;
  --ppm-border: #EAEAEA;        /* hairline */
  --ppm-border-strong: #E0E0E0;
  --ppm-text: #171717;
  --ppm-text-2: #525252;
  --ppm-text-muted: #A3A3A3;
  --ppm-accent: var(--color-primary);      /* orange, single accent */
  --ppm-accent-hover: var(--color-primary-hover);

  /* desaturated status dots (text uses --ppm-text-2) */
  --ppm-st-pending: #A3A3A3;
  --ppm-st-in-progress: #2563EB;
  --ppm-st-review: #B45309;
  --ppm-st-completed: #16A34A;
  --ppm-st-overdue: #DC2626;
  --ppm-st-cancelled: #737373;

  --ppm-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --ppm-dur: 140ms;
}
.dark .ppm {
  --ppm-bg: #0A0A0A;
  --ppm-surface: #171717;
  --ppm-surface-hover: #1F1F1F;
  --ppm-border: #262626;
  --ppm-border-strong: #2E2E2E;
  --ppm-text: #FAFAFA;
  --ppm-text-2: #A3A3A3;
  --ppm-text-muted: #737373;
}
```
Plus minimalist component classes: `.ppm-breadcrumb`, `.ppm-stat-row`, `.ppm-stat`, `.ppm-row`, `.ppm-card` (1px border, 8px radius, no shadow), `.ppm-ghost-btn`, `.ppm-dot`.

## REMOVE
- `client/src/features/task-management/pages/ClientsPage.jsx` — orphaned duplicate of `ClientsOverviewPage`. Delete.
- `client/src/features/task-management/components/StatusBadge.jsx` usage of **filled pills** — replace with `StatusDot` (dot + text) everywhere it appears (List/Board/Calendar/Timeline/Portfolio). Keep the file only as a deprecated re-export of `StatusDot` if anything external imports it; otherwise delete.
- Filled colored stat-card backgrounds (`bg-blue-50`/`bg-red-50`/…) in `TasksPage.jsx:112-122` — replace with neutral stat row.
- Boxed `rounded-xl border shadow` chrome on cards/tables in `ClientsOverviewPage`, `ClientDetailPage`, `BusinessProjectsPage`, `ProjectWorkspacePage` — replace with hairline surfaces.
- "Coming Soon" stubs in `ProjectWorkspacePage.jsx:82-90` — replaced by the shared engine.
- `rounded-2xl`/`shadow-sm` containers in `ClientsPage`/`ClientsOverviewPage`.

## ADD
1. **`components/Breadcrumb.jsx`** (shared, reusable). Props: `items: {label, to?}[]`. Renders muted `label` separated by `/`; current segment is `--ppm-text` (no link). Used by every hierarchy page + `MyTasksPage` per-row chip variant (compact `›` separators, clickable → project).
2. **`components/StatusDot.jsx`** — dot (color from `--ppm-st-*`) + neutral text label. Replaces `StatusBadge`.
3. **`components/ProjectTaskViews.jsx`** — the extracted 7-view engine (List/Board/Timeline/Calendar/Workload/Portfolio/Whiteboard) + view switcher. Accepts `{ tasks, projectId?, canManage, onEdit, onDelete, onStatusChange, onProgressChange, onViewTask, onCreateTask }`.
4. **`styles/minimal.css`** (above).
5. **Sidebar collapsible tree** (in shared `Sidebar`): a "Clients" group that expands Client → Business → Project, jumping to the existing routes. Data via `useClients` (already returns clients+businesses) + `getProjects`/`projectService`. Add lazy project fetch per business if no existing endpoint lists projects-by-business (check `BusinessProjectsPage` data source first).
6. **Command palette index extension** (`TaskCommandPalette` commands builder in `TasksPage.jsx:289-294`): add `Open client:` and `Open business:` entries from `useClients` data (projects already indexed).
7. **`MyTasksPage` enhancements**: per-row breadcrumb chip (`Client › Project`, business omitted to save space, links to `ProjectWorkspacePage`); **Group-by-Project** toggle (segmented control above the table).

## MODIFY (file-by-file)
- **`Pages/TasksPage.jsx`** — wrap in `.ppm`; replace inline stat cards with `.ppm-stat-row`; swap `StatusBadge`→`StatusDot`; render `<ProjectTaskViews>` instead of hand-switching 7 components; extend `commands` with client/business entries; keep admin-only + redirect-to-`/tasks/my` behavior.
- **`Pages/ProjectWorkspacePage.jsx`** — wrap in `.ppm`; replace hand-rolled `<nav>` with `<Breadcrumb>`; replace List-only + ComingSoon with `<ProjectTaskViews projectId={projectId}>`; primary "New Task" stays the single solid button.
- **`Pages/ClientsOverviewPage.jsx`** — `.ppm` surface; `Breadcrumb` (root = "Clients"); client cards → hairline `.ppm-card`; delete orphan consideration (keep this one, delete `ClientsPage.jsx`).
- **`Pages/ClientDetailPage.jsx`** — `.ppm`; `Breadcrumb`; business cards → hairline.
- **`Pages/BusinessProjectsPage.jsx`** — `.ppm`; `Breadcrumb` (Clients / Client / Business); project cards → hairline; ensure it links into `ProjectWorkspacePage`.
- **`Pages/MyTasksPage.jsx`** — `.ppm`; add `Breadcrumb` (root "My Tasks"); per-row `StatusDot`; breadcrumb chip + Group-by-Project toggle; keep `canManage={false}`.
- **All 7 view components** (`TaskListTable`, `TaskBoard`, `TaskTimeline`, `TaskCalendar`, `TaskWorkload`, `TaskPortfolio`, `TaskWhiteboard`) — adopt `.ppm` hairline rows, `StatusDot`, ghost buttons for secondary actions, keep primary action solid; no filled pills, no colored card backgrounds. (These are the highest-traffic screens — do them carefully, preserve all existing behavior/keyboard/empty/loading states.)
- **`Sidebar`** (shared) — add Clients tree group (see ADD #5).

## Build order
1. `styles/minimal.css` + `StatusDot` + `Breadcrumb` (foundations, used everywhere).
2. `ProjectTaskViews` extracted from `TasksPage`; wire into `TasksPage` and `ProjectWorkspacePage` (deletes ComingSoon).
3. `TasksPage` neutral stat row + `StatusDot` swap.
4. Hierarchy pages (`ClientsOverview`, `ClientDetail`, `BusinessProjects`) → `.ppm` + `Breadcrumb` + hairline cards.
5. `MyTasksPage` chip + Group-by-Project.
6. `TaskCommandPalette` client/business indexing.
7. Sidebar Clients tree.
8. Delete `ClientsPage.jsx`.
9. Grep for remaining `StatusBadge` / `status-pill` / `rounded-xl shadow` usages in the feature and clean up.

## Validation
- `npm run build` (client) succeeds with zero new errors/warnings.
- `npm run lint` clean for the feature.
- Manual: admin lands on `/clients` (portfolio), drills Client→Business→Project with correct `/`-separated breadcrumb at each level; breadcrumb links navigate up.
- Employee (non-admin) lands on `/tasks/my`; each task shows compact `Client › Project` chip; Group-by-Project toggle works; clicking chip opens `ProjectWorkspacePage`.
- All 7 views render inside a project (no "Coming Soon"); status shows as dot+text, not filled pill; accent orange appears only on primary button / active tab / focus ring.
- `Cmd/Ctrl+K` palette can jump to a client, a business, and a project by name.
- Dark mode: `.ppm` tokens applied; no warm-paper bleed inside task area; contrast passes WCAG AA on primary button.
- No console errors on any task/hierarchy route; loading/empty/error states preserved.

## Open questions / risks
- Confirm `BusinessProjectsPage` data source for the sidebar tree's per-business project list (may need a `GET /clients/:id/businesses/:id/projects` or reuse `getProjects({client_business_id})`).
- Shared `Sidebar` edit is the only cross-module touch; keep it isolated to a new "Clients" collapsible group so other nav is unaffected.
- `StatusBadge` may be imported outside the feature — grep before deleting; if so, keep a deprecated re-export.
