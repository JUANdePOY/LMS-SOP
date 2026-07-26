# SOP Button Refactoring — Option B

**Goal**: Replace all hardcoded Tailwind button classes in the SOP feature with the shared `Button` component (`@/shared/components/ui/button`).

## Variant Mapping

| Current Hardcoded Style | Button Variant | Notes |
|---|---|---|
| `bg-blue-600 hover:bg-blue-700` | `variant="default"` | Primary actions |
| `bg-amber-600 hover:bg-amber-700` | `variant="default"` | Primary actions (submit for review) |
| `bg-emerald-600 hover:bg-emerald-700` | `variant="default"` | Primary actions (approve/publish) |
| `bg-red-600 hover:bg-red-700` | `variant="destructive"` | Destructive actions (reject/delete/archive) |
| `border border-gray-300 bg-white text-gray-700 hover:bg-gray-50` | `variant="outline"` | Cancel/Back/Refresh buttons |
| `bg-gray-100 text-gray-700 hover:bg-gray-200` | `variant="secondary"` | Secondary actions (Add Section) |
| `text-blue-600 hover:text-blue-800` | `variant="link"` | Text links |
| Icon-only buttons (Trash, RotateCcw) | `variant="ghost"` `size="icon"` | Table action icons |

## Files to Edit

### Pages
- [x] **SOPListPage.jsx** — Create SOP button, Clear link
- [x] **SOPDetailsPage.jsx** — All action buttons + tab buttons + back link

### Modals
- [x] **ApproveModal.jsx** — Cancel + Approve buttons
- [x] **RejectModal.jsx** — Cancel + Reject buttons
- [x] **PublishModal.jsx** — Cancel + Publish buttons
- [x] **ArchiveModal.jsx** — Cancel + Archive buttons
- [x] **DeleteSOPModal.jsx** — Cancel + Delete buttons
- [x] **ShareSOPModal.jsx** — Cancel + Create Share buttons
- [x] **EditBasicInfoModal.jsx** — Cancel + Save Changes buttons
- [x] **AttachmentModal.jsx** — Cancel + Upload buttons
- [x] **RestoreVersionModal.jsx** — Cancel + Restore Version buttons
- [x] **CreateSOPModal.jsx** — Cancel + Create SOP buttons

### Wizard
- [x] **SOPCreateWizard.jsx** — All navigation + action buttons

### Tabs
- [x] **AssignmentsTab.jsx** — Refresh + Add Assignment buttons + tab toggle
- [x] **AttachmentsTab.jsx** — Upload button + trash icons
- [x] **AuditTab.jsx** — Refresh button
- [x] **SectionsTab.jsx** — (no buttons directly)
- [x] **ProcedureTab.jsx** — (no buttons directly)

### Forms
- [x] **SOPSectionForm.jsx** — Add Section button + trash icons
- [x] **SOPStepForm.jsx** — Add Step button (already done)
- [x] **SOPAssignmentForm.jsx** — Add Assignment button
- [x] **SOPAttachmentForm.jsx** — Upload button
- [x] **SOPPublishForm.jsx** — Cancel + Publish SOP buttons

### Tables
- [x] **AssignmentTable.jsx** — Trash icon buttons
- [x] **AcknowledgementTable.jsx** — (no buttons)
- [x] **VersionTable.jsx** — Restore icon buttons
- [x] **ApprovalTable.jsx** — (no buttons)
- [x] **SOPTable.jsx** — (uses row click, no buttons)

## Status: COMPLETE ✅
All hardcoded buttons in the SOP feature have been replaced with the shared `Button` component.

