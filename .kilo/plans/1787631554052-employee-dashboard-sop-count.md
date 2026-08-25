# Fix: Employee Dashboard "SOPs Assigned" count & "SOPs by Status" use wrong data source

## Root cause
`useEmployeeTrainingDashboard` builds `sopsAssigned`, `sopStatus`, and `sopHighlights`
from `GET /sops/acknowledgements/my` — i.e. rows in `sop_acknowledgements`
(`listAcknowledgementsByUser`). Acknowledgements are only a **publish-time side
effect**, so they are:

- **Under-counted**: users/departments added after a SOP was published (or SOPs
  assigned via a *course module*, `module_content type='sop'`) never get an
  acknowledgement row.
- **Over-counted / stale**: re-publishing creates new `sop_version_id` rows while
  old acknowledgement rows can remain, and the join is by `sop_version_id` not `sop_id`.

The authoritative source for "SOPs assigned to this employee" is
`sopAssignmentService.listAccessibleSops` (resolves `sop_assignments` via
`assignment_users` / `assignment_departments` / `assignment_positions` **plus**
SOPs embedded in the user's enrolled courses). The employee **SOP Library**
(`GET /api/employee/sops`) already uses it — the dashboard does not, which is why
the dashboard number disagrees with what the employee actually sees.

User decision: the "SOPs by Status" donut should represent **completion status**
(Acknowledged vs Not Acknowledged), not workflow status.

## Plan

### 1. Backend — new summary endpoint
File: `server/services/sopAssignmentService.js`
- Add `getEmployeeSopSummary(userId)`:
  - Call existing `listAccessibleSops(userId, { limit: 100000, page: 1, sort: 'created_at' })` → `{ rows, total }` (rows already include `id`, `title`, `status`).
  - Get acknowledged SOP ids in one query (db already imported in this service):
    ```sql
    SELECT DISTINCT sv.sop_id AS sop_id
    FROM sop_acknowledgements sa
    JOIN sop_versions sv ON sa.sop_version_id = sv.id AND sv.deleted_at IS NULL
    WHERE sa.user_id = ? AND sa.status = 'Acknowledged'
    ```
  - Return `{ total: result.total, items: rows.map(r => ({ id: r.id, title: r.title, status: r.status, acknowledged: ackSet.has(r.id) })) }`.
  - Export it.

File: `server/controllers/employeeSopController.js`
- Add `summary(req,res)` → `res.json({ success:true, data: await sopAssignmentService.getEmployeeSopSummary(req.user.id) })` (reuse `sendError`).

File: `server/routes/employee.js`
- Add `router.get('/sops/summary', employeeSopController.summary);` **before** `router.get('/sops/:id', ...)` so it is not captured by the `:id` route.

### 2. Frontend — API + hook
File: `client/src/features/employee/api/employeeSop.api.js`
- Add `getEmployeeSopSummary()` → `fetch(`${API_BASE}/sops/summary`, { headers: authHeaders() })` (reuse existing `handle`).

File: `client/src/features/employee/hooks/useEmployeeTrainingDashboard.js`
- Replace the `getMySopAcknowledgements()` fetch with `getEmployeeSopSummary()`.
- `sopsAssigned = summary.total` (authoritative count).
- `sopStatus` (donut) = completion breakdown derived from `summary.items`:
  - `acknowledgedCount = items.filter(i => i.acknowledged).length`
  - `notAcknowledgedCount = items.length - acknowledgedCount`
  - `toPercent` keyed on `summary.total`; emit only slices with `count > 0`:
    ```js
    [
      { name: 'Acknowledged',     value: toPercent(acknowledgedCount),    count: acknowledgedCount,    color: '#10B981' },
      { name: 'Not Acknowledged', value: toPercent(notAcknowledgedCount), count: notAcknowledgedCount, color: '#F59E0B' },
    ]
    ```
- `sopHighlights` (first 4) → map `item.acknowledged` to `status: 'Completed' : 'In Progress'` and `progress: acknowledged ? 100 : 0`.
- Remove now-unused `getMySopAcknowledgements`/`sopAcknowledgements` variables (keep `announcements`, `events`, tasks, certificates, assessments unchanged).

### 3. UI (no structural change)
- `DonutChart` already supports `{ name, value(percent), count, color }` and the empty state — no change needed.
- Optional: rename PanelCard title "SOPs by Status" → "My SOPs by Completion" for clarity (low priority).

## Validation
1. `node --check` on changed server files; `eslint` on changed client files (0 errors).
2. Start server + client; log in as an employee.
3. Confirm **SOPs Assigned** count on the dashboard equals the total shown in the
   SOP Library (`/my-learning/sops`) — they now share `listAccessibleSops`.
4. Confirm donut percentages sum to 100 and Acknowledged/Not Acknowledged counts
   match the actual assigned SOPs; highlights show real assigned SOP titles.
5. Edge cases: employee with 0 assigned SOPs → donut shows empty state, "No SOPs
   assigned yet" in highlights, count 0. Employee with all acknowledged → donut
   shows 100% Acknowledged.

## Risks / notes
- `listAccessibleSops` is filtered to `status='Published'`; this is correct for an
  employee (non-published SOPs are not accessible) and matches the SOP Library.
- `limit: 100000` is for summary only; fine for dashboard scale. If a stricter cap
  is desired, the backend already returns `total` separately so the count stays correct.
