# Employee SOP Viewing via Course Enrollment — Implementation Plan

**Feature:** Allow employees to view SOPs linked to courses they are enrolled in, through a dedicated employee-facing SOP viewer page.  
**Created:** 2026-08-06  
**Status:** Implementation-ready  

---

## 1. Requirement

Employees currently have no authenticated way to view SOPs. The only path is the public shared link (`/s/:token`), which does not verify course enrollment. The goal is:

- Course creators link SOPs to courses via `sop_course_links`.
- Enrolled employees see linked SOPs in their course view.
- Clicking an SOP opens a read-only employee SOP page (`/my-learning/sops/:id`).
- Access is enforced server-side: the employee must be enrolled in a course that links the SOP, or have direct SOP assignment.

---

## 2. Existing Architecture Analysis

### Database
- `sop_course_links` exists in `sql/DB_SOP.sql` and `READ_THIS_DB.sql` but **has no model, service, controller, or frontend integration**.
- Current `module_content.type` enum does **not** include `'sop'`. The frontend and `courseBuildController.js` allow it, but the DB schema rejects/coerces it.
- SOP IDs are currently misused in `module_content.url` when `type = 'sop'`.

### Backend
- SOP routes (`/api/sops/*`) are admin-only.
- `sopShareModel.js` provides public token-based access (`/api/sops/share/:token`).
- Course builder (`courseBuildController.js`) saves lessons into `module_content`, including the invalid `'sop'` type.

### Frontend
- Employee feature lives in `client/src/features/employee/`.
- Employee pages: `EmployeeDashboard.jsx`, `EmployeeCourseCatalog.jsx`, `EmployeeCourseView.jsx`.
- Course builder pages: `CourseBuilderPage.jsx`, `ModuleEditor.jsx`, `LessonEditor.jsx`.
- `LessonPage.jsx` renders SOP lessons as a link to `/sops/:id`, which employees cannot access.

### Routing
- `App.jsx` wraps all `/sops/*` routes in `AdminProtectedWrapper`.
- No employee SOP route exists.

---

## 3. Database Impact

**Tables changed:** only `sop_course_links`.  
**Tables unchanged:** `courses`, `course_modules`, `module_content`, `sops`, `sop_modules`.

### Migration: `server/migrations/sopCourseLinks.js` (new)

```sql
-- Add missing columns to sop_course_links
ALTER TABLE sop_course_links
  ADD COLUMN course_id INT NULL AFTER sop_id,
  ADD COLUMN module_id INT NULL AFTER course_id,
  ADD COLUMN display_order INT NOT NULL DEFAULT 0,
  ADD COLUMN is_required TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL,
  ADD CONSTRAINT fk_courselink_course 
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_courselink_module 
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL;

CREATE INDEX idx_sop_course_links_course ON sop_course_links(course_id);
CREATE INDEX idx_sop_course_links_sop ON sop_course_links(sop_id);
```

**Rules compliance:**
- Normalization: bridge table separates SOP–course relationship from course content.
- Indexing: indexes on `course_id` and `sop_id`.
- Foreign keys: `course_id -> courses(id)`, `module_id -> course_modules(id)`, `sop_id -> sops(id)`.
- No production data deleted.
- No JSON storage for relational data.

---

## 4. Implementation Plan

### Phase 1: Database Migration
- [ ] Create `server/migrations/sopCourseLinks.js`
- [ ] Ensure migration is idempotent and runs on app startup or via manual execution.

### Phase 2: Backend — SOP Course Link Module

#### 2.1 Model: `server/models/sopCourseLinkModel.js` (new)
```js
const db = require('../config/database');

async function listByCourse(courseId) { /* JOIN sops, ORDER BY display_order */ }
async function listBySop(sopId) { /* JOIN courses */ }
async function create(courseId, sopId, meta = {}) { /* INSERT */ }
async function remove(courseId, sopId) { /* soft delete */ }
async function listByCourseAndSop(courseId, sopId) { /* find one */ }

module.exports = { listByCourse, listBySop, create, remove, listByCourseAndSop };
```

#### 2.2 Service: `server/services/sopCourseLinkService.js` (new)
- Business logic for linking/unlinking.
- Access checks: only admins, department heads, or course instructors can modify links.
- Audit logging via existing `logAudit`.

#### 2.3 Controller: `server/controllers/sopCourseLinkController.js` (new)
Endpoints:
- `GET /api/courses/:courseId/sops` — list SOPs linked to a course
- `POST /api/courses/:courseId/sops` — link SOP to course
- `DELETE /api/courses/:courseId/sops/:sopId` — unlink SOP from course

All endpoints use `authenticateToken` and authorize via role/course ownership.

#### 2.4 Routes: `server/routes/sopCourseLinks.js` (new)
```js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const sopCourseLinkController = require('../controllers/sopCourseLinkController');

router.use(authenticateToken);

router.get('/:courseId/sops', sopCourseLinkController.listByCourse);
router.post('/:courseId/sops', sopCourseLinkController.create);
router.delete('/:courseId/sops/:sopId', sopCourseLinkController.remove);

module.exports = router;
```

Mount in `server/app.js` or `server/routes/index.js`:
```js
const sopCourseLinkRoutes = require('./sopCourseLinks');
app.use('/api/courses', sopCourseLinkRoutes);
```

#### 2.5 Employee SOP Controller: `server/controllers/employeeSopController.js` (new)
```js
// GET /api/employee/sops/:id
// Validates:
//   1. SOP exists
//   2. Employee is enrolled in a course linking this SOP
//   3. OR employee has direct SOP assignment (existing sop_assignments)
// Returns: SOP + modules + share token (if exists, else generate temp link)
```

#### 2.6 Employee SOP Routes: `server/routes/employee.js` (new or extend existing)
```js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const employeeSopController = require('../controllers/employeeSopController');

router.use(authenticateToken);
router.get('/sops/:id', employeeSopController.getSop);
router.get('/courses/:courseId/sops', employeeSopController.listCourseSops);

module.exports = router;
```

### Phase 3: Frontend — Course Builder (SOP Linking)

#### 3.1 Update `ModuleEditor.jsx`
- Add a new **SOPs tab** alongside the existing Lessons tab.
- In the SOPs tab:
  - Show list of currently linked SOPs (from `sop_course_links`).
  - Button to link a new SOP (modal with SOP search/select).
  - Per-SOP controls: remove, set required, reorder.
- On save, call the new `POST /api/courses/:courseId/sops` and `DELETE /api/courses/:courseId/sops/:sopId` endpoints.
- **Do not** send SOP lessons in `modules[].lessons[]` anymore.

#### 3.2 Update `CourseOutline.jsx`
- Add a visual indicator/section for linked SOPs per module.

#### 3.3 Update `CourseBuilderPage.jsx` save flow
- After saving course/modules/lessons, also save SOP links via the new API.
- Alternatively, include `sops` array in the course builder payload and handle it in `courseBuildController.js`.  
  **Recommended:** separate API calls to keep concerns separated.

### Phase 4: Frontend — Employee Course View

#### 4.1 New Component: `client/src/features/employee/components/CourseSOPsSection.jsx`
- Fetches `GET /api/employee/courses/:courseId/sops` (or reuse existing course API with embedded SOPs).
- Renders SOP cards with: title, code, link type, required badge.
- Links to `/my-learning/sops/:id`.

#### 4.2 Update `EmployeeCourseView.jsx`
- Import and render `<CourseSOPsSection courseId={courseId} />` below the module/lesson list.

### Phase 5: Frontend — Employee SOP Viewer Page

#### 5.1 New Page: `client/src/features/employee/pages/EmployeeSOPView.jsx`
- Read-only SOP display.
- Fetches `GET /api/employee/sops/:id`.
- Renders: title, description, metadata, modules.
- No edit, publish, or workflow actions.

#### 5.2 New API Client: `client/src/features/employee/api/employeeSop.api.js`
```js
export async function getEmployeeSop(sopId) { ... }
export async function getCourseSops(courseId) { ... }
```

#### 5.3 Update `App.jsx`
```jsx
const EmployeeSOPView = lazy(() => import("@/features/employee/pages/EmployeeSOPView"));

// Add route:
{ path: "my-learning/sops/:id", element: EmployeeProtectedWrapper(EmployeeSOPView), handle: { title: "SOP" } },
```

### Phase 6: Cleanup (Optional but Recommended)

- [ ] Remove `'sop'` from `LessonEditor.jsx` type options.
- [ ] Remove `'sop'` from `courseBuildController.js` lesson type whitelist.
- [ ] Remove `'sop'` from `module_content` type handling in `LessonPage.jsx`.
- [ ] Update existing `module_content` rows where `type = 'sop'` to a valid type or delete them (data migration).

---

## 5. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `server/migrations/sopCourseLinks.js` | **Create** | Migration for `sop_course_links` columns |
| `server/models/sopCourseLinkModel.js` | **Create** | Data access for SOP–course links |
| `server/services/sopCourseLinkService.js` | **Create** | Business logic for linking |
| `server/controllers/sopCourseLinkController.js` | **Create** | REST endpoints for course SOP links |
| `server/routes/sopCourseLinks.js` | **Create** | Routes for SOP course links |
| `server/controllers/employeeSopController.js` | **Create** | Employee SOP access controller |
| `server/routes/employee.js` | **Create** | Employee-specific routes |
| `client/src/features/employee/components/CourseSOPsSection.jsx` | **Create** | SOP section in course view |
| `client/src/features/employee/pages/EmployeeSOPView.jsx` | **Create** | Employee SOP reader page |
| `client/src/features/employee/api/employeeSop.api.js` | **Create** | Employee SOP API client |
| `client/src/features/course_management/components/course-builder/ModuleEditor.jsx` | **Modify** | Add SOPs tab, remove SOP lesson type |
| `client/src/features/course_management/components/course-builder/CourseOutline.jsx` | **Modify** | Show linked SOPs |
| `client/src/features/employee/pages/EmployeeCourseView.jsx` | **Modify** | Embed `CourseSOPsSection` |
| `client/src/App.jsx` | **Modify** | Add employee SOP route |
| `server/controllers/courseBuildController.js` | **Modify** | Remove `'sop'` from lesson type whitelist |
| `server/models/courseContentModel.js` | **No change** | Not touched |

---

## 6. Security & Access Control

- **Employee SOP access** (`GET /api/employee/sops/:id`):
  - Requires authentication.
  - Validates enrollment in a course that links the SOP via `sop_course_links` + `course_enrollments`.
  - Falls back to existing `sop_assignments` direct assignment check.
  - Returns 403 if neither condition is met.

- **Course SOP link management** (`POST/DELETE /api/courses/:courseId/sops`):
  - Restricted to `super_admin`, `admin`, `department_head`, and course instructors.
  - Audit logged.

---

## 7. Rollout Sequence

1. Run migration on staging.
2. Deploy backend model/service/controller/routes.
3. Deploy frontend course builder changes (SOPs tab).
4. Deploy frontend employee course view + SOP viewer page.
5. Cleanup old SOP lesson type handling (after confirming no active data uses it).

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Existing `module_content` rows with `type = 'sop'` | Run a one-time data migration to convert or delete them before removing the type from the whitelist. |
| Course builder save order | Save course/modules/lessons first, then save SOP links in a follow-up call to avoid transaction complexity. |
| Employee SOP page performance | Cache SOP modules; they are read-only and change infrequently. |
