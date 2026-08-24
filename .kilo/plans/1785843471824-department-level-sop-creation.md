# Plan: Allow SOP creation directly in a Department folder (uncategorized SOPs)

## Context
Users need to create SOPs that belong to a department but to **no category**. Today the
inline "Department SOPs" section (the `+ SOP` button for uncategorized SOPs) only renders
for **leaf departments** (`!hasChildren`). When a department contains sub-departments,
`hasChildren` is `true`, so the section is hidden and SOPs can only be created inside
category folders.

The backend already supports uncategorized SOPs:
- `getDepartmentSops(departmentId)` → `exclude_categorized=true`
  (client/.../api/hierarchy.api.js:15)
- `quickCreateSop({ title, departmentId, categoryId: null })`
  (client/.../services/sopQuickCreate.service.js:17)
- Page handler `handleInlineCreateSop(departmentId, null, name)`
  (HierarchyOverviewPage.jsx:42) already passes `categoryId = null`.

So this is a **frontend gating fix** only — no API/DB changes required.

## Goal
Render the department-level "uncategorized SOPs" section (header, **+ SOP** button, inline
create row, list) for **every** department on expand, not just leaf departments. Category
folders remain unchanged.

## Changes — single file
`client/src/features/organization-management/components/hierarchy/HierarchyNode.jsx`

1. **Relax `isCreatingLeafSop`** (lines 44-47):
   - Remove the `!hasChildren` requirement so a department-level inline SOP editor can open
     for any department. Rename the variable to `isCreatingDeptSop` for clarity (update its
     2 usages at lines ~44 and ~241).
   - Keep `creatingSopFor?.departmentId === node.id && creatingSopFor?.categoryId == null`.

2. **Allow the SOP fetch for parent departments** (lines 54-79):
   - Change the effect early-return from `if (hasChildren || !isExpanded || sops !== null) return;`
     to `if (!isExpanded || sops !== null) return;` and drop `hasChildren` from the dependency
     array. This makes `getDepartmentSops(node.id)` (uncategorized) load when any department
     is expanded, consistent with leaf behavior.

3. **Always render the Department SOPs block on expand** (line 217):
   - Change `{!hasChildren && (` to `{isExpanded && (` (it is already inside the
     `{isExpanded && (...)}` wrapper, so simply drop the `!hasChildren` condition).
   - Optionally relabel the section header (line 220-222) from `{node.name} SOPs` to
     `Uncategorized SOPs` to clearly distinguish department-level SOPs from category SOPs.
     (Low risk, improves clarity — confirm with reviewer if undesired.)

No changes needed to:
- `HierarchyContext.jsx` (`startCreateSop`/`cancelCreateSop` already accept `categoryId = null`)
- `CategoryNode.jsx` (category SOP creation untouched)
- `HierarchyOverviewPage.jsx` (`handleInlineCreateSop` already handles `categoryId = null`)
- Backend / DB

## Edge cases
- **Leaf department with categories**: unchanged — both the category section and the
  department "Uncategorized SOPs" section appear.
- **Parent department with sub-departments**: now shows sub-departments AND its own
  uncategorized SOPs section (create + list).
- **Department with no SOPs**: shows the `+ SOP` button and "No SOPs found for this
  department." empty state (already handled).
- **readOnly (department head)**: the `+ SOP` button is hidden by the existing `!readOnly`
  guard (HierarchyNode.jsx:223) — no change to permissions.
- **Inline create row**: `onInlineCreateSop(node.id, null, name)` already routes to the
  page handler with `categoryId = null`.
- **Duplicate active editor**: `creatingSopFor` is a single object, so only one inline SOP
  editor is open at a time (existing behavior preserved).

## Validation
1. `npm run build` (or `npm run dev`) in `client/` — zero errors.
2. Manual:
   - Expand a department that has sub-departments → confirm an "Uncategorized SOPs" (or
     "{name} SOPs") section with a **+ SOP** button appears.
   - Click **+ SOP**, enter a title, confirm → navigates to the new SOP editor; refresh
     shows it under the department (not under any category).
   - Expand a department with categories → both a category's SOP section and the
     department uncategorized section work independently.
   - Confirm department-head (readOnly) accounts see no **+ SOP** button.
3. No new console errors / warnings.

## Open question (non-blocking)
Auto-fetching uncategorized SOPs on expand for *every* department (including parents) adds
GET /sops calls when many parent departments are expanded. Acceptable at current scale;
if it becomes a concern, lazy-load the list behind the **+ SOP** toggle later. No change to
this plan required now.
