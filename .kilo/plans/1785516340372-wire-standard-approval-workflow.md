# Plan: Wire the Standard SOP Approval Workflow

## Goal

Replace the legacy `sop_approvals` approval system with the role-based `approval_workflows` → `workflow_steps` system so that SOPs follow the standard 4-step approval chain (Department Head → QA Officer → Legal Counsel → CEO).

## Current State

| Component | Status |
|-----------|--------|
| `approval_workflows` / `workflow_steps` tables | Schema exists in DB, **empty** (no data) |
| Default "Standard SOP Approval" workflow | Defined in `sql/DB_SOP.sql` but **not seeded** into actual DB |
| `approvalWorkflowService` / `approvalWorkflowController` | Code exists but **orphaned** — never called from SOP transitions |
| Legacy `sop_approvals` system | **Active** — used by `sopWorkflowService.transitionSop()` |
| Frontend `ApprovalPanel` | Reads from `sop_approvals` via `GET /sops/:id/approvals` |
| Frontend workflow API calls | **None** — no calls to `/workflow/start` or `/workflow/advance` |

## Changes

### 1. Database — Seed the Default Workflow

**File**: `sql/DB_SOP.sql` (and `READ_THIS_DB.sql` for the live DB)

- Add the default "Standard SOP Approval" workflow with 4 steps:
  - Step 1: Department Review — `approver_type='Role'`, `approver_role='department_head'`
  - Step 2: QA Review — `approver_type='Role'`, `approver_role='admin'`
  - Step 3: Legal Review — `approver_type='Role'`, `approver_role='admin'` (optional)
  - Step 4: Final Approval — `approver_type='Role'`, `approver_role='super_admin'`

> Note: The `approver_role` values should match the `users.role` enum values in the system (`department_head`, `admin`, `super_admin`), not the human-readable labels used in the old `DB_SOP.sql` (`Department Head`, `QA Officer`, etc.).

**File**: `server/config/database.js`

- Ensure the `approval_workflows`, `workflow_steps`, `workflow_instances`, `workflow_actions` tables are in the migrations (they already are).

### 2. Backend — Wire Workflow into SOP Transitions

**File**: `server/services/sopWorkflowService.js`

Modify `transitionSop()` to use the workflow system instead of the legacy `sop_approvals`:

- **When `nextStatus === 'For Review'`**: Call `approvalWorkflowService.startWorkflow(sopId, actorId)` instead of `sopApprovalService.createSopApprovals(sopId, actorId)`.
- **When `nextStatus === 'Approved'`**: Check the workflow instance status (must be `'Approved'`). If not all steps are resolved, block the transition.
- **When `nextStatus === 'Draft'` (rejection)**: Check the workflow instance status (must be `'Rejected'`). If any step was rejected, allow the transition back to Draft.
- **Remove** the legacy `sopApprovalModel.getApprovals()` checks for pending/rejected approvals. Replace with workflow instance checks.

**File**: `server/controllers/approvalWorkflowController.js`

Add `approve` and `reject` action methods to the `advance()` function (or create new endpoints):

- The existing `advance()` already supports `action: 'Approved'` and `action: 'Rejected'`.
- No new controller methods needed — the existing `POST /:sopId/workflow/advance` endpoint handles this.

**File**: `server/controllers/sopController.js`

Update the `approvalController`:

- **`list()`**: Modify to fetch workflow-based approvals instead of `sop_approvals` data. Return workflow steps with their current status for the SOP.
- **`create()`**: Can be removed or kept as a no-op (workflow approvals are auto-created by `startWorkflow()`).
- **`approve()` / `reject()`**: These currently operate on `sop_approvals` records. Replace with calls to `approvalWorkflowService.advanceStep()` using the workflow instance and step IDs.

**File**: `server/routes/sops.js`

No changes needed — the routes already exist:
- `GET /:sopId/workflow` → `approvalWorkflowController.getInstance`
- `POST /:sopId/workflow/start` → `approvalWorkflowController.start`
- `POST /:sopId/workflow/advance` → `approvalWorkflowController.advance`

### 3. Frontend — Update Approval Panel and Service

**File**: `client/src/features/sop-management/services/sopService.js`

Add workflow API calls:

```js
export const getWorkflow = (sopId) => api.get(`/sops/${sopId}/workflow`);
export const startWorkflow = (sopId) => api.post(`/sops/${sopId}/workflow/start`);
export const advanceWorkflow = (sopId, data) => api.post(`/sops/${sopId}/workflow/advance`, data);
```

**File**: `client/src/features/sop-management/components/ApprovalPanel.jsx`

Update to use workflow-based data:

- Fetch workflow data via `getWorkflow(sopId)` instead of `getApprovals(sopId)`.
- Display pending workflow steps (steps where no `Approved` or `Rejected` action exists yet).
- On Approve: call `advanceWorkflow(sopId, { instanceId, stepId, action: 'Approved', comments })`.
- On Reject: call `advanceWorkflow(sopId, { instanceId, stepId, action: 'Rejected', comments })`.
- Show approval history from `workflow_actions` joined with `workflow_steps`.

**File**: `client/src/features/sop-management/pages/SOPWorkspacePage.jsx`

Update the data fetching:

- Replace `fetchApprovals(sopId)` with `fetchWorkflow(sopId)`.
- Pass workflow data to `SOPSidebar` and `ApprovalPanel`.

### 4. Remove Legacy Approval System

**Files to deprecate** (do NOT delete yet — mark for removal after migration):

- `server/controllers/sopApprovalController.js` — legacy approval CRUD
- `server/services/sopApprovalService.js` — legacy approval service
- `server/models/sopApprovalModel.js` — legacy approval model
- `server/routes/sops.js` — legacy `/sops/:id/approvals` endpoints

These should be kept until all frontend code is migrated to the workflow system, then removed in a follow-up.

## Files Affected

| File | Change |
|------|--------|
| `sql/DB_SOP.sql` | Add default workflow seed data |
| `READ_THIS_DB.sql` | Add default workflow seed data |
| `server/services/sopWorkflowService.js` | Replace legacy approval calls with workflow calls |
| `server/controllers/sopController.js` | Update `approvalController` to use workflow data |
| `server/controllers/approvalWorkflowController.js` | Add `approve`/`reject` action support to `advance()` |
| `client/src/features/sop-management/services/sopService.js` | Add workflow API calls |
| `client/src/features/sop-management/components/ApprovalPanel.jsx` | Use workflow data instead of `sop_approvals` |
| `client/src/features/sop-management/pages/SOPWorkspacePage.jsx` | Fetch workflow data instead of approvals |

## Security Considerations

- The `advanceStep()` method already validates that the actor can only act on pending steps.
- The `startWorkflow()` method validates that the SOP is in "For Review" status.
- No new security concerns introduced.

## Performance Considerations

- The workflow system adds one extra DB query to fetch the workflow instance + steps.
- This is negligible compared to the existing approval queries.
- No indexing changes needed — the existing indexes on `workflow_instances(sop_version_id)` and `workflow_steps(workflow_id)` are sufficient.

## Migration Path

1. Seed the default workflow into the database
2. Deploy backend changes (wire workflow into transitions)
3. Deploy frontend changes (update ApprovalPanel and service)
4. Verify that SOP submissions create workflow instances
5. Verify that workflow step approvals/rejections work correctly
6. Verify that SOP status transitions (Approved/Rejected/Published) respect workflow completion
7. In a follow-up: remove the legacy `sop_approvals` system
