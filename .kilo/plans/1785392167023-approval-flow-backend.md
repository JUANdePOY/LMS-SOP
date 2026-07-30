# Approval Flow — Backend Implementation Plan

## 1. Goal

Implement a working approval flow so that approvers can approve/reject SOPs through the UI, and the SOP status transitions correctly based on approval records. Backend first; UI later.

---

## 2. Database Schema

### 2.1 `sop_approvals` — Fix existing table

The table in `server/config/database.js` is missing `sop_version_id` which the model references. Align the DB with the model.

**Current columns** (in `database.js`):
```
id, sop_id, approver_user_id, status, comments, is_deleted, created_at, updated_at
```

**Required columns** (to match model usage):
```
id, sop_id, sop_version_id, approver_user_id, status, comments, is_deleted, created_at, updated_at
```

**Migration** (add to `database.js` MIGRATIONS array):
```sql
ALTER TABLE sop_approvals
  ADD COLUMN sop_version_id INT NULL AFTER sop_id,
  ADD INDEX idx_sop_approvals_version (sop_version_id)
```

### 2.2 `approval_workflows` — Add from DB_SOP.sql

These 4 tables exist in `sql/DB_SOP.sql` but are missing from `database.js`. Add them so the configurable workflow engine is available.

| Table | Purpose |
|---|---|
| `approval_workflows` | Defines an approval chain (e.g. "Standard SOP Approval") |
| `workflow_steps` | Ordered steps within a workflow (e.g. Step 1: Dept Review, Step 2: QA) |
| `workflow_instances` | Active instance of a workflow running on a SOP version |
| `workflow_actions` | Individual actions taken at each step (Submitted, Approved, Rejected, etc.) |

Columns match `DB_SOP.sql` lines 361-424 exactly.

---

## 3. Backend Architecture

### 3.1 Files to Create

| File | Purpose |
|---|---|
| `server/models/approvalWorkflowModel.js` | DB access for `approval_workflows`, `workflow_steps`, `workflow_instances`, `workflow_actions` |
| `server/services/approvalWorkflowService.js` | Workflow engine: create instance, advance step, check completion |
| `server/controllers/approvalWorkflowController.js` | HTTP endpoints for workflow management |

### 3.2 Files to Modify

| File | Changes |
|---|---|
| `server/config/database.js` | Add `sop_version_id` to `sop_approvals`; add 4 workflow tables to MIGRATIONS |
| `server/models/sopApprovalModel.js` | Add `sop_version_id` to inserts/queries |
| `server/services/sopApprovalService.js` | Add `approve()` and `reject()` methods that validate state and trigger transitions |
| `server/controllers/sopApprovalController.js` | Add `approve` and `reject` action methods |
| `server/routes/sops.js` | Add `POST /sops/:sopId/approvals/:id/approve` and `POST /sops/:sopId/approvals/:id/reject` |
| `server/utils/sopUtils.js` | Add `canApprove()` and `canReject()` validation helpers |

### 3.3 Files to Keep (No Changes)

| File | Reason |
|---|---|
| `server/models/sopWorkflowModel.js` | Status transitions remain hardcoded — simple and sufficient |
| `server/services/sopWorkflowService.js` | Transition logic is correct; approval service will call it |
| `server/controllers/sopWorkflowController.js` | Transition endpoint stays as-is |
| `server/controllers/sopController.js` | Approval controller is already wired in |

---

## 4. Detailed Design

### 4.1 `approvalWorkflowModel.js` — Data Access

```
getWorkflows(filters)        — list active workflows, optionally filtered by department
getWorkflowById(id)          — single workflow with its steps
getStepById(id)              — single workflow step
createWorkflow(data)         — create workflow + steps in a transaction
createInstance(sopVersionId, workflowId, createdBy) — start a workflow instance
advanceStep(instanceId, stepId, actorId, action, comments) — record an action and advance
getCurrentStep(instanceId)   — get the current pending step for an instance
isWorkflowComplete(instanceId) — check if all required steps are done
```

### 4.2 `approvalWorkflowService.js` — Business Logic

```
createWorkflow(data, actorId)
  — validates workflow name is unique, creates workflow + steps

startWorkflow(sopId, actorId)
  — finds the applicable workflow (department-specific or org-wide default)
  — creates a workflow_instance for the current SOP version
  — returns the instance

advanceStep(instanceId, stepId, actorId, action, comments)
  — validates the step is the current pending step
  — validates the actor is authorized for this step (by role/user/department)
  — records a workflow_action
  — if action is 'Approved', moves to next step
  — if action is 'Rejected', marks instance as 'Rejected'
  — if all required steps are approved, marks instance as 'Approved'
  — returns the updated instance
```

### 4.3 `sopApprovalService.js` — Enhanced with Workflow Integration

**New methods:**

```
approveApproval(approvalId, actorId, comments)
  — validates approval exists and is 'pending'
  — validates the actor is the assigned approver for this approval
  — updates approval status to 'approved'
  — logs audit entry
  — checks if all approvals for this SOP are resolved
  — if all resolved and all approved, triggers SOP status transition to 'Approved'
  — returns the approval record

rejectApproval(approvalId, actorId, comments)
  — validates approval exists and is 'pending'
  — validates the actor is the assigned approver
  — updates approval status to 'rejected'
  — logs audit entry
  — triggers SOP status transition back to 'Draft'
  — returns the approval record
```

**Modified methods:**

```
createApproval(sopId, data, actorId)
  — now also creates a workflow_instance if the SOP is transitioning to 'For Review'
  — creates one approval record per workflow step
```

### 4.4 `sopApprovalController.js` — New Endpoints

```
POST /sops/:sopId/approvals/:id/approve   — approve a pending approval
POST /sops/:sopId/approvals/:id/reject    — reject a pending approval
```

Both endpoints:
- Require authentication
- Validate the approval belongs to the SOP
- Validate the actor is the assigned approver
- Validate the approval is in 'pending' status
- Call the service layer
- Return appropriate error codes

### 4.5 `sopWorkflowController.js` — Enhanced

The existing `POST /sops/:sopId/transition` endpoint should validate that required approvals are resolved before allowing transition to `Approved` or `Published`.

---

## 5. API Endpoints

### Existing (enhanced)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/sops/:sopId/approvals` | List approvals for an SOP |
| POST | `/sops/:sopId/approvals` | Create approval record(s) |
| PUT | `/sops/approvals/:approvalId` | Update approval (status, comments) |
| POST | `/sops/:sopId/transition` | Transition SOP status (enhanced with approval checks) |

### New

| Method | Endpoint | Description |
|---|---|---|
| POST | `/sops/:sopId/approvals/:id/approve` | Approve a pending approval |
| POST | `/sops/:sopId/approvals/:id/reject` | Reject a pending approval |
| GET | `/sops/:sopId/workflow` | Get workflow instance for an SOP |
| POST | `/sops/:sopId/workflow/start` | Start a workflow for an SOP |

---

## 6. Validation Rules

| Action | Validation |
|---|---|
| Create approval | SOP must exist; approver_user_id must be provided |
| Approve | Approval must be `pending`; actor must be the assigned approver; approval must belong to the SOP |
| Reject | Approval must be `pending`; actor must be the assigned approver; comments required |
| Transition to `Approved` | All approvals for the SOP must be resolved (no `pending`); all must be `approved` |
| Transition to `Published` | SOP must be `Approved`; all modules must be approved (future enhancement) |
| Start workflow | SOP must be in `For Review` state; a workflow must be configured |

---

## 7. Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Error codes:

| Code | HTTP Status | When |
|---|---|---|
| `NOT_FOUND` | 404 | Approval, SOP, or workflow not found |
| `INVALID_TRANSITION` | 400 | Attempting invalid status transition |
| `UNAUTHORIZED` | 403 | Actor is not the assigned approver |
| `VALIDATION_ERROR` | 400 | Missing required fields or invalid data |
| `WORKFLOW_NOT_FOUND` | 404 | No workflow configured for this SOP |
| `APPROVAL_PENDING` | 400 | Cannot approve/reject — approval is not pending |

---

## 8. Security

- All endpoints require `authenticateToken` (already applied at router level)
- Ownership check: only the assigned approver can approve/reject their own approval
- Input validation: `status` must be one of `approved`/`rejected`; comments are optional but sanitized
- Audit logging: every approve/reject action is logged via `logAudit()`
- Parameterized queries: all DB queries use parameterized bindings (no SQL injection risk)

---

## 9. Implementation Order

1. **Database migration** — add `sop_version_id` to `sop_approvals`; add 4 workflow tables to `database.js`
2. **Model** — create `approvalWorkflowModel.js`
3. **Service** — create `approvalWorkflowService.js`
4. **Controller** — create `approvalWorkflowController.js`
5. **Enhance `sopApprovalService.js`** — add `approve()` and `reject()` methods
6. **Enhance `sopApprovalController.js`** — add `approve` and `reject` methods
7. **Enhance `sopWorkflowService.js`** — add approval-check validation before transitions
8. **Routes** — add new endpoints to `server/routes/sops.js`
9. **Test** — verify the full flow: create SOP → submit for review → start workflow → approve steps → SOP transitions to Approved

---

## 10. What This Does NOT Do (Intentional)

- No per-module approval (future enhancement, tracked in separate plan)
- No configurable workflow UI (workflows are created via API/admin, not UI)
- No frontend changes (this is backend-only; UI plan is separate)
- No role-based authorization beyond "actor must be the assigned approver" (RBAC can be added later)
