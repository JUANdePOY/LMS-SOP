# SOP Management — Development Plan

## Overview

This plan sequences the build-out of the `sop_management` feature module using the existing scaffolded structure (api / components / constants / context / hooks / pages / routes / services / utils / validators) and the entity relationships defined in `SOP_DB_SCHEMA.md`:

```
Departments → Categories → SOPs → SOP Versions → Sections / Steps / Documents / Approvals / Assignments → Acknowledgements
```

Build order follows the dependency chain bottom-up: **DB → backend services/API → validators → hooks → context → components → pages/routes → workflow wiring → polish/QA**. Each phase only depends on phases before it, so you can stop after any phase with a working (if incomplete) feature.

---

## Phase 0 — Foundations & Contracts

**Goal:** Lock down shared conventions before writing feature code, so later phases don't require rework.

- [ ] Finalize `constants/`:
  - `sopStatus.js` (Draft, For Review, Approved, Published, Archived)
  - `approvalStatus.js` (Pending, Approved, Rejected)
  - `assignmentTypes.js` (Department, Position, User)
  - `documentTypes.js` (PDF, Word, Image, Video)
  - `sectionTypes.js` (Purpose, Scope, References, Safety Notes, custom)
  - `permissions.js` (who can create/edit/approve/publish/archive/assign)
- [ ] Define API response envelope (success/error shape) used across all `api/*.api.js` files
- [ ] Define standard pagination/filter query params for list endpoints (`sop.api.js`, list hooks)
- [ ] Confirm DB migrations exist/match schema doc (sops, sop_versions, sop_sections, sop_steps, sop_documents, sop_assignments, sop_acknowledgements, sop_approvals, sop_change_logs) and indexes (`idx_sop_code`, `idx_sop_title`, `idx_status`, `idx_ack_user_status`)

**Exit criteria:** constants finalized, API contract documented, migrations verified against schema doc.

---

## Phase 1 — Core SOP CRUD (Backend)

**Goal:** Stand up the master SOP record end-to-end before touching versions/workflow.

- [ ] `routes/sop.routes.js` — register REST routes
- [ ] `services/sop.service.js` — create/read/update/(soft)delete SOP, department/category lookups, `idx_sop_code` / `idx_sop_title` search
- [ ] `validators/sop.validator.js` — required fields, code uniqueness, department/category existence
- [ ] `api/sop.api.js` — controller layer wiring service + validator
- [ ] `utils/generateSOPCode.js` — SOP code generation rule
- [ ] `utils/validationHelper.js` — shared validation helpers
- [ ] `utils/sopStatus.js` — status transition helpers (guard against invalid transitions)

**Exit criteria:** Can create/list/update/soft-delete an SOP via API and see status default to Draft.

---

## Phase 2 — Sections & Steps (Content Body)

**Goal:** Build the actual SOP content editing layer.

- [ ] `services` for sections/steps (co-locate in `sop.service.js` or split if it grows)
- [ ] `validators/section.validator.js`, `validators/step.validator.js` — ordering, required section types, step numbering
- [ ] `api/section.api.js`, `api/step.api.js`
- [ ] Reorder/duplicate/insert logic for steps (drag & drop backend support — persist `order_index`)
- [ ] Step comments support (if stored relationally, confirm table; otherwise flag as gap against schema doc)

**Exit criteria:** Sections and steps can be created, reordered, duplicated, and fetched in order for a given SOP.

---

## Phase 3 — Versioning

**Goal:** Make every published revision immutable and diffable, per Design Principles.

- [ ] `services/version.service.js` — snapshot sections/steps into `sop_versions` on publish
- [ ] `api/version.api.js`
- [ ] `utils/versionHelper.js` — version numbering (1.0 → 1.1 → 2.0 rules)
- [ ] `utils/compareVersions.js` — field-level diff logic (feeds `sop_change_logs`)
- [ ] `useSOPVersions.js`, `useRestoreVersion.js` — data hooks
- [ ] Restore-version flow: `RestoreVersionModal.jsx` → confirms → creates new draft version from snapshot (never overwrites immutable history)

**Exit criteria:** Publishing an SOP snapshots a version; two versions can be diffed; a past version can be restored into a new draft.

---

## Phase 4 — Documents/Attachments

**Goal:** File upload/storage for SOP-linked documents.

- [ ] `services` for `sop_documents` (upload, type validation: PDF/Word/Image/Video)
- [ ] `api/attachment.api.js`
- [ ] `useAttachments.js`
- [ ] `components/forms/SOPAttachmentForm.jsx`, `components/modals/AttachmentModal.jsx`, `components/cards/AttachmentCard.jsx`
- [ ] `utils/downloadFile.js`

**Exit criteria:** Files can be uploaded, listed, downloaded, and deleted per SOP.

---

## Phase 5 — Assignments & Acknowledgements

**Goal:** Determine who must comply, and track that they did.

- [ ] `services/assignment.service.js` — assign by Department / Position / User
- [ ] `validators/assignment.validator.js` — no duplicate/overlapping assignments
- [ ] `api/assignment.api.js`
- [ ] `services/acknowledgement.service.js` — generate acknowledgement records on publish, track completion
- [ ] `api/acknowledgement.api.js`
- [ ] `useAssignments.js`, `useAcknowledgements.js`
- [ ] `idx_ack_user_status` index usage in acknowledgement queries (dashboard-style "who hasn't acknowledged yet")

**Exit criteria:** Publishing an SOP fans out assignments and creates trackable acknowledgement rows; completion status is queryable.

---

## Phase 6 — Approval Workflow

**Goal:** Implement Draft → For Review → Approved → Published → Archived.

- [ ] `services/workflow.service.js` — central state-machine enforcing legal transitions only
- [ ] `services/approval.service.js` — approve/reject with comments, multi-approver support if needed
- [ ] `validators/publish.validator.js` — can't publish without required approvals/sections
- [ ] `api/approval.api.js`
- [ ] `useApprovals.js`, `usePublishSOP.js`, `useArchiveSOP.js`
- [ ] `utils/approvalHelper.js`
- [ ] Modals: `ApproveModal.jsx`, `RejectModal.jsx`, `PublishModal.jsx`, `ArchiveModal.jsx`
- [ ] `services/notification.service.js` — notify on submit/approve/reject/publish
- [ ] `services/publish.service.js` — orchestrates: publish → notify users → create acknowledgements (ties Phase 3, 5, 6 together)

**Exit criteria:** Full lifecycle works end-to-end through the API: Draft → Review → Approve → Publish → Notify → Acknowledgements created → Archive.

---

## Phase 7 — Audit Trail

**Goal:** Satisfy "Audit Ready" design principle.

- [ ] `services` writing to `sop_change_logs` on every mutating action (hook into service layer, not controllers, so nothing is missed)
- [ ] `api/audit.api.js`
- [ ] `useAuditLogs.js`
- [ ] `components/drawers/AuditDrawer.jsx`, `components/tabs/AuditTab.jsx`, `components/timeline/AuditTimeline.jsx`

**Exit criteria:** Every field-level change and workflow transition is logged and viewable per SOP.

---

## Phase 8 — Sharing & Permissions

**Goal:** Controlled external/internal sharing plus permission-aware UI.

- [ ] `services/share.service.js` (create if missing) / extend `api/share.api.js`
- [ ] `context/SOPPermissionContext.jsx` — role/permission gating consumed by components
- [ ] `useShareSOP.js`
- [ ] `components/modals/ShareSOPModal.jsx`

**Exit criteria:** Share links/permissions respected in both API responses and UI rendering.

---

## Phase 9 — Frontend Assembly (Context, Hooks → Components → Pages)

**Goal:** Wire the already-scaffolded UI layer to the now-complete backend.

1. **Context**
   - [ ] `SOPContext.jsx` — active SOP + list state
   - [ ] `SOPModalContext.jsx` — centralized modal open/close state
2. **Remaining hooks**
   - [ ] `useSOPList.js`, `useSOPFilters.js`, `useSOPDetails.js`, `useCreateSOP.js`, `useUpdateSOP.js`, `useDeleteSOP.js`, `useSOPSections.js`, `useSOPSteps.js`
3. **Editors**
   - [ ] `MarkdownEditor.jsx` / `RichTextEditor.jsx` (pick one as primary, other as fallback/plugin)
   - [ ] `SectionEditor.jsx`, `StepEditor.jsx`
4. **Forms**
   - [ ] `SOPBasicInfoForm.jsx`, `SOPSectionForm.jsx`, `SOPStepForm.jsx`, `SOPAssignmentForm.jsx`, `SOPAttachmentForm.jsx`, `SOPPublishForm.jsx`
5. **Cards / Tables**
   - [ ] `SOPCard.jsx`, `SOPTable.jsx`, `VersionCard.jsx`, `VersionTable.jsx`, `ApprovalCard.jsx`, `ApprovalTable.jsx`, `UserAssignmentCard.jsx`, `AssignmentTable.jsx`, `AcknowledgementTable.jsx`
6. **Tabs (SOP Details page composition)**
   - [ ] `OverviewTab.jsx`, `ProcedureTab.jsx`, `SectionsTab.jsx`, `AttachmentsTab.jsx`, `AssignmentsTab.jsx`, `ApprovalsTab.jsx`, `VersionsTab.jsx`, `AuditTab.jsx`
7. **Timeline / Drawers**
   - [ ] `ApprovalTimeline.jsx`, `VersionTimeline.jsx`, `AuditTimeline.jsx`
   - [ ] `HistoryDrawer.jsx`, `ActivityDrawer.jsx`, `VersionDrawer.jsx`
8. **Pages**
   - [ ] `SOPListPage.jsx` (list + filters + create modal entry point)
   - [ ] `SOPDetailsPage.jsx` (tab shell hosting all tabs above)
9. **Remaining modals**
   - [ ] `CreateSOPModal.jsx`, `EditBasicInfoModal.jsx`, `DeleteSOPModal.jsx`, `SectionModal.jsx`, `StepModal.jsx`, `AssignmentModal.jsx`

**Exit criteria:** A user can create an SOP, build out sections/steps, attach files, assign it, route it through approval, publish it, and see acknowledgements/audit/version history — entirely through the UI.

---

## Phase 10 — Export & Reporting

- [ ] `services/export.service.js` — export SOP (with sections/steps/attachments) to PDF/Word
- [ ] Hook into `SOPDetailsPage.jsx` action bar

**Exit criteria:** A published SOP can be exported as a shareable document.

---

## Phase 11 — QA & Hardening

- [ ] Validate every state transition is blocked correctly at both `validators/` and `workflow.service.js` layers (don't rely on frontend-only checks)
- [ ] Confirm soft-delete behavior across sops/sections/steps/documents (Design Principle: "Soft Delete Friendly")
- [ ] Load-test list endpoints with `idx_sop_code`, `idx_sop_title`, `idx_status`, `idx_ack_user_status` in place
- [ ] Permission edge cases (non-owner edit attempts, unauthorized approve/publish/archive)
- [ ] Notification delivery failure handling
- [ ] End-to-end pass: Draft → Review → Approve → Publish → Notify → Acknowledge → Archive → Restore-from-version

---

## Suggested Milestone Grouping

| Milestone | Phases | Outcome |
|---|---|---|
| M1 — Backend Core | 0–4 | SOPs, sections/steps, versions, documents all work via API |
| M2 — Compliance Layer | 5–7 | Assignments, acknowledgements, approvals, audit trail complete |
| M3 — Frontend | 8–9 | Full UI usable end-to-end |
| M4 — Polish | 10–11 | Export + hardening, ready for release |

---

## Open Items to Confirm With You

- Whether step **comments** need their own table (schema doc mentions the *feature* but no `sop_step_comments` entity)
- Whether multi-level/multi-approver approval is required, or single-approver per version
- Whether "Archived" SOPs are still viewable/exportable or fully locked
