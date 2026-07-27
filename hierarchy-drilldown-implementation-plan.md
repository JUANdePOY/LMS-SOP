# Hierarchy Drill-down Redesign — Implementation Plan

## 1. Goal

Replace the fully-expanded recursive tree (`BusinessNode.jsx` / `DepartmentNode.jsx` / `OrganizationTree.jsx`) with a nested accordion pattern matching the existing PAFR hierarchy (`AreaAccordion` / `GroupAccordion` / `SquadronList` / `SelectedSquadronPanel`).

Key difference from PAFR: the selected-item panel shows **SOPs only** — no member/user count, no "View members" action.

## 2. Current issues being fixed

- `BusinessNode`/`DepartmentNode` render the entire subtree expanded on mount — no lazy expand/collapse.
- Metadata (head, user count, SOP count) is hidden behind `opacity-0 group-hover:opacity-100` — invisible on touch devices.
- `OrganizationTree.filterDepartments` mutates `business.departments` in place during render — a real bug, not just style.
- Clicking a node navigates away entirely (`navigate('/admin/organization/departments?highlight=...')`), losing tree state.
- `BusinessNode` and `DepartmentNode` are near-duplicate components.

## 3. Component architecture

```
HierarchyContext (new)
├── BusinessAccordion (replaces top-level rendering in OrganizationTree.jsx)
│   └── DepartmentAccordion (replaces BusinessNode.jsx + DepartmentNode.jsx)
│       └── SubDepartmentList (leaf rows, like SquadronList)
├── SelectedDepartmentPanel (like SelectedSquadronPanel — SOPs only, no member data)
└── SOPModal (replaces MembersModal pattern — lists SOPs for the selected department)
```

### HierarchyContext
Holds shared state so accordion levels and the selected panel don't need prop drilling:
- `expandedBusinessIds: Set`
- `expandedDeptIds: Set`
- `selectedDepartment: object | null`
- `sopModalOpen: boolean`
- actions: `toggleBusiness(id)`, `toggleDepartment(id)`, `selectDepartment(dept)`, `openSopModal()`, `closeSopModal()`

### BusinessAccordion
- One row per business (name, department count badge, expand chevron).
- Expanding renders its departments via `DepartmentAccordion`.

### DepartmentAccordion
- One row per department (name, SOP count badge, expand chevron **only if it has sub-departments**).
- No sub-departments → clicking the row calls `selectDepartment(dept)` directly (mirrors a `Group` with no squadrons in PAFR).
- Has sub-departments → clicking toggles expand, revealing `SubDepartmentList`.
- **Remove**: `head_name`/user-count badges from the row if we're excluding member info app-wide; keep head name only if it's still wanted as departmental metadata (confirm — see Open Questions).

### SubDepartmentList
- Flat list of leaf sub-departments under an expanded department.
- Clicking a row calls `selectDepartment(subDept)`.

### SelectedDepartmentPanel
- Shows: department name, SOP count, and a "View SOPs" button.
- **Excluded**: user count, member list, any "View members" action.

### SOPModal
- Opens from `SelectedDepartmentPanel`'s "View SOPs" button.
- Fetches and lists SOPs for `selectedDepartment.id` on open (lazy-loaded, not pre-fetched with the hierarchy tree).

## 4. File changes

| File | Change |
|---|---|
| `OrganizationTree.jsx` | Strip recursive tree rendering; becomes a thin wrapper that renders `BusinessAccordion` list and wraps children in `HierarchyContext.Provider` |
| `BusinessNode.jsx`, `DepartmentNode.jsx` | Deprecated — replaced by `BusinessAccordion.jsx` and `DepartmentAccordion.jsx` |
| `BusinessAccordion.jsx` | New |
| `DepartmentAccordion.jsx` | New |
| `SubDepartmentList.jsx` | New |
| `SelectedDepartmentPanel.jsx` | New |
| `SOPModal.jsx` | New |
| `HierarchyContext.jsx` | New — context + provider + `useHierarchyContext()` hook |
| `HierarchyToolbar.jsx` | Unchanged (search stays as-is, but fix the filter to not mutate state — see below) |
| `useHierarchy.js` | Unchanged (top-level fetch stays as-is) |
| `hierarchy.api.js` | Add `getDepartmentSops(departmentId)` |
| `hierarchy.service.js` | Add `getDepartmentSops` passthrough if the service layer wraps the API calls |
| `organization.routes.js` (backend) | Add `GET /organization/departments/:id/sops` route |
| `HierarchyOverviewPage.jsx` | Swap `OrganizationTree` usage; remove `onSelectNode` navigation prop, replaced by context-driven selection |

## 5. Bug fix bundled in this work

`filterDepartments` in `OrganizationTree.jsx` currently mutates `dept.children` in place:
```js
dept.children = filterDepartments(dept.children, query);
```
This will be rewritten to return a new filtered array without mutating the source tree, since the new `DepartmentAccordion` reads from the same shared `hierarchy` state.

## 6. API contract (new)

```
GET /api/organization/departments/:id/sops
→ { data: [{ id, title, updated_at, ... }] }
```
Fetched only when `SOPModal` opens — not bundled into the initial `/hierarchy` payload, since SOP lists could be large and most departments' SOPs will never be viewed in a given session.

## 7. Rollout steps

1. Build `HierarchyContext`, `BusinessAccordion`, `DepartmentAccordion`, `SubDepartmentList`, `SelectedDepartmentPanel` against the existing `hierarchy` data shape (no backend changes yet) — visually verify against current data.
2. Add `SOPModal` wired to a new `getDepartmentSops` API call and backend route.
3. Swap `OrganizationTree.jsx` to use the new components; remove `onSelectNode` navigation.
4. Fix the `filterDepartments` mutation bug as part of the swap.
5. Remove `BusinessNode.jsx` and `DepartmentNode.jsx` once nothing imports them.
6. QA: verify search still filters correctly at each accordion level, expand/collapse state persists correctly, and SOP modal loads/closes cleanly.

## 8. Open questions

- Should department head (`head_name`) still show on the accordion row, or does "exclude the member" mean dropping that too? Current plan keeps head name (it's departmental metadata, not member/user data) and only drops user counts and member lists.
- Does `sop_count` already returned in the `/hierarchy` payload stay as the badge number, or should the modal's fetched list length overwrite it once loaded?
