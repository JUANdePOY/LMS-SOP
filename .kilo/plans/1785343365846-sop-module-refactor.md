# SOP Management Module-Based Refactor Plan

## Goal

Refactor `client/src/features/sop_management/` to follow a module-based architecture where `sop_modules` is the central building block (replacing the old `sop_sections`/`sop_steps` concepts). Simultaneously refactor the backend to enforce clean separation of concerns — SOP backend code must be self-contained and not mixed with other features, avoiding spaghetti code.

---

## 1. Target Directory Structure

### Frontend

```
client/src/features/sop-management/
├── pages/
│   ├── SOPListPage.jsx
│   ├── SOPWorkspacePage.jsx
│   └── SOPVersionPage.jsx
│
├── components/
│   ├── SOPEditor/
│   │   ├── ModuleList.jsx
│   │   ├── ModuleCard.jsx
│   │   ├── ModuleEditor.jsx
│   │   ├── RichTextEditor.jsx
│   │   ├── AttachmentUploader.jsx
│   │   ├── ModuleToolbar.jsx
│   │   └── SortableModuleList.jsx
│   │
│   ├── VersionTimeline.jsx
│   ├── ApprovalPanel.jsx
│   └── AuditTimeline.jsx
│
├── hooks/
│   ├── useModules.js
│   ├── useAttachments.js
│   └── useVersions.js
│
└── services/
    ├── sopService.js
    ├── moduleService.js
    ├── attachmentService.js
    └── versionService.js
```

### Backend (NEW — self-contained SOP module)

```
server/
├── server.js                          # Thin entry — mounts feature routers only
├── config/
│   ├── database.js                    # Connection pool + migration runner (kept minimal)
│   └── uploads.js                     # Upload config
├── middleware/
│   ├── auth.js                        # JWT auth (shared, NOT feature-specific)
│   ├── rbac.js                        # Role-based access (shared)
│   └── sopAuth.js                     # SOP-specific auth scoping (if needed)
├── routes/
│   ├── sops.js                        # Single SOP route file — mounts sub-routers
│   └── ...                            # Other feature routes (auth, users, etc.)
├── controllers/
│   └── sopController.js               # SOP controller — ALL SOP handlers in ONE file
├── services/
│   ├── sopService.js                  # SOP business logic (CRUD, transitions)
│   ├── sopModuleService.js            # Module CRUD + sort order
│   ├── sopAttachmentService.js        # Module attachment handling
│   ├── sopVersionService.js           # Version management
│   ├── sopApprovalService.js          # Approval workflow
│   ├── sopAcknowledgementService.js   # Acknowledgement management
│   └── sopAssignmentService.js        # Assignment management
├── models/
│   ├── sopModel.js                    # SOP DB queries
│   ├── sopModuleModel.js              # sop_modules DB queries
│   ├── sopModuleAttachmentModel.js    # sop_module_attachments DB queries
│   ├── sopVersionModel.js             # sop_versions DB queries
│   ├── sopApprovalModel.js            # sop_approvals DB queries
│   ├── sopAcknowledgementModel.js     # sop_acknowledgements DB queries
│   ├── sopAssignmentModel.js          # sop_assignments DB queries
│   ├── sopAuditLogModel.js            # sop_audit_logs DB queries
│   ├── sopShareModel.js               # sop_shares DB queries
│   ├── sopDocumentModel.js            # sop_documents DB queries
│   └── sopChangeLogModel.js           # sop_change_logs DB queries
├── utils/
│   ├── sopUtils.js                    # SOP-specific helpers (code gen, status transitions)
│   └── auditLogger.js                 # Shared audit logging (used by all features)
└── validators/
    └── sopValidator.js               # SOP input validation
```

---

## 2. Backend Architecture — Clean Separation of Concerns

### 2.1 Current Backend Problems (Spaghetti Code)

| Problem | Impact |
|---|---|
| SOP routes split across 8 files (`sops.js`, `sopContent.js`, `sopVersions.js`, etc.) | Fragmented SOP logic; duplicated middleware in every file |
| Every SOP route file has its own `router.use(authenticateToken)` | Middleware duplication; inconsistent auth patterns |
| `sopCompliance.js` combines assignments + acknowledgements + approvals | Violates single responsibility; 206 lines of mixed concerns |
| `sopWorkflowModel.js` imports `sopAcknowledgementService` | Cross-cutting coupling between model and service |
| Controllers directory has 5 unused files | Dead code; confusion about where handlers live |
| Models directly queried by routes (no consistent service layer) | Business logic leaks into route handlers |
| `config/database.js` is 466 lines mixing connection config + migrations | Monolith; hard to maintain |
| `server.js` is 182 lines mounting all routes | Single point of coupling for all features |
| Inconsistent response formats across routes | Frontend must handle multiple response shapes |
| Inconsistent error handling (each handler has its own try/catch) | No centralized error handling |
| Role name inconsistency (`super_admin` vs `admin`) | Auth bugs |
| `sopModel.js` has schema-version detection logic | Model knows about dev/prod differences — should be abstracted |

### 2.2 Clean Backend Principles

1. **One route file per feature, one controller per feature**: SOP code lives in `routes/sops.js` and `controllers/sopController.js` only. No splitting across 8 files.

2. **Routes are thin, controllers are thin**: Routes handle HTTP concerns (status codes, error wrapping). Controllers delegate to services. Services contain business logic. Models contain only DB queries.

3. **Services are the boundary**: No route directly imports a model. Routes import controllers, controllers import services, services import models. This prevents spaghetti where a route handler has inline SQL or business logic.

4. **Shared middleware is shared, not duplicated**: Auth middleware is defined once in `middleware/auth.js` and applied at the router level, not per-file.

5. **Consistent response format**: All API responses follow `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`.

6. **SOP code does not leak into other features**: No cross-imports between SOP services and non-SOP services. Shared utilities (audit logger, auth middleware) live in their own directories, not inside the SOP module.

7. **No dead code**: Remove the unused `controllers/` directory files that don't belong to any feature, or properly populate them.

### 2.3 Backend Refactoring Steps

**Step B1: Consolidate SOP routes into a single router**
- Create `server/routes/sops.js` as the single entry point for all SOP endpoints
- Mount sub-routers for nested resources:
  ```js
  // server/routes/sops.js
  const router = express.Router();
  router.use(authenticateToken);
  
  // SOP CRUD
  router.route('/').get(sopController.list).post(sopController.create);
  router.route('/:id').get(sopController.getById).put(sopController.update).delete(sopController.remove);
  
  // Modules (replaces sections + steps)
  router.route('/:sopId/modules').get(moduleController.list).post(moduleController.create);
  router.route('/modules/:moduleId').put(moduleController.update).delete(moduleController.remove);
  
  // Attachments
  router.route('/modules/:moduleId/attachments').post(attachmentController.upload);
  router.route('/attachments/:attachmentId').delete(attachmentController.remove);
  
  // Versions
  router.route('/:sopId/versions').get(versionController.list).post(versionController.create);
  router.route('/:sopId/versions/:versionId/restore').post(versionController.restore);
  
  // Approvals
  router.route('/:sopId/approvals').get(approvalController.list).post(approvalController.create);
  
  // Workflow
  router.route('/:sopId/transition').post(workflowController.transition);
  
  // Audit
  router.route('/:sopId/audit').get(auditController.list);
  
  // Shares
  router.route('/:sopId/shares').get(shareController.list).post(shareController.create);
  
  // Assignments + Acknowledgements
  router.route('/:sopId/assignments').get(assignmentController.list).post(assignmentController.create);
  router.route('/:sopId/acknowledgements').get(acknowledgementController.list).post(acknowledgementController.create);
  
  module.exports = router;
  ```
- Remove the 7 other SOP route files (`sopContent.js`, `sopVersions.js`, `sopAttachments.js`, `sopCompliance.js`, `sopWorkflow.js`, `sopShares.js`, `sopApprovals.js`)

**Step B2: Create `controllers/sopController.js`**
- All SOP HTTP handlers in a single file
- Each handler is a thin function: parse request → validate → call service → return response
- No inline business logic, no direct model imports
- Consistent try/catch error handling pattern

**Step B3: Create dedicated controllers for sub-resources**
- `controllers/sopModuleController.js` — module CRUD
- `controllers/sopAttachmentController.js` — attachment upload/download/delete
- `controllers/sopVersionController.js` — version CRUD + restore
- `controllers/sopApprovalController.js` — approval CRUD
- `controllers/sopWorkflowController.js` — status transitions
- `controllers/sopAuditController.js` — audit log listing
- `controllers/sopShareController.js` — share CRUD
- `controllers/sopAssignmentController.js` — assignment CRUD
- `controllers/sopAcknowledgementController.js` — acknowledgement CRUD

**Step B4: Create service layer for each controller**
- Each service file contains only business logic for its domain
- Services import only models they need (no cross-service imports between SOP sub-services)
- `sopAcknowledgementService` should NOT import `sopWorkflowModel` — instead, the controller orchestrates both services when needed

**Step B5: Remove dead code**
- Delete unused controller files in `controllers/` that don't belong to any feature
- Remove `controllers/trainingsController.js`, `controllers/reportsController.js`, `controllers/organizationController.js`, `controllers/attendanceController.js`, `controllers/announcementsController.js` (all dead code — routes don't use them)

**Step B6: Clean up `config/database.js`**
- Extract migration SQL into separate migration files or a dedicated migration runner
- Keep `database.js` as connection pool + retry logic only

**Step B7: Clean up `server.js`**
- Reduce to route mounting only — no business logic, no config, no middleware definitions
- All middleware is defined in `middleware/` directory

**Step B8: Fix role name inconsistency**
- Standardize on `super_admin` (or `admin`) across `auth.js` and `rbac.js`

---

## 3. Backend Database Alignment

The DB schema already supports the module-based architecture via `sop_modules` and `sop_module_attachments`. No new tables are needed.

| Frontend Concept | DB Table | Key Columns |
|---|---|---|
| SOP | `sops` | id, public_id, sop_code, title, description, department_id, category_id, status, owner_user_id, current_version_id |
| Module (replaces Sections + Steps) | `sop_modules` | id, sop_id, title, content (longtext), sort_order, created_by, updated_by |
| Module Attachment | `sop_module_attachments` | id, module_id, file_name, mime_type, file_extension, file_size, file_data, uploaded_by, download_count |
| SOP Version | `sop_versions` | id, public_id, sop_id, version, is_current, change_summary, status, created_by |
| SOP Approval | `sop_approvals` | id, sop_id, approver_user_id, status, comments |
| SOP Acknowledgement | `sop_acknowledgements` | id, sop_version_id, user_id, status |
| SOP Assignment | `sop_assignments` | id, sop_version_id, assigned_by, due_date, notes |
| SOP Audit Log | `sop_audit_logs` | id, public_id, entity_type, entity_id, action, performed_by, old_values, new_values |
| SOP Share | `sop_shares` | id, sop_id, share_type, share_with, permissions |
| SOP Document (version-level) | `sop_documents` | id, sop_version_id, filename, storage_path, mime_type, file_size, document_type |
| SOP Change Log | `sop_change_logs` | id, sop_version_id, field_name, old_value, new_value, changed_by |

### Backend API Endpoints (Consolidated)

All SOP endpoints are under `/api/sops` with a single router:

| Method | Endpoint | Handler | Description |
|---|---|---|---|
| GET | `/sops` | `sopController.list` | List SOPs with filters |
| GET | `/sops/:id` | `sopController.getById` | Get single SOP with modules |
| POST | `/sops` | `sopController.create` | Create SOP |
| PUT | `/sops/:id` | `sopController.update` | Update SOP |
| DELETE | `/sops/:id` | `sopController.remove` | Delete SOP |
| GET | `/sops/:id/modules` | `sopModuleController.list` | List modules for SOP |
| POST | `/sops/:id/modules` | `sopModuleController.create` | Create module |
| PUT | `/sops/modules/:moduleId` | `sopModuleController.update` | Update module |
| DELETE | `/sops/modules/:moduleId` | `sopModuleController.remove` | Delete module |
| PUT | `/sops/modules/:moduleId/sort` | `sopModuleController.updateSortOrder` | Reorder modules |
| POST | `/sops/modules/:moduleId/attachments` | `sopAttachmentController.upload` | Upload attachment to module |
| DELETE | `/sops/attachments/:attachmentId` | `sopAttachmentController.remove` | Delete attachment |
| GET | `/sops/:id/versions` | `sopVersionController.list` | List versions |
| POST | `/sops/:id/versions` | `sopVersionController.create` | Create version |
| POST | `/sops/:id/versions/:versionId/restore` | `sopVersionController.restore` | Restore version |
| GET | `/sops/:id/approvals` | `sopApprovalController.list` | List approvals |
| POST | `/sops/:id/approvals` | `sopApprovalController.create` | Create approval |
| PUT | `/sops/approvals/:approvalId` | `sopApprovalController.update` | Update approval |
| POST | `/sops/:id/transition` | `sopWorkflowController.transition` | Status transition |
| GET | `/sops/:id/audit` | `sopAuditController.list` | Get audit logs |
| GET | `/sops/:id/shares` | `sopShareController.list` | List shares |
| POST | `/sops/:id/shares` | `sopShareController.create` | Create share |
| GET | `/sops/:id/assignments` | `sopAssignmentController.list` | List assignments |
| POST | `/sops/:id/assignments` | `sopAssignmentController.create` | Create assignment |
| GET | `/sops/:id/acknowledgements` | `sopAcknowledgementController.list` | List acknowledgements |
| POST | `/sops/:id/acknowledgements` | `sopAcknowledgementController.create` | Create acknowledgement |
| POST | `/sops/:id/acknowledgements/:ackId/acknowledge` | `sopAcknowledgementController.acknowledge` | Acknowledge SOP |

---

## 4. Refactoring Steps (Frontend)

### Phase 1: Remove Unnecessary Components

**Empty/Placeholder Files (remove entirely):**
- `api/audit.api.js` — empty
- `services/approval.service.js` — empty
- `services/export.service.js` — empty
- `services/notification.service.js` — empty
- `services/publish.service.js` — empty
- `services/sop.service.js` — empty
- `services/version.service.js` — empty
- `services/workflow.service.js` — empty
- `utils/approvalHelper.js` — empty
- `utils/formatDate.js` — empty
- `validators/publish.validator.js` — empty
- `components/Editors/MarkdownEditor.jsx` — empty
- `components/Editors/RichTextEditor.jsx` — empty
- `components/Editors/SectionEditor.jsx` — empty
- `components/Editors/StepEditor.jsx` — empty

**Redundant/Obsolete Components (remove — replaced by new architecture):**
- `components/cards/` — entire directory (SOPCard, VersionCard, AttachmentCard, ApprovalCard, UserAssignmentCard) — replaced by ModuleCard and new panel components
- `components/drawers/` — entire directory (ActivityDrawer, AuditDrawer, HistoryDrawer, VersionDrawer) — replaced by AuditTimeline and VersionTimeline
- `components/tables/` — entire directory (SOPTable, VersionTable, AssignmentTable, ApprovalTable, AcknowledgementTable) — replaced by new workspace layout
- `components/tabs/` — entire directory (OverviewTab, SectionsTab, ProcedureTab, AttachmentsTab, AssignmentsTab, ApprovalsTab, VersionsTab, AuditTab) — replaced by SOPWorkspacePage layout
- `components/timeline/` — entire directory (ApprovalTimeline, AuditTimeline, VersionTimeline) — replaced by new AuditTimeline and VersionTimeline in new structure
- `components/forms/` — entire directory (SOPBasicInfoForm, SOPAttachmentForm, SOPAssignmentForm, SOPSectionForm, SOPStepForm, SOPPublishForm) — functionality absorbed into SOPEditor components
- `components/modals/` — entire directory (15 modal files) — replaced by inline editing in workspace page

**Deprecated Contexts (remove):**
- `context/SOPModalContext.jsx` — modal state management replaced by inline workspace UI
- `context/SOPPermissionContext.jsx` — permission logic should be handled at route/middleware level or a simpler auth check

**Deprecated Hooks (remove — replaced by new hooks):**
- `useAcknowledgements.js` — acknowledgement logic moves to `useModules.js` or a new `useAcknowledgements.js` if still needed
- `useApprovals.js` — moves to `useModules.js` or stays as-is if approval workflow is separate
- `useArchiveSOP.js` — consolidate into `useModules.js` or `sopService.js`
- `usePublishSOP.js` — consolidate into `useModules.js` or `sopService.js`
- `useCreateSOP.js` — consolidate into `sopService.js`
- `useDeleteSOP.js` — consolidate into `sopService.js`
- `useUpdateSOP.js` — consolidate into `sopService.js`
- `useRestoreVersion.js` — consolidate into `useVersions.js`
- `useShareSOP.js` — consolidate into `sopService.js`
- `useSOPDetails.js` — consolidate into `useModules.js`
- `useSOPFilters.js` — consolidate into `SOPListPage.jsx` local state
- `useSOPList.js` — consolidate into `sopService.js` + `useModules.js`
- `useSOPSections.js` — **removed** (sections replaced by modules)
- `useSOPSteps.js` — **removed** (steps replaced by modules)
- `useSOPVersions.js` — replaced by `useVersions.js`
- `useAssignments.js` — moves to `sopService.js` or `moduleService.js`
- `useAuditLogs.js` — moves to `AuditTimeline.jsx` or a new `useAuditLogs.js` if still needed
- `useCategoryList.js` — keep if still used by SOPListPage
- `useDepartmentList.js` — keep if still used by SOPListPage

**Deprecated Services (remove):**
- `services/acknowledgement.service.js` — merge into `sopService.js`
- `services/assignment.service.js` — merge into `sopService.js` or `moduleService.js`

**Deprecated Validators (remove):**
- `validators/publish.validator.js` — already empty
- `validators/section.validator.js` — **removed** (sections replaced by modules)
- `validators/step.validator.js` — **removed** (steps replaced by modules)
- `validators/sop.validator.js` — keep, rename to `sopService.js` validation
- `validators/assignment.validator.js` — keep if assignments still exist

**Deprecated Utils (remove):**
- `utils/approvalHelper.js` — already empty
- `utils/formatDate.js` — already empty
- `utils/sopStatus.js` — keep if still needed
- `utils/versionHelper.js` — keep if still needed
- `utils/compareVersions.js` — keep if still needed
- `utils/generateSOPCode.js` — keep if still needed
- `utils/downloadFile.js` — keep if still needed
- `utils/validationHelper.js` — keep if still needed
- `utils/apiResponse.js` — keep if still needed

**Deprecated Constants (remove):**
- `constants/sectionTypes.js` — **remove** (sections replaced by modules)
- `constants/documentTypes.js` — keep if still needed
- `constants/approvalStatus.js` — keep if still needed

**Deprecated Routes:**
- `routes/sop.routes.js` — rewrite to use new page structure

**Deprecated Pages:**
- `pages/SOPDetailsPage.jsx` — replace with `SOPWorkspacePage.jsx` and `SOPVersionPage.jsx`

---

### Phase 2: Create New Components

#### 2.1 `components/SOPEditor/`

| File | Purpose |
|---|---|
| `ModuleList.jsx` | Renders the list of modules for an SOP, supports drag-and-drop reordering via SortableModuleList |
| `ModuleCard.jsx` | Displays a single module with title, preview of content, attachment count, and action buttons (edit, delete, reorder) |
| `ModuleEditor.jsx` | Inline editor for a module's title and content (rich text). Opens when ModuleCard is clicked |
| `RichTextEditor.jsx` | Rich text editing component using TipTap. Supports bold, italic, headings, lists, links, and images |
| `AttachmentUploader.jsx` | File upload component scoped to a single module. Shows upload progress, file list, and download/delete actions |
| `ModuleToolbar.jsx` | Toolbar with actions: Add Module, Reorder Modules, Expand/Collapse All, Bulk Delete |
| `SortableModuleList.jsx` | Drag-and-drop enabled module list using dnd-kit or similar. Handles reorder logic and calls moduleService.updateSortOrder() |

#### 2.2 `components/VersionTimeline.jsx`

- Displays version history as a vertical timeline
- Shows version number, status, change summary, created_by, created_at
- Click-to-restore functionality
- Replaces the old `drawers/VersionDrawer.jsx` and `timeline/VersionTimeline.jsx`

#### 2.3 `components/ApprovalPanel.jsx`

- Displays approval workflow for an SOP
- Shows pending approvals with approve/reject buttons
- Displays approval history (who approved/rejected, when, comments)
- Replaces the old `tabs/ApprovalsTab.jsx` and `modals/ApproveModal.jsx` + `RejectModal.jsx`

#### 2.4 `components/AuditTimeline.jsx`

- Displays audit log entries as a vertical timeline
- Shows action type, user, timestamp, and changed values (old → new)
- Replaces the old `drawers/AuditDrawer.jsx` and `timeline/AuditTimeline.jsx`

---

### Phase 3: Create New Hooks

| Hook | Purpose | Replaces |
|---|---|---|
| `useModules.js` | CRUD for sop_modules, including sort order management, content updates, and module-level attachments | useSOPSections.js, useSOPSteps.js, useSOPDetails.js |
| `useAttachments.js` | Upload, list, download, delete attachments scoped to a module | useAttachments.js (existing, but needs rewrite) |
| `useVersions.js` | List versions, create new version, restore a version | useSOPVersions.js (existing, but needs rewrite) |

---

### Phase 4: Create New Services

| Service | Purpose | Replaces |
|---|---|---|
| `sopService.js` | SOP CRUD, status transitions, assignments, acknowledgements, shares | sop.api.js, acknowledgement.api.js, assignment.api.js, share.api.js, approval.api.js |
| `moduleService.js` | Module CRUD, sort order, content updates | section.api.js, step.api.js (old API files) |
| `attachmentService.js` | Module attachment upload, download, delete | attachment.api.js |
| `versionService.js` | Version CRUD, restore | version.api.js |

---

### Phase 5: Create New Pages

#### `pages/SOPListPage.jsx`
- Refactored from existing `SOPListPage.jsx`
- Simplified: SOP list with search, status filter, department filter
- Create SOP button
- Uses `sopService.js` via `useModules.js` hook
- Removes: archive modal, create wizard (simplified to inline create)

#### `pages/SOPWorkspacePage.jsx`
- **New page** — replaces `SOPDetailsPage.jsx`
- Central workspace for viewing and editing an SOP
- Layout:
  - Left sidebar: Module list (ModuleList.jsx)
  - Center: Module editor (ModuleEditor.jsx / RichTextEditor.jsx)
  - Right sidebar: ApprovalPanel.jsx + AuditTimeline.jsx
- Features:
  - Module CRUD (create, edit, delete, reorder)
  - Rich text editing per module
  - Attachment upload per module
  - Inline approval actions
  - Status transition buttons (Draft → For Review → Approved → Published → Archived)
  - Version history sidebar toggle

#### `pages/SOPVersionPage.jsx`
- **New page** — for viewing a specific version of an SOP
- Displays: version metadata, all modules at that version point, documents, approvals
- Read-only view with "Restore this version" button
- Uses `useVersions.js` hook

---

### Phase 6: Update Routing

Rewrite `routes/sop.routes.js` (or create `sop-management.routes.js`) to use the new page structure:

```js
sopRouteConfig = [
  { path: '', element: SOPListPage },
  { path: ':id', element: SOPWorkspacePage },
  { path: ':id/versions/:versionId', element: SOPVersionPage },
]
```

---

### Phase 7: Constants and Utilities (Keep/Consolidate)

**Keep:**
- `constants/sopStatus.js` — status enums and transitions
- `constants/assignmentTypes.js` — assignment type enums
- `constants/pagination.js` — pagination defaults
- `constants/permissions.js` — role/action/scope matrix
- `utils/generateSOPCode.js` — SOP code generation
- `utils/versionHelper.js` — version bumping
- `utils/compareVersions.js` — version comparison
- `utils/downloadFile.js` — file download utility
- `utils/apiResponse.js` — API response helpers
- `utils/validationHelper.js` — query param normalization
- `utils/sopStatus.js` — status transition helper
- `validators/sop.validator.js` — SOP validation
- `validators/assignment.validator.js` — assignment validation

**Remove:**
- `constants/sectionTypes.js` — sections no longer exist
- `constants/documentTypes.js` — if not used in new architecture
- `constants/approvalStatus.js` — if consolidated into sopStatus.js

---

### Phase 8: Context Consolidation

**Keep:**
- `context/SOPContext.jsx` — simplified to only `selectedSopId` and `refreshKey`

**Remove:**
- `context/SOPModalContext.jsx` — modal state replaced by inline workspace UI
- `context/SOPPermissionContext.jsx` — permission checks should use the existing `permissions.js` constants directly or via a simpler auth check

---

### Phase 9: API Layer Consolidation (Frontend)

The existing `api/` directory has many files, most of which map to the new service layer. After refactoring:

- `api/sop.api.js` — keep as-is (SOP CRUD)
- `api/version.api.js` — keep as-is (version CRUD)
- `api/attachment.api.js` — keep as-is (attachment CRUD)
- `api/section.api.js` — **remove** (sections replaced by modules)
- `api/step.api.js` — **remove** (steps replaced by modules)
- `api/assignment.api.js` — keep if assignments still exist
- `api/approval.api.js` — keep if approval workflow still exists
- `api/acknowledgement.api.js` — keep if acknowledgements still exist
- `api/share.api.js` — keep if sharing still exists
- `api/audit.api.js` — **remove** (already empty)

---

## 5. Key Architectural Decisions

1. **Modules replace Sections and Steps**: The `sop_modules` table is the single content container. Each module has a title, rich text content, sort order, and its own attachments. This simplifies the data model significantly.

2. **Workspace-centric UI**: Instead of a tabbed details page, the new `SOPWorkspacePage.jsx` provides a three-panel layout (module list | editor | sidebar) that is more intuitive for module-based editing.

3. **Service layer consolidation**: The 9 existing service files (most empty) consolidate into 4 focused services matching the 4 core entities: SOP, Module, Attachment, Version.

4. **Hook consolidation**: The 19 existing hooks consolidate into 3 focused hooks matching the 3 data-fetching concerns: modules, attachments, versions. SOP CRUD operations live in the service layer, not hooks.

5. **Inline editing over modals**: The new architecture favors inline editing (ModuleEditor, ModuleCard editing) over modal-based workflows, reducing the need for 15+ modal components.

6. **Backend: Single router per feature**: SOP code lives in `routes/sops.js` and `controllers/sopController.js` only. No splitting across 8 files. No duplicated middleware.

7. **Backend: Routes → Controllers → Services → Models**: Strict layering. Routes never import models directly. Controllers never contain business logic. Services never contain HTTP concerns.

8. **Backend: No cross-feature imports in SOP code**: SOP services do not import non-SOP services. Shared utilities (audit logger, auth middleware) live outside the SOP module.

9. **Backend: Consistent response format**: All responses follow `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`.

10. **Backend: Consistent error handling**: Centralized error middleware in `server.js`, not per-handler try/catch blocks.

---

## 6. Migration Path

### Frontend
1. Remove all empty/placeholder files first
2. Remove deprecated component directories (cards, drawers, tables, tabs, timeline, forms, modals, Editors)
3. Remove deprecated hooks, services, validators, utils, constants
4. Create new directory structure
5. Implement new services (sopService, moduleService, attachmentService, versionService)
6. Implement new hooks (useModules, useAttachments, useVersions)
7. Implement new components (SOPEditor/*, VersionTimeline, ApprovalPanel, AuditTimeline)
8. Implement new pages (SOPListPage refactored, SOPWorkspacePage new, SOPVersionPage new)
9. Update routing
10. Update context
11. Update constants/keep list
12. Wire up API endpoints to new service layer

### Backend
1. Create `controllers/sopController.js` with all SOP HTTP handlers
2. Create dedicated controllers for sub-resources (module, attachment, version, approval, workflow, audit, share, assignment, acknowledgement)
3. Create service layer files for each controller
4. Create model files for each entity (sopModuleModel, sopModuleAttachmentModel, etc.)
5. Consolidate SOP routes into single `routes/sops.js` with sub-router mounting
6. Remove the 7 other SOP route files
7. Remove dead controller files from `controllers/`
8. Fix `config/database.js` — extract migrations, keep connection config only
9. Simplify `server.js` — route mounting only
10. Fix role name inconsistency between `auth.js` and `rbac.js`
11. Standardize response format across all SOP endpoints
12. Add centralized error handling middleware

---

## 7. Open Questions

1. **RichTextEditor implementation**: The new `RichTextEditor.jsx` needs a rich text editor library. Should it use TipTap, Draft.js, Quill, or another library? The existing `MarkdownEditor.jsx` is also empty — should both be implemented?
2. **Approval workflow**: The `sop_approvals` table exists in the DB but the current codebase has minimal approval UI. Should the new `ApprovalPanel.jsx` support the full `workflow_instances`/`workflow_steps`/`workflow_actions` tables from the DB schema?
3. **Acknowledgements**: The `sop_acknowledgements` table exists. Should acknowledgement functionality be part of `useModules.js` or a separate hook?
4. **Assignments**: The `sop_assignments` table exists. Should assignment management be part of the workspace or a separate feature?
5. **SOPVersionPage.jsx**: Should this be a standalone page or a modal/drawer within SOPWorkspacePage.jsx?
6. **dnd-kit dependency**: The existing `SOPStepForm.jsx` uses `@dnd-kit/*` for drag-and-drop. Should the new `SortableModuleList.jsx` use the same library? Is it already a dependency?

---

## 2. Backend Database Alignment

The DB schema already supports the module-based architecture via `sop_modules` and `sop_module_attachments`. No new tables are needed. The frontend refactor must map to these existing tables:

| Frontend Concept | DB Table | Key Columns |
|---|---|---|
| SOP | `sops` | id, public_id, sop_code, title, description, department_id, category_id, status, owner_user_id, current_version_id |
| Module (replaces Sections + Steps) | `sop_modules` | id, sop_id, title, content (longtext), sort_order, created_by, updated_by |
| Module Attachment | `sop_module_attachments` | id, module_id, file_name, mime_type, file_extension, file_size, file_data, uploaded_by, download_count |
| SOP Version | `sop_versions` | id, public_id, sop_id, version, is_current, change_summary, status, created_by |
| SOP Approval | `sop_approvals` | id, sop_id, approver_user_id, status, comments |
| SOP Acknowledgement | `sop_acknowledgements` | id, sop_version_id, user_id, status |
| SOP Assignment | `sop_assignments` | id, sop_version_id, assigned_by, due_date, notes |
| SOP Audit Log | `sop_audit_logs` | id, public_id, entity_type, entity_id, action, performed_by, old_values, new_values |
| SOP Share | `sop_shares` | id, sop_id, share_type, share_with, permissions |
| SOP Document (version-level) | `sop_documents` | id, sop_version_id, filename, storage_path, mime_type, file_size, document_type |
| SOP Change Log | `sop_change_logs` | id, sop_version_id, field_name, old_value, new_value, changed_by |

### Backend API Endpoints Required

The existing API layer (`api/` directory) already has most endpoints. The refactor should consolidate them into the service layer:

- `GET/POST/PUT/DELETE /sops` — SOP CRUD
- `GET /sops/:id/modules` — List modules for an SOP
- `POST /sops/:id/modules` — Create a module
- `PUT /sops/modules/:moduleId` — Update a module
- `DELETE /sops/modules/:moduleId` — Delete a module
- `POST /sops/modules/:moduleId/attachments` — Upload attachment to module
- `DELETE /sops/attachments/:attachmentId` — Delete attachment
- `GET /sops/:id/versions` — List versions
- `POST /sops/:id/versions` — Create version
- `POST /sops/:id/versions/:versionId/restore` — Restore version
- `GET /sops/:id/approvals` — List approvals
- `POST /sops/:id/approvals` — Create approval
- `GET /sops/:id/audit` — Get audit logs
- `POST /sops/:id/transition` — Status transition

---

## 3. Refactoring Steps

### Phase 1: Remove Unnecessary Components

The following current files are either empty placeholders, redundant, or will be replaced by the new architecture. They should be removed:

**Empty/Placeholder Files (remove entirely):**
- `api/audit.api.js` — empty
- `services/approval.service.js` — empty
- `services/export.service.js` — empty
- `services/notification.service.js` — empty
- `services/publish.service.js` — empty
- `services/sop.service.js` — empty
- `services/version.service.js` — empty
- `services/workflow.service.js` — empty
- `utils/approvalHelper.js` — empty
- `utils/formatDate.js` — empty
- `validators/publish.validator.js` — empty
- `components/Editors/MarkdownEditor.jsx` — empty
- `components/Editors/RichTextEditor.jsx` — empty
- `components/Editors/SectionEditor.jsx` — empty
- `components/Editors/StepEditor.jsx` — empty

**Redundant/Obsolete Components (remove — replaced by new architecture):**
- `components/cards/` — entire directory (SOPCard, VersionCard, AttachmentCard, ApprovalCard, UserAssignmentCard) — replaced by ModuleCard and new panel components
- `components/drawers/` — entire directory (ActivityDrawer, AuditDrawer, HistoryDrawer, VersionDrawer) — replaced by AuditTimeline and VersionTimeline
- `components/tables/` — entire directory (SOPTable, VersionTable, AssignmentTable, ApprovalTable, AcknowledgementTable) — replaced by new workspace layout
- `components/tabs/` — entire directory (OverviewTab, SectionsTab, ProcedureTab, AttachmentsTab, AssignmentsTab, ApprovalsTab, VersionsTab, AuditTab) — replaced by SOPWorkspacePage layout
- `components/timeline/` — entire directory (ApprovalTimeline, AuditTimeline, VersionTimeline) — replaced by new AuditTimeline and VersionTimeline in new structure
- `components/forms/` — entire directory (SOPBasicInfoForm, SOPAttachmentForm, SOPAssignmentForm, SOPSectionForm, SOPStepForm, SOPPublishForm) — functionality absorbed into SOPEditor components
- `components/modals/` — entire directory (15 modal files) — replaced by inline editing in workspace page

**Deprecated Contexts (remove):**
- `context/SOPModalContext.jsx` — modal state management replaced by inline workspace UI
- `context/SOPPermissionContext.jsx` — permission logic should be handled at route/middleware level or a simpler auth check

**Deprecated Hooks (remove — replaced by new hooks):**
- `useAcknowledgements.js` — acknowledgement logic moves to `useModules.js` or a new `useAcknowledgements.js` if still needed
- `useApprovals.js` — moves to `useModules.js` or stays as-is if approval workflow is separate
- `useArchiveSOP.js` — consolidate into `useModules.js` or `sopService.js`
- `usePublishSOP.js` — consolidate into `useModules.js` or `sopService.js`
- `useCreateSOP.js` — consolidate into `sopService.js`
- `useDeleteSOP.js` — consolidate into `sopService.js`
- `useUpdateSOP.js` — consolidate into `sopService.js`
- `useRestoreVersion.js` — consolidate into `useVersions.js`
- `useShareSOP.js` — consolidate into `sopService.js`
- `useSOPDetails.js` — consolidate into `useModules.js`
- `useSOPFilters.js` — consolidate into `SOPListPage.jsx` local state
- `useSOPList.js` — consolidate into `sopService.js` + `useModules.js`
- `useSOPSections.js` — **removed** (sections replaced by modules)
- `useSOPSteps.js` — **removed** (steps replaced by modules)
- `useSOPVersions.js` — replaced by `useVersions.js`
- `useAssignments.js` — moves to `sopService.js` or `moduleService.js`
- `useAuditLogs.js` — moves to `AuditTimeline.jsx` or a new `useAuditLogs.js` if still needed
- `useCategoryList.js` — keep if still used by SOPListPage
- `useDepartmentList.js` — keep if still used by SOPListPage

**Deprecated Services (remove):**
- `services/acknowledgement.service.js` — merge into `sopService.js`
- `services/assignment.service.js` — merge into `sopService.js` or `moduleService.js`

**Deprecated Validators (remove):**
- `validators/publish.validator.js` — already empty
- `validators/section.validator.js` — **removed** (sections replaced by modules)
- `validators/step.validator.js` — **removed** (steps replaced by modules)
- `validators/sop.validator.js` — keep, rename to `sopService.js` validation
- `validators/assignment.validator.js` — keep if assignments still exist

**Deprecated Utils (remove):**
- `utils/approvalHelper.js` — already empty
- `utils/formatDate.js` — already empty
- `utils/sopStatus.js` — keep if still needed
- `utils/versionHelper.js` — keep if still needed
- `utils/compareVersions.js` — keep if still needed
- `utils/generateSOPCode.js` — keep if still needed
- `utils/downloadFile.js` — keep if still needed
- `utils/validationHelper.js` — keep if still needed
- `utils/apiResponse.js` — keep if still needed

**Deprecated Constants (remove):**
- `constants/approvalStatus.js` — keep if still needed
- `constants/sectionTypes.js` — **remove** (sections replaced by modules)
- `constants/documentTypes.js` — keep if still needed

**Deprecated Routes:**
- `routes/sop.routes.js` — rewrite to use new page structure

**Deprecated Pages:**
- `pages/SOPDetailsPage.jsx` — replace with `SOPWorkspacePage.jsx` and `SOPVersionPage.jsx`

---

### Phase 2: Create New Components

#### 2.1 `components/SOPEditor/`

| File | Purpose |
|---|---|
| `ModuleList.jsx` | Renders the list of modules for an SOP, supports drag-and-drop reordering via SortableModuleList |
| `ModuleCard.jsx` | Displays a single module with title, preview of content, attachment count, and action buttons (edit, delete, reorder) |
| `ModuleEditor.jsx` | Inline editor for a module's title and content (rich text). Opens when ModuleCard is clicked |
| `RichTextEditor.jsx` | Rich text editing component (currently empty placeholder — needs implementation). Should support bold, italic, headings, lists, links, and images |
| `AttachmentUploader.jsx` | File upload component scoped to a single module. Shows upload progress, file list, and download/delete actions |
| `ModuleToolbar.jsx` | Toolbar with actions: Add Module, Reorder Modules, Expand/Collapse All, Bulk Delete |
| `SortableModuleList.jsx` | Drag-and-drop enabled module list using dnd-kit or similar. Handles reorder logic and calls moduleService.updateSortOrder() |

#### 2.2 `components/VersionTimeline.jsx`

- Displays version history as a vertical timeline
- Shows version number, status, change summary, created_by, created_at
- Click-to-restore functionality
- Replaces the old `drawers/VersionDrawer.jsx` and `timeline/VersionTimeline.jsx`

#### 2.3 `components/ApprovalPanel.jsx`

- Displays approval workflow for an SOP
- Shows pending approvals with approve/reject buttons
- Displays approval history (who approved/rejected, when, comments)
- Replaces the old `tabs/ApprovalsTab.jsx` and `modals/ApproveModal.jsx` + `RejectModal.jsx`

#### 2.4 `components/AuditTimeline.jsx`

- Displays audit log entries as a vertical timeline
- Shows action type, user, timestamp, and changed values (old → new)
- Replaces the old `drawers/AuditDrawer.jsx` and `timeline/AuditTimeline.jsx`

---

### Phase 3: Create New Hooks

| Hook | Purpose | Replaces |
|---|---|---|
| `useModules.js` | CRUD for sop_modules, including sort order management, content updates, and module-level attachments | useSOPSections.js, useSOPSteps.js, useSOPDetails.js |
| `useAttachments.js` | Upload, list, download, delete attachments scoped to a module | useAttachments.js (existing, but needs rewrite) |
| `useVersions.js` | List versions, create new version, restore a version | useSOPVersions.js (existing, but needs rewrite) |

---

### Phase 4: Create New Services

| Service | Purpose | Replaces |
|---|---|---|
| `sopService.js` | SOP CRUD, status transitions, assignments, acknowledgements, shares | sop.api.js, acknowledgement.api.js, assignment.api.js, share.api.js, approval.api.js |
| `moduleService.js` | Module CRUD, sort order, content updates | section.api.js, step.api.js (old API files) |
| `attachmentService.js` | Module attachment upload, download, delete | attachment.api.js |
| `versionService.js` | Version CRUD, restore | version.api.js |

---

### Phase 5: Create New Pages

#### `pages/SOPListPage.jsx`
- Refactored from existing `SOPListPage.jsx`
- Simplified: SOP list with search, status filter, department filter
- Create SOP button
- Uses `sopService.js` via `useModules.js` hook
- Removes: archive modal, create wizard (simplified to inline create)

#### `pages/SOPWorkspacePage.jsx`
- **New page** — replaces `SOPDetailsPage.jsx`
- Central workspace for viewing and editing an SOP
- Layout:
  - Left sidebar: Module list (ModuleList.jsx)
  - Center: Module editor (ModuleEditor.jsx / RichTextEditor.jsx)
  - Right sidebar: ApprovalPanel.jsx + AuditTimeline.jsx
- Features:
  - Module CRUD (create, edit, delete, reorder)
  - Rich text editing per module
  - Attachment upload per module
  - Inline approval actions
  - Status transition buttons (Draft → For Review → Approved → Published → Archived)
  - Version history sidebar toggle

#### `pages/SOPVersionPage.jsx`
- **New page** — for viewing a specific version of an SOP
- Displays: version metadata, all modules at that version point, documents, approvals
- Read-only view with "Restore this version" button
- Uses `useVersions.js` hook

---

### Phase 6: Update Routing

Rewrite `routes/sop.routes.js` (or create `sop-management.routes.js`) to use the new page structure:

```js
sopRouteConfig = [
  { path: '', element: SOPListPage },
  { path: ':id', element: SOPWorkspacePage },
  { path: ':id/versions/:versionId', element: SOPVersionPage },
]
```

---

### Phase 7: Constants and Utilities (Keep/Consolidate)

**Keep:**
- `constants/sopStatus.js` — status enums and transitions
- `constants/assignmentTypes.js` — assignment type enums
- `constants/pagination.js` — pagination defaults
- `constants/permissions.js` — role/action/scope matrix
- `utils/generateSOPCode.js` — SOP code generation
- `utils/versionHelper.js` — version bumping
- `utils/compareVersions.js` — version comparison
- `utils/downloadFile.js` — file download utility
- `utils/apiResponse.js` — API response helpers
- `utils/validationHelper.js` — query param normalization
- `utils/sopStatus.js` — status transition helper
- `validators/sop.validator.js` — SOP validation
- `validators/assignment.validator.js` — assignment validation

**Remove:**
- `constants/sectionTypes.js` — sections no longer exist
- `constants/documentTypes.js` — if not used in new architecture
- `constants/approvalStatus.js` — if consolidated into sopStatus.js

---

## 4. Context Consolidation

**Keep:**
- `context/SOPContext.jsx` — simplified to only `selectedSopId` and `refreshKey`

**Remove:**
- `context/SOPModalContext.jsx` — modal state replaced by inline workspace UI
- `context/SOPPermissionContext.jsx` — permission checks should use the existing `permissions.js` constants directly or via a simpler auth check

---

## 5. API Layer Consolidation

The existing `api/` directory has many files, most of which map to the new service layer. After refactoring:

- `api/sop.api.js` — keep as-is (SOP CRUD)
- `api/version.api.js` — keep as-is (version CRUD)
- `api/attachment.api.js` — keep as-is (attachment CRUD)
- `api/section.api.js` — **remove** (sections replaced by modules)
- `api/step.api.js` — **remove** (steps replaced by modules)
- `api/assignment.api.js` — keep if assignments still exist
- `api/approval.api.js` — keep if approval workflow still exists
- `api/acknowledgement.api.js` — keep if acknowledgements still exist
- `api/share.api.js` — keep if sharing still exists
- `api/audit.api.js` — **remove** (already empty)

---

## 6. Key Architectural Decisions

1. **Modules replace Sections and Steps**: The `sop_modules` table is the single content container. Each module has a title, rich text content, sort order, and its own attachments. This simplifies the data model significantly.

2. **Workspace-centric UI**: Instead of a tabbed details page, the new `SOPWorkspacePage.jsx` provides a three-panel layout (module list | editor | sidebar) that is more intuitive for module-based editing.

3. **Service layer consolidation**: The 9 existing service files (most empty) consolidate into 4 focused services matching the 4 core entities: SOP, Module, Attachment, Version.

4. **Hook consolidation**: The 19 existing hooks consolidate into 3 focused hooks matching the 3 data-fetching concerns: modules, attachments, versions. SOP CRUD operations live in the service layer, not hooks.

5. **Inline editing over modals**: The new architecture favors inline editing (ModuleEditor, ModuleCard editing) over modal-based workflows, reducing the need for 15+ modal components.

---

## 7. Migration Path

1. Remove all empty/placeholder files first
2. Remove deprecated component directories (cards, drawers, tables, tabs, timeline, forms, modals, Editors)
3. Remove deprecated hooks, services, validators, utils, constants
4. Create new directory structure
5. Implement new services (sopService, moduleService, attachmentService, versionService)
6. Implement new hooks (useModules, useAttachments, useVersions)
7. Implement new components (SOPEditor/*, VersionTimeline, ApprovalPanel, AuditTimeline)
8. Implement new pages (SOPListPage refactored, SOPWorkspacePage new, SOPVersionPage new)
9. Update routing
10. Update context
11. Update constants/keep list
12. Wire up API endpoints to new service layer

---

## 8. Open Questions

1. **RichTextEditor implementation**: The new `RichTextEditor.jsx` needs TipTap (user preference confirmed). The existing `MarkdownEditor.jsx` is also empty — should both be implemented with TipTap, or should Markdown be dropped entirely?
- Drop completely the Markdown.

2. **Approval workflow**: The `sop_approvals` table exists in the DB. The new `ApprovalPanel.jsx` should support the full `workflow_instances`/`workflow_steps`/`workflow_actions` tables from the DB schema. **Confirmed: Yes.**

3. **Acknowledgements**: The `sop_acknowledgements` table exists. Should acknowledgement functionality be part of `useModules.js` or a separate hook?
- create a separate hook

4. **Assignments**: The `sop_assignments` table exists. Should assignment management be part of the workspace or a separate feature?
- its part of the workspace

5. **SOPVersionPage.jsx**: Should this be a standalone page or a modal/drawer within SOPWorkspacePage.jsx?


6. **dnd-kit dependency**: The existing `SOPStepForm.jsx` uses `@dnd-kit/*` for drag-and-drop. Should the new `SortableModuleList.jsx` use the same library? Is it already a dependency?
- Yes

7. **Backend: Controller vs inline handlers**: The current backend uses inline handlers in route files (no controller layer). The plan introduces dedicated controllers. Should the backend refactor use a proper controller layer, or keep the route-as-controller pattern but just consolidate the 8 SOP route files into 1?
- use a proper controller layer

8. **Backend: Service layer consistency**: The current backend has an incomplete service layer (only `sopAssignmentService.js` and `sopAcknowledgementService.js` are used). The plan proposes a service for every controller. Should all services be implemented, or should some controllers call models directly for simplicity?
- all services be implemented

9. **Backend: Migration strategy**: The plan proposes extracting migrations from `config/database.js`. Should migrations be kept inline (simpler) or extracted to separate files (cleaner)?
- kept inline (simpler)
