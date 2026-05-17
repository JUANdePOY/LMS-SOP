# Task review: internal / external training attachments

## Done
- Renamed table concept: `training_attachments` → **`internal_training_attachments`** (see `server/pafr.sql` + `server/sql/`).
- Added **`external_training_attachments`** and full server/client wiring (letter order upload/download for external).
- Migration for existing DBs: `rename_training_attachments_to_internal.up.sql` then `external_training_attachments.up.sql`.

## Validation
- Grep: no remaining `training_attachments` in app code (only rename script comment).
- Run SQL migrations on MySQL before starting the API against an old database.

---

## Debug: `uploadLetterOrder` named export (session efac7a)

- [x] Root cause: named re-export missing (`uploadLetterOrder` only on default object). Rollup: `npm run build` failed pre-fix; passes post-fix.
- [x] Fix: `export const uploadLetterOrder = trainingsService.uploadLetterOrder` in `trainingsService.js`.
---

## Internal training: squadron + targeted reservists (2026-05-16)

- **Doc:** [docs/internal-training-participants-flow.md](../docs/internal-training-participants-flow.md)
- **DB:** `server/sql/internal_training_participants.up.sql` (no MySQL FKs; MyISAM-safe)
- **Backend:** `routes/organization.js`, `controllers/organizationController.js`, `models/squadronLookupModel.js`, `models/internalTrainingParticipantModel.js`; `trainingsService` persists `participants`, `getInternal` returns `participant_groups`
- **Frontend:** `services/organizationService.js`, `components/trainings/SquadronParticipantBlocks.jsx`, integrated in `TrainingForm` internal tab
- Removed dead `SquadronAssignment.jsx`.

### Validation
- [x] `npm run build` (client)
- [x] Migration applied on dev `pafr`
- [ ] Manual: admin GET `/api/squadrons` + create internal training with participants
    