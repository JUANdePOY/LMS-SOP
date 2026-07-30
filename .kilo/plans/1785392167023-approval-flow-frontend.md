# Approval Flow — Frontend Implementation Plan

## 1. Goal

Wire up the existing `ApprovalPanel` component with real API calls, add SOP-level workflow action buttons, and display module status badges. Frontend only; backend is already implemented.

---

## 2. Files to Modify

| File | Changes |
|---|---|
| `client/src/features/sop-management/services/sopService.js` | Add `approveApproval`, `rejectApproval`, `submitSop`, `approveSop`, `rejectSop` API functions |
| `client/src/features/sop-management/components/ApprovalPanel.jsx` | Wire `onApprove`/`onReject` to real API calls via props; add loading state per approval |
| `client/src/features/sop-management/pages/SOPWorkspacePage.jsx` | Implement `onApprove`/`onReject` handlers; add SOP-level action bar; fetch approvals after mutations |
| `client/src/features/sop-management/hooks/useModules.js` | Add `submitModuleForReview` function |
| `client/src/features/sop-management/services/moduleService.js` | Add `submitForReview(moduleId)` API function |

---

## 3. Detailed Changes

### 3.1 `sopService.js` — New API Functions

Add these functions following the existing pattern:

```js
// Approval actions
export const approveApproval = (approvalId, comments) =>
  api.post(`/sops/approvals/${approvalId}/approve`, { comments });

export const rejectApproval = (approvalId, comments) =>
  api.post(`/sops/approvals/${approvalId}/reject`, { comments });

// SOP-level workflow actions
export const submitSop = (sopId) =>
  api.post(`/sops/${sopId}/submit`);

export const approveSop = (sopId) =>
  api.post(`/sops/${sopId}/approve`);

export const rejectSop = (sopId) =>
  api.post(`/sops/${sopId}/reject`);

export const publishSop = (sopId) =>
  api.post(`/sops/${sopId}/publish`);
```

### 3.2 `ApprovalPanel.jsx` — Wire Real Handlers

**Current state**: `onApprove` and `onReject` are passed as props but the component doesn't know about loading or error states per approval.

**Changes**:
- Add `loading` prop tracking per approval ID (for optimistic UI)
- Add `error` state for failed actions
- Wrap `onApprove`/`onReject` calls with try/catch
- Show a spinner or disabled state while an action is in progress
- Show inline error messages if an action fails

**Component structure** (stays under 300 lines):

```
ApprovalPanel({ approvals, onApprove, onReject, loading, error })
  ├── Pending section
  │   ├── For each pending approval:
  │   │   ├── Approver name + avatar
  │   │   ├── Approve button (disabled while loading)
  │   │   └── Reject button (disabled while loading)
  │   └── "No pending approvals" message
  ├── History section
  │   └── For each resolved approval:
  │       ├── Approver name
  │       └── Status badge (approved/rejected)
  └── Error banner (if any)
```

### 3.3 `SOPWorkspacePage.jsx` — Implement Handlers & Action Bar

**Current state**: `onApprove={() => {}}` and `onReject={() => {}}` are no-ops.

**Changes**:

#### A. Implement `onApprove` and `onReject` handlers

```js
const handleApprove = async (approvalId) => {
  setApprovalLoading((prev) => ({ ...prev, [approvalId]: true }));
  try {
    await approveApproval(approvalId, null);
    // Refresh approvals list
    const { data } = await getApprovals(sopId);
    setApprovals(data?.data || []);
  } catch (err) {
    console.error('Approve failed:', err);
  } finally {
    setApprovalLoading((prev) => ({ ...prev, [approvalId]: false }));
  }
};

const handleReject = async (approvalId, comment) => {
  setApprovalLoading((prev) => ({ ...prev, [approvalId]: true }));
  try {
    await rejectApproval(approvalId, comment);
    const { data } = await getApprovals(sopId);
    setApprovals(data?.data || []);
  } catch (err) {
    console.error('Reject failed:', err);
  } finally {
    setApprovalLoading((prev) => ({ ...prev, [approvalId]: false }));
  }
};
```

#### B. Add SOP-level action bar

A new component `SOPActionBar` rendered at the top of the workspace page, showing action buttons based on the SOP's current status:

| SOP Status | Buttons Shown |
|---|---|
| `Draft` | "Submit for Review" |
| `For Review` | "Approve SOP", "Reject SOP" |
| `Approved` | "Publish SOP" |
| `Published` | "Archive SOP" |
| `Archived` | None |

Each button calls the corresponding API function and refreshes the SOP data afterward.

#### C. Fetch approvals after mutations

After any approval action (approve/reject) or SOP transition, re-fetch the approvals list to update the UI.

### 3.4 `useModules.js` — Add Module Workflow

Add a `submitModuleForReview` function:

```js
const submitModuleForReview = async (moduleId) => {
  const response = await submitForReview(moduleId);
  setModules((prev) =>
    prev.map((m) => (m.id === moduleId ? { ...m, status: 'In Review' } : m))
  );
  return response.data.data;
};
```

### 3.5 `moduleService.js` — New API Function

```js
export const submitForReview = (moduleId) =>
  api.put(`/sops/modules/${moduleId}/transition`, { status: 'In Review' });
```

---

## 4. UI Details

### 4.1 Status Badges on Modules

In `ModuleList.jsx` and `ModuleCard.jsx`, add a colored status badge next to each module:

| Status | Color |
|---|---|
| `Draft` | Gray (`bg-gray-100 text-gray-700`) |
| `In Review` | Amber (`bg-amber-100 text-amber-700`) |
| `Approved` | Green (`bg-green-100 text-green-700`) |

### 4.2 Approval Panel in Sidebar

The existing `ApprovalPanel` in the right sidebar will now be functional:
- Pending approvals show Approve/Reject buttons
- Clicking Approve/Reject shows a loading spinner on that button
- After action, the panel refreshes to show updated history
- Rejected approvals show a red status with comment

### 4.3 SOP Action Bar

A new bar between the nav header and the main content area:

```
┌─────────────────────────────────────────────────────────────────┐
│  SOP Title                              [Submit] [Approve] [Reject] │
└─────────────────────────────────────────────────────────────────┘
```

Buttons are conditionally rendered based on SOP status. Only show buttons the current user is authorized to click (basic check: any authenticated user can submit/approve/reject for now).

---

## 5. Component Size Constraints

Per architecture rules, no component exceeds 300 lines:
- `SOPWorkspacePage.jsx` — currently 382 lines; will need the action bar extracted into `SOPActionBar.jsx`
- `ApprovalPanel.jsx` — currently 67 lines; will grow to ~120 lines with loading/error states
- New `SOPActionBar.jsx` — ~80 lines

---

## 6. What This Does NOT Do (Intentional)

- No per-module approval UI (backend supports it but frontend not yet)
- No workflow configuration UI (admin creates workflows via API)
- No role-based button visibility (all authenticated users see all buttons)
- No module-level "Submit for Review" button in the editor toolbar (future enhancement)
- No comment dialog for reject actions (uses inline input or simple prompt)

---

## 7. Implementation Order

1. **Add API functions** to `sopService.js` and `moduleService.js`
2. **Update `ApprovalPanel.jsx`** with loading states and error handling
3. **Create `SOPActionBar.jsx`** component
4. **Update `SOPWorkspacePage.jsx`** — implement handlers, add action bar, refactor to stay under 300 lines
5. **Update `useModules.js`** — add `submitModuleForReview`
6. **Update `moduleService.js`** — add `submitForReview`
7. **Add module status badges** to `ModuleList.jsx` / `ModuleCard.jsx`
8. **Test end-to-end**: view SOP → see pending approvals → approve → see status update
