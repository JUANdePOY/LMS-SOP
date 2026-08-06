# Employee SOP Viewer — Implementation Checklist

**Feature:** Employees can view SOPs linked to courses they are enrolled in.  
**Implemented:** 2026-08-07  
**Status:** Backend + Frontend Complete  

---

## 1. Database

- [x] `sop_course_links` table exists with columns:
  - `id`, `sop_id`, `course_id`, `module_id`, `display_order`, `is_required`
  - `link_type` (`Prerequisite` / `Reference` / `Companion`)
  - `created_by`, `created_at`, `deleted_at`
- [x] Indexes on `course_id`, `sop_id`, `module_id`
- [x] Foreign keys:
  - `sop_id` → `sops(id)` ON DELETE CASCADE
  - `course_id` → `courses(id)` ON DELETE CASCADE
  - `module_id` → `course_modules(id)` ON DELETE SET NULL
- [x] Migration applied: `server/migrations/sopCourseLinks.js`

---

## 2. Backend — New Files

| File | Purpose |
|------|---------|
| `server/models/sopCourseLinkModel.js` | Data access for SOP–course links |
| `server/services/sopCourseLinkService.js` | Business logic + authorization checks |
| `server/controllers/sopCourseLinkController.js` | REST endpoints for linking/unlinking |
| `server/routes/sopCourseLinks.js` | Routes: `/api/courses/:courseId/sops` |
| `server/controllers/employeeSopController.js` | Employee SOP access controller |
| `server/routes/employee.js` | Routes: `/api/employee/sops/:id`, `/api/employee/courses/:courseId/sops` |

---

## 3. Backend — Modified Files

| File | Change |
|------|--------|
| `server/services/sopAssignmentService.js` | Added `isAssignedToUser()` helper |
| `server/config/database.js` | Added `runSopCourseLinkMigrations()` to startup |
| `server/server.js` | Mounted `sopCourseLinkRoutes` + `employeeRoutes` |

---

## 4. Backend — Status Validation

- [x] `sopCourseLinkService.js`: Only `Published` SOPs can be linked to courses
- [x] `sopAssignmentService.js`: Only `Published` SOPs can be assigned to users
- [x] `employeeSopController.js:getEmployeeSop`: Returns 403 for non-Published SOPs
- [x] `employeeSopController.js:listCourseSops`: Filters out non-Published SOPs
- [x] Error code: `INVALID_SOP_STATUS` (403) with clear message

---

## 5. Frontend — New Files

| File | Purpose |
|------|---------|
| `client/src/features/employee/api/employeeSop.api.js` | Employee SOP API client |
| `client/src/features/employee/components/CourseSOPsSection.jsx` | Renders linked SOPs in course view |
| `client/src/features/employee/pages/EmployeeSOPView.jsx` | Read-only SOP viewer page |
| `client/src/features/course_management/components/course-builder/ModuleSOPsTab.jsx` | SOP link/unlink UI in module editor |

---

## 6. Frontend — Modified Files

| File | Change |
|------|--------|
| `client/src/features/employee/pages/EmployeeCourseView.jsx` | Embeds `<CourseSOPsSection>` |
| `client/src/features/course_management/components/course-builder/ModuleEditor.jsx` | Added SOPs tab |
| `client/src/features/course_management/components/course-builder/CourseOutline.jsx` | Removed `sop` lesson type |
| `client/src/features/course_management/pages/CourseBuilderPage.jsx` | Added SOP link state + sync logic |
| `client/src/features/course_management/components/course-builder/LessonEditor.jsx` | Removed `sop` lesson type |
| `client/src/features/course_management/components/course-builder/LessonContentEditor.jsx` | Removed `sop` lesson type |
| `client/src/features/course_management/components/course-builder/LessonRow.jsx` | Removed `sop` lesson type |
| `client/src/features/course_management/components/utils/ContentViewer.jsx` | Removed SOP type handling |
| `client/src/App.jsx` | Added `/my-learning/sops/:id` route |
| `client/src/layout/AppLayout.jsx` | Added `/my-learning/sops/:id` to breadcrumb map |

---

## 7. Employee SOP Viewing Flow

1. **Employee enrolls in a course** that has Published SOPs linked via `sop_course_links`
2. **Employee navigates to course** → `EmployeeCourseView` renders `<CourseSOPsSection>`
3. **`GET /api/employee/courses/:courseId/sops`** returns linked SOPs (filtered to Published only)
4. **Employee clicks SOP card** → navigates to `/my-learning/sops/:sopId`
5. **`GET /api/employee/sops/:id`** validates:
   - SOP exists and is `Published`
   - Employee is enrolled in a course linking this SOP **OR** has direct assignment
6. **EmployeeSOPView** renders:
   - SOP header (title, code, status, department, owner, dates)
   - Module list with HTML content (`sop_modules.content`)
   - No edit/publish actions

---

## 8. Course Builder — SOP Linking Flow

1. **Course creator opens module editor** → clicks **SOPs tab**
2. **Clicks "Link SOP"** → modal shows only `Published` SOPs
3. **Selects SOP** → added to local state (`courseSops`)
4. **Saves course** → `syncCourseSops()`:
   - Diffs current state against previous saved state
   - Calls `POST /api/courses/:courseId/sops` for new links
   - Calls `DELETE /api/courses/:courseId/sops/:sopId` for removed links
   - Updates `courseSopsRef` after successful sync
5. **Error handling**: Non-Published SOPs are blocked with `INVALID_SOP_STATUS`; toast shows error message

---

## 9. Security & Access Control

| Endpoint | Method | Access |
|----------|--------|--------|
| `/api/courses/:courseId/sops` | GET | Authenticated (any role) |
| `/api/courses/:courseId/sops` | POST | `super_admin`, `admin`, `department_head` |
| `/api/courses/:courseId/sops/:sopId` | DELETE | `super_admin`, `admin`, `department_head` |
| `/api/employee/sops/:id` | GET | `employee` + enrollment/assignment check |
| `/api/employee/courses/:courseId/sops` | GET | `employee` + enrollment check |

- All authenticated routes use `authenticateToken` middleware
- SOP status enforced: only `Published` SOPs are linkable/assignable/viewable
- Department heads can only manage courses in their department
- Audit logging for link/unlink and employee SOP views

---

## 10. Verification Checklist

### Backend
- [ ] Run `node server/check_db.js` to verify `sop_course_links` columns exist
- [ ] Start server: `cd server && npm start`
- [ ] Confirm logs show: `SOP course link migrations applied`
- [ ] Test `POST /api/courses/23/sops` with Draft SOP → expect 403 `INVALID_SOP_STATUS`
- [ ] Test `POST /api/courses/23/sops` with Published SOP → expect 201
- [ ] Test `GET /api/employee/courses/23/sops` as enrolled employee → expect Published SOPs only
- [ ] Test `GET /api/employee/sops/35` as enrolled employee → expect 200 with modules
- [ ] Test `GET /api/employee/sops/34` as enrolled employee → expect 403 (Draft)

### Frontend
- [ ] Start client: `npm run dev`
- [ ] Login as employee, go to **My Learning → Course Catalog**
- [ ] Open a published course with linked SOPs
- [ ] Verify **Course SOPs** section appears at bottom of course view
- [ ] Verify only Published SOPs are listed
- [ ] Click an SOP card → verify EmployeeSOPView loads with module content
- [ ] Login as admin, open **Course Builder**
- [ ] Open a module → click **SOPs tab**
- [ ] Click **Link SOP** → verify modal only shows Published SOPs
- [ ] Try linking a Draft SOP → verify error toast appears
- [ ] Link a Published SOP, save course → verify link persists after refresh

---

## 11. Known Limitations

- SOPs must be `Published` to be linked or viewed. `Approved` is intentionally excluded per current requirement.
- Existing `Draft`/`For Review` SOPs already linked to courses will disappear from employee view until published.
- SOP module content is rendered as HTML (`dangerouslySetInnerHTML`). Ensure content is sanitized at creation time.
- Employee SOP viewer is read-only; no completion tracking or acknowledgement workflow.

---

## 12. Rollback Plan

If issues arise:
1. Revert the 3 backend service/controller files to previous versions
2. Revert the 7 frontend files to previous versions
3. No database migration to undo (table is additive)
4. Existing `Draft`/`For Review` links remain in DB but will reappear in employee view

---

## 13. Related Files

- Plan: `.kilo/plans/1786023410503-employee-sop-viewer-plan.md`
- Status plan: `.kilo/plans/sop-status-validation-plan.md`
- Backend routes: `server/routes/employee.js`, `server/routes/sopCourseLinks.js`
- Frontend route: `client/src/App.jsx` (`/my-learning/sops/:id`)
