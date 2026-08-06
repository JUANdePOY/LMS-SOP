# SOP Status Validation — Implementation Plan

**Feature:** Prevent linking/assigning/viewing SOPs that are not in an actionable state.  
**Created:** 2026-08-07  
**Status:** Implementation-ready  

---

## 1. Requirement

Currently, SOPs can be linked to courses, assigned to users, and viewed by employees regardless of their `status` field. The goal is to restrict these operations so that only SOPs with status `Approved` or `Published` can be:
- Linked to a course by an admin/course creator
- Assigned to a user/department
- Viewed by an employee through the employee SOP viewer

---

## 2. Existing Architecture Analysis

### SOP Status Values
From `server/models/sopModel.js` and DB schema:
```js
status enum('Draft','For Review','Approved','Published','Archived')
```

### Current Gaps
| Flow | File | Current Behavior |
|------|------|------------------|
| Link SOP to course | `sopCourseLinkService.js:linkSopToCourse` | Checks SOP exists, but NOT status |
| Assign SOP to user | `sopAssignmentService.js:createAssignment` | Checks SOP exists, but NOT status |
| Employee list course SOPs | `employeeSopController.js:listCourseSops` | Returns ALL linked SOPs, no status filter |
| Employee view SOP | `employeeSopController.js:getEmployeeSop` | Checks enrollment/assignment, but NOT SOP status |

### SOP Model Column Resolution
`server/models/sopModel.js` already has `getSopsColumns()` which dynamically resolves column names. The `status` column is standard across all environments and does NOT need dynamic resolution.

---

## 3. Database Impact

**None.** The `status` column already exists in the `sops` table. This is purely a business-logic validation change.

---

## 4. Implementation Plan

### Constant Definition
Add a shared constant for allowed statuses. Since this is a small feature, we can define it inline or in a small utils file.

**Option A (inline):** Define in each service/controller that needs it.
**Option B (shared):** Create `server/constants/sopConstants.js`.

Given the project's architecture, **Option A** is simpler and avoids creating a new file for a single string array. We'll define:
```js
const ALLOWED_EMPLOYEE_SOP_STATUSES = ['Approved', 'Published'];
```

### Backend Changes

#### 4.1 `server/services/sopCourseLinkService.js`
In `linkSopToCourse()`, after loading the SOP:
```js
const ALLOWED_LINK_STATUSES = ['Approved', 'Published'];
if (!ALLOWED_LINK_STATUSES.includes(sop.status)) {
  const error = new Error(`Cannot link SOP with status: ${sop.status}. Only Approved and Published SOPs can be linked.`);
  error.code = 'INVALID_SOP_STATUS';
  throw error;
}
```

#### 4.2 `server/services/sopAssignmentService.js`
In `createAssignment()`, after loading the SOP:
```js
const ALLOWED_ASSIGNMENT_STATUSES = ['Approved', 'Published'];
if (!ALLOWED_ASSIGNMENT_STATUSES.includes(sop.status)) {
  const error = new Error(`Cannot assign SOP with status: ${sop.status}. Only Approved and Published SOPs can be assigned.`);
  error.code = 'INVALID_SOP_STATUS';
  throw error;
}
```

#### 4.3 `server/controllers/employeeSopController.js`

**In `listCourseSops()`:**
After fetching rows from `sopCourseLinkModel.listByCourse()`, filter out SOPs that are not Approved/Published:
```js
const rows = await sopCourseLinkModel.listByCourse(courseId);
const allowed = rows.filter(row => ['Approved', 'Published'].includes(row.sop_status));
res.json({ success: true, data: allowed });
```

**In `getEmployeeSop()`:**
After loading the SOP and before granting access:
```js
const ALLOWED_EMPLOYEE_SOP_STATUSES = ['Approved', 'Published'];
if (!ALLOWED_EMPLOYEE_SOP_STATUSES.includes(sop.status)) {
  const error = new Error('This SOP is not available');
  error.code = 'FORBIDDEN';
  throw error;
}
```

---

## 5. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `server/services/sopCourseLinkService.js` | **Modify** | Add status check in `linkSopToCourse` |
| `server/services/sopAssignmentService.js` | **Modify** | Add status check in `createAssignment` |
| `server/controllers/employeeSopController.js` | **Modify** | Add status filter in `listCourseSops` and `getEmployeeSop` |

**Total files changed:** 3  
**New files created:** 0  
**Database migrations:** 0

---

## 6. Security & Behavior Impact

### Positive
- Prevents employees from seeing incomplete SOPs
- Prevents course creators from linking draft SOPs to published courses
- Prevents managers from assigning unfinished SOPs to staff

### Consideration
- Existing `Draft` or `For Review` SOPs that are already linked to courses will **disappear** from the employee course view after this change. They will return once the SOP is moved to `Approved` or `Published`.
- Existing direct assignments of non-published SOPs will become inaccessible to employees until the SOP is published.

### Rollback
- Revert the three file modifications. No database migration to undo.

---

## 7. Rollout Sequence

1. Deploy backend changes
2. Verify in browser DevTools Network tab:
   - Linking a `Draft` SOP returns 403/400 with clear message
   - Course library no longer shows `Draft` SOPs in Course SOPs section
   - Employee SOP viewer returns 403 for non-published SOPs
3. Update frontend error messages if needed to surface the new error codes

---

## 8. Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `INVALID_SOP_STATUS` | 403 | SOP status does not allow this operation |
| `FORBIDDEN` | 403 | SOP not available for employee viewing |
