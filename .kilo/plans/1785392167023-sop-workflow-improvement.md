# SOP Workflow Improvement Plan

## 1. Problem Statement

The current SOP system has a coarse-grained, SOP-only workflow with no module or attachment-level state management:

- **Modules** (`sop_modules`) have no `status` column — they are stateless content entities.
- **Attachments** (`sop_documents`) also have no `status` column.
- The SOP-level workflow (`Draft → For Review → Approved → Published → Archived`) exists in the backend (`sopUtils.js`, `sopWorkflowModel.js`) but is **not wired into the frontend UI** — the `ApprovalPanel` has hardcoded no-op handlers (`onApprove={() => {}}`, `onReject={() => {}}`).
- No validation checks that modules are complete before submitting an SOP for review.
- No per-module approval/rejection — approvers can only approve/reject the entire SOP, with no granularity.
- No "Submit for Review", "Approve", "Reject", or "Publish" buttons visible to users in the workspace.

## 2. Proposed Workflow Design

### 2.1 Module-Level State Machine

Add a `status` column to `sop_modules` with these states:

```
Draft ──► In Review ──► Approved
            ▲              │
            └──────────────┘  (Reject → back to Draft)
```

| Transition | Trigger | Validation |
|---|---|---|
| `Draft` → `In Review` | Module author clicks "Submit Module for Review" | Module must have non-empty `title` and `content`; at least one attachment required if `document_type` is specified |
| `In Review` → `Approved` | Reviewer clicks "Approve Module" | Module must be in `In Review` state |
| `In Review` → `Draft` | Reviewer clicks "Reject Module" | Module must be in `In Review` state; rejection comment stored |

### 2.2 SOP-Level Workflow (Enhanced)

The existing SOP workflow is enhanced with validation gates:

```
Draft ──► For Review ──► Approved ──► Published ──► Archived
            ▲              │
            └──────────────┘  (Reject → back to Draft)
```

| Transition | Validation |
|---|---|
| `Draft` → `For Review` | All modules must exist and have `status = 'Approved'` or `status = 'In Review'`; at least one module must exist |
| `For Review` → `Approved` | All module approvals must be resolved (no pending module approvals) |
| `For Review` → `Draft` | Reject — sends SOP back to draft; all module statuses reset to `Draft` |
| `Approved` → `Published` | All modules must have `status = 'Approved'` |
| `Published` → `Archived` | No validation needed |

### 2.3 Per-Module Approval System

When a module is in `In Review` state, designated reviewers can:
- **Approve**: Move module to `Approved`, record approver ID and timestamp
- **Reject**: Move module back to `Draft`, record rejection comment

Approval records are stored in a new `sop_module_approvals` table.

### 2.4 UI Workflow in SOPWorkspacePage

The workspace sidebar will show:
1. **Module list** with status badges (Draft / In Review / Approved)
2. **Module action buttons** when a module is selected:
   - "Submit Module for Review" (if module is in Draft state)
   - "Approve Module" / "Reject Module" (if module is In Review and user is a reviewer)
3. **SOP-level action bar** at the top:
   - "Submit SOP for Review" (if all modules meet criteria)
   - "Approve SOP" (if SOP is For Review)
   - "Reject SOP" (if SOP is For Review)
   - "Publish SOP" (if SOP is Approved and all modules are Approved)
4. **Per-module approval panel** showing pending module approvals with comment fields

## 3. Database Changes

### 3.1 `sop_modules` — Add workflow columns

```sql
ALTER TABLE sop_modules
  ADD COLUMN status ENUM('Draft','In Review','Approved') NOT NULL DEFAULT 'Draft' AFTER sort_order,
  ADD COLUMN reviewed_by INT NULL AFTER status,
  ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by,
  ADD COLUMN review_comment TEXT NULL AFTER reviewed_at,
  ADD INDEX idx_sop_modules_status (sop_id, status);

-- Foreign key for reviewed_by
ALTER TABLE sop_modules
  ADD CONSTRAINT fk_module_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
```

### 3.2 `sop_module_approvals` — New table for per-module approvals

```sql
CREATE TABLE IF NOT EXISTS sop_module_approvals (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(36)     NOT NULL DEFAULT (UUID()),
  sop_id          INT NOT NULL,
  sop_version_id  INT NULL,
  module_id       INT NOT NULL,
  approver_user_id INT NOT NULL,
  status          ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  comments        TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  CONSTRAINT pk_sop_module_approvals PRIMARY KEY (id),
  CONSTRAINT uq_module_approval UNIQUE (module_id, approver_user_id),
  CONSTRAINT fk_module_approval_sop FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
  CONSTRAINT fk_module_approval_version FOREIGN KEY (sop_version_id) REFERENCES sop_versions(id) ON DELETE SET NULL,
  CONSTRAINT fk_module_approval_module FOREIGN KEY (module_id) REFERENCES sop_modules(id) ON DELETE CASCADE,
  CONSTRAINT fk_module_approval_user FOREIGN KEY (approver_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.3 `sop_change_logs` — Already exists for SOP-level changes; module changes will use the same log via `sopAuditLogService`

### 3.4 Migration File

Create `server/migrations/sopModuleWorkflow.js` following the existing pattern.

## 4. Backend Changes

### 4.1 New Files

| File | Purpose |
|---|---|
| `server/services/sopModuleWorkflowService.js` | Module-level transition logic (Submit, Approve, Reject) with validation |
| `server/controllers/sopModuleWorkflowController.js` | HTTP endpoints for module workflow actions |
| `server/services/sopModuleApprovalService.js` | CRUD for module approval records |
| `server/models/sopModuleApprovalModel.js` | Database access for `sop_module_approvals` |

### 4.2 Modified Files

| File | Changes |
|---|---|
| `server/utils/sopUtils.js` | Add `canTransitionModuleTo()`, `getNextModuleStatus()`, and `validateSopSubmit()` |
| `server/services/sopWorkflowService.js` | Add module-completeness validation before SOP transitions |
| `server/services/sopModuleService.js` | Add `updateModuleStatus()` method |
| `server/models/sopModuleModel.js` | Add `updateStatus()` method |
| `server/controllers/sopController.js` | Wire up module workflow endpoints to the sopController or use separate controller |
| `server/routes/sops.js` | Add routes for module workflow transitions |

### 4.3 API Endpoints (New or Updated)

```
# Module Workflow
PUT   /sops/modules/:moduleId/transition       # Submit for review / Approve / Reject
GET   /sops/modules/:moduleId/approvals        # List approvals for a module
POST  /sops/modules/:moduleId/approvals        # Create an approval record
PUT   /sops/modules/:moduleId/approvals/:id    # Update approval (approve/reject)

# SOP Workflow (enhanced)
POST  /sops/:sopId/submit                      # Submit SOP for review (validates modules)
POST  /sops/:sopId/approve                     # Approve SOP (validates module approvals resolved)
POST  /sops/:sopId/reject                      # Reject SOP (resets modules to Draft)
POST  /sops/:sopId/publish                     # Publish SOP (validates all modules approved)
```

### 4.4 Validation Rules

- **Module Submit for Review**: `title` and `content` must be non-empty; module must be in `Draft` state.
- **Module Approve**: Module must be in `In Review` state; approver must not already have an approval record for this module.
- **Module Reject**: Module must be in `In Review` state; rejection comment is required.
- **SOP Submit for Review**: SOP must be in `Draft` state; at least one module must exist; all modules must have `status` of `Approved` or `In Review`.
- **SOP Approve**: SOP must be in `For Review` state; all module approvals must be resolved (no `Pending` approvals).
- **SOP Publish**: SOP must be in `Approved` state; all modules must have `status = 'Approved'`.

## 5. Frontend Changes

### 5.1 New/Updated Files

| File | Changes |
|---|---|
| `client/src/features/sop-management/components/SOPEditor/ModuleList.jsx` | Add status badges per module; add workflow action buttons per module |
| `client/src/features/sop-management/components/SOPEditor/ModuleCard.jsx` | Show module status; show "Submit Review" button when Draft |
| `client/src/features/sop-management/components/ApprovalPanel.jsx` | Wire `onApprove`/`onReject` to actual API calls; add module-level approval list |
| `client/src/features/sop-management/pages/SOPWorkspacePage.jsx` | Add SOP-level action bar (Submit, Approve, Reject, Publish); wire workflow handlers |
| `client/src/features/sop-management/hooks/useModules.js` | Add `submitModuleForReview`, `approveModule`, `rejectModule` functions |
| `client/src/features/sop-management/services/moduleService.js` | Add `submitForReview(moduleId)`, `approveModule(moduleId)`, `rejectModule(moduleId, comment)` |
| `client/src/features/sop-management/services/sopService.js` | Add `submitSop(sopId)`, `approveSop(sopId)`, `rejectSop(sopId)`, `publishSop(sopId)` |
| `client/src/features/sop-management/context/SOPContext.jsx` | No changes needed (already has refreshKey for re-fetching) |

### 5.2 UI Components to Add

1. **Module Status Badge**: Colored indicator on each module in the sidebar
   - `Draft` = gray, `In Review` = yellow/amber, `Approved` = green

2. **Module Workflow Toolbar**: When a module is selected in the editor
   - "Submit for Review" button (visible when module is in Draft state)
   - "Edit" button (visible when module is in Draft state)

3. **SOP Action Bar**: Between the nav and the main content area
   - "Submit SOP for Review" — visible when SOP is Draft and all modules are ready
   - "Approve SOP" — visible when SOP is For Review (for authorized users)
   - "Reject SOP" — visible when SOP is For Review (for authorized users)
   - "Publish SOP" — visible when SOP is Approved and all modules approved

4. **Module Approval Panel**: In the right sidebar, alongside existing ApprovalPanel
   - Shows per-module pending approvals with Approve/Reject buttons and comment field

### 5.3 Component Size Constraints

Per the architecture rules, no component should exceed 300 lines. The `SOPWorkspacePage.jsx` is currently 358 lines — it will need to be split into sub-components:
- `SOPWorkspacePage.jsx` (container — under 300 lines after refactor)
- `SOPActionBar.jsx` (new — SOP-level workflow buttons)
- `ModuleWorkflowToolbar.jsx` (new — module-level workflow buttons)

## 6. Security Considerations

- All workflow transitions must be authenticated (`authenticateToken` middleware already applied on routes)
- Authorization: only the SOP owner/author can submit for review; only designated reviewers can approve/reject
- Module-level approval should check that the approver is not the module creator (avoid self-approval) unless configured otherwise
- All user inputs (comments, status values) must be validated server-side
- Rejected modules must log the rejection reason in audit trail
- Publish action should only be callable once and create a new version

## 7. Performance Considerations

- Add composite index on `sop_modules(sop_id, status)` for fast module status lookups
- Add composite index on `sop_module_approvals(module_id, status)` for fast approval lookups
- The per-module approval query will use the existing `sop_approvals` table pattern (already indexed) but will also use the new `sop_module_approvals` table
- Batch status checks when submitting SOP for review — avoid N+1 queries by fetching all module statuses in a single query

## 8. Migration Plan

1. Create and run DB migration for new columns and table
2. Update backend models (sopModuleModel, new sopModuleApprovalModel)
3. Update backend services (sopModuleWorkflowService, sopModuleApprovalService, sopWorkflowService enhancements)
4. Update backend controllers and routes
5. Update frontend services (moduleService, sopService)
6. Update frontend hooks (useModules)
7. Update frontend components (ModuleList, ModuleCard, ModuleEditor, ApprovalPanel, SOPWorkspacePage)
8. Add new frontend components (SOPActionBar, ModuleWorkflowToolbar)
9. Test end-to-end workflow: Draft → Submit Review → Approve/Reject modules → Approve SOP → Publish
