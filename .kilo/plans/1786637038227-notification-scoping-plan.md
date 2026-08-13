# Plan: Announcement Form — Business & Department Dropdowns

## Goal
Replace the free-text `target_roles` and `target_departments` fields in `AnnouncementForm.jsx` with proper role-aware dropdowns: a **business** dropdown and a **department** dropdown. The form should enforce that admins can only target their own business, while super_admins can target any business.

## Current State

| Aspect | Current |
|---|---|
| `AnnouncementForm.jsx` | `target_roles` and `target_departments` are comma-separated text inputs |
| Backend `createAnnouncement` | `business_id` is hardcoded to `req.user.business_id`; not user-selectable |
| Backend `target_roles` | Accepted from form, stored as JSON, used in broadcast scoping |
| Backend `target_departments` | Accepted as comma-separated codes, stored as JSON array of strings |
| Announcement viewing | Already filters by `business_id` + `target_role`/`target_department` query params |

## Design Decisions

### 1. Form fields
- **Business**: `<select>` dropdown. Shows all active businesses. For non-super_admin users, it is disabled and locked to their own business.
- **Department**: `<select>` dropdown, cascades from selected business. Shows all active departments for that business. Includes an "All Departments" option that stores `null`. For non-super_admin users, shows all departments in their business (no further restriction).
- **Remove**: `target_roles` field entirely. `target_departments` free-text input.

### 2. Data contract
Form submit payload changes from:
```js
{ title, body, type, priority, status, target_roles, target_departments }
```
to:
```js
{ title, body, type, priority, status, business_id, target_departments }
```
where:
- `business_id`: integer (selected business ID)
- `target_departments`: `null` (all departments) or `["DEPT_CODE"]` (single department code as JSON array)

### 3. Backend behavior
- **`createAnnouncement` / `updateAnnouncement`**: Accept `business_id` from `req.body`. If not super_admin, force it to `req.user.business_id`. Stop accepting/populating `target_roles` (set to `null`).
- **Broadcast**: `getAnnouncementTargetUserIds(businessId, null, targetDepartments)` — drop role filter, keep business + department filters.
- **Viewing**: `target_department` query param continues to work with department codes.

### 4. Role rules
| Role | Business dropdown | Department dropdown |
|---|---|---|
| `super_admin` | All businesses, selectable | All departments for selected business, plus "All Departments" |
| `admin` | Own business only, disabled | All departments for own business, plus "All Departments" |
| `department_head` | Own business only, disabled | All departments for own business, plus "All Departments" |
| `employee` | No access (permission gated) | — |

### 5. Cascading behavior
- On business change → reset department selection → reload department list for that business
- On edit (initialData present) → pre-populate both dropdowns from existing announcement data

## Implementation Tasks

### Task 1: Update `AnnouncementForm.jsx`
- Add imports: `useState`, `useEffect` (already imported), `useAuth` (already imported), `getBusinesses`, `getDepartments` from org-management API
- Add state: `businessId`, `targetDepartmentCode`, `businesses`, `departments`, `loadingOptions`
- Add fetch functions: `fetchBusinesses()` and `fetchDepartments(businessId)` following `CreateCourseModal.jsx` pattern
- Add cascading `useEffect`: reload departments when `businessId` changes
- Replace target_roles/departments text inputs with:
  - Business `<select>` (disabled for non-super_admin)
  - Department `<select>` with "All Departments" + department options (cascaded from business)
- Update `handleSubmit` to send `{ business_id, target_departments }` instead of `{ target_roles, target_departments }`
- `target_departments`: `null` when "All Departments" selected, `[selectedCode]` when a specific department is selected

### Task 2: Update `announcementController.js`
- `createAnnouncement`:
  - Read `business_id` from `req.body`
  - If not `super_admin`, force `business_id = req.user.business_id`
  - Remove `target_roles` parsing; set to `null`
  - Keep `target_departments` parsing (codes → string array)
  - Pass updated values to model and broadcast
- `updateAnnouncement`:
  - Read `business_id` from `req.body`
  - If not `super_admin`, force to `req.user.business_id`
  - Remove `target_roles` update; preserve existing or set `null`
  - Keep `target_departments` update logic

### Task 3: Update `notificationTargetService.js`
- Simplify `getAnnouncementTargetUserIds` signature: remove `targetRoles` parameter
- Keep `businessId` and `targetDepartments` filtering

## Files to Modify

| File | Changes |
|---|---|
| `client/src/features/announcements/components/AnnouncementForm.jsx` | Replace text inputs with business/department dropdowns; remove target_roles |
| `server/controllers/announcementController.js` | Accept `business_id` from body; enforce role scoping; drop `target_roles` |
| `server/services/notificationTargetService.js` | Simplify `getAnnouncementTargetUserIds` to drop `targetRoles` param |

## Validation
1. Client build: `cd client && npm run build`
2. Lint: `cd client && npm run lint` — no new errors
3. Backend smoke test:
   - Super admin creates announcement targeting Business B, Dept X → only that audience receives it
   - Admin creates announcement → business locked to own, can select any department
   - Announcement list page respects `target_department` filter from current user's role/dept

## Out of Scope
- No DB schema changes
- No changes to announcement viewing permissions beyond what's already in place
- No changes to event form (separate concern)
