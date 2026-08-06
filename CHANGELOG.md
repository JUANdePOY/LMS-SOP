# Changelog

All notable changes to the LMS-SOP project are documented in this file.

---

## [Unreleased]

### Added

#### Task Management Module

A complete Task Management module has been added to the LMS, enabling administrators to create, assign, monitor, and manage operational tasks.

**Frontend:**

- `client/src/features/task-management/` — full feature module:
  - `pages/TasksPage.jsx` — main task list page with filters (status, priority, department, assignee) and summary cards
  - `pages/TaskDetailsPage.jsx` — detailed task view with information, assignments, attachments, progress timeline, and comments
  - `pages/MyTasksPage.jsx` — personal task dashboard for assigned users
  - `components/TaskCard.jsx` — reusable task card component
  - `components/TaskCardSkeleton.jsx` — loading skeleton for task cards
  - `components/TaskForm.jsx` — task creation and editing form
  - `components/AssignmentInput.jsx` — assignment type and target selector (user, department, position, multiple users)
  - `components/AssignmentSection.jsx` — displays assigned users/departments/positions
  - `components/AttachmentSection.jsx` — file upload and attachment display
  - `components/CommentSection.jsx` — task comment thread
  - `components/ProgressModal.jsx` — progress update modal with completion rate, notes, and file upload
  - `constants/taskConstants.js` — task-related constants (statuses, priorities, assignment types)
  - `hooks/useTasks.js` — fetch and manage all tasks
  - `hooks/useMyTasks.js` — fetch and manage tasks assigned to the current user
  - `hooks/useMyTaskCount.js` — fetch task count summary for the current user
  - `hooks/useTaskDetails.js` — fetch and manage individual task details
  - `api/assignment.api.js` — assignment-related API calls
  - `services/taskService.js` — centralized task API service

**Backend:**

- `server/controllers/taskController.js` — task CRUD, assignment, progress, attachment, and comment endpoints
- `server/services/taskService.js` — business logic for tasks, assignments, progress tracking, attachments, and comments
- `server/services/taskAttachmentPublicFile.js` — public file access for task attachments
- `server/models/taskModel.js` — task database model
- `server/models/taskAssignmentModel.js` — task assignment model (user, department, position)
- `server/models/taskProgressModel.js` — progress tracking model
- `server/models/taskAttachmentModel.js` — attachment storage model
- `server/models/taskCommentModel.js` — comment model
- `server/routes/tasks.js` — task API routes
- `server/validators/taskValidator.js` — input validation for task endpoints
- `sql/taskManagement.sql` — database schema for task tables

**Documentation:**

- `Task & Projects Management.md` — comprehensive module documentation covering objectives, user roles, task fields, assignment types, status logic, priority levels, progress tracking, attachments, timeline, comments, notifications, dashboard, UI mockups, database design, future enhancements, and recommended workflow

#### Certificate Management Enhancements

- `PublicModuleCard.jsx` — new component for sharing SOPs publicly via a link
- `ShareLinkDrawer.jsx` — drawer component for generating and managing shareable SOP links
- `PublicSOPPage.jsx` — public-facing SOP viewer page with improved rendering
- `sopService.js` — added public share link generation and retrieval
- `sopController.js` — added public SOP endpoints
- `CertificatePreviewCanvas.jsx` — improved live preview rendering
- `CertificateSectionsAccordion.jsx` — enhanced accordion with improved field rendering
- `CertificateTemplateForm.jsx` — template creation and editing improvements
- `certificateSections.js` — shared certificate sections constants (client and server)

#### SOP Management Enhancements

- `SOPCreateForm.jsx` — improved SOP creation form with better field handling
- `SOPEditForm.jsx` — improved SOP editing experience
- `useSOPList.js` — enhanced SOP list hook with better data handling
- `SOPListPage.jsx` — SOP list page improvements
- PDF download capability for SOPs (commit `9e077b4`)
- Archive action added to SOP list (commit `10639ad`)

#### Database & Infrastructure

- `server/config/database.js` — database configuration updates
- `server/server.js` — server configuration updates
- `server/shared/certificateSections.js` — shared certificate sections constant

### Fixed

- SOP creation error (commit `9a9e8a3`)
- Signature and field rendering issues (commit `3cfa88d`)
- Avatar upload 422 error and date input format issues (commit `0a5288b`)
- mod_rewrite proxy rules causing 503 errors (commit `76c9372`)
- InnoDB errno:121 duplicate key errors in migration runners (commit `301f540`)
- pdf-lib dependency missing from root `package.json` (commit `99d4239`)

---

## [0.1.0] — Initial Release

### Added

- SOP Management module with full CRUD
- Course Management module
- Quiz/Assessment module with integrity monitoring
- Certificate Management module with live preview
- User Management with RBAC (roles: super_admin, admin, department_head, employee)
- Department Management with hierarchy
- Dashboard with statistics and charts
- Profile and Settings pages
- Audit logging
- Seed data script with demo accounts and sample data
