# SOP Onboarding Default Feature Plan

## Feature Overview

Allow administrators to mark specific SOPs as **Default Onboarding SOPs** for new employees. When a new employee account is created, the system automatically assigns these SOPs and requires the employee to read/acknowledge them before accessing any employee-facing features (`/my-learning/*`).

---

## 1. Architecture Impact

### Current State
- **SOP Module**: Full CRUD, versioning, assignments, acknowledgements, approval workflows.
- **User Creation**: `POST /api/users` (single) and `POST /api/users/bulk-upload` in `server/routes/users.js`.
- **Employee Features**: Frontend routes under `/my-learning/*` (`EmployeeDashboard`, `EmployeeCourseCatalog`, `EmployeeCourseView`, `EmployeeSOPView`) wrapped by `EmployeeProtectedWrapper` (allows `employee` role only).
- **Access Control**: `authenticateToken` middleware attaches `req.user`. No onboarding gate exists today.

### Proposed Changes
1. **Database**: Minimal schema change — one new boolean column on `sops`.
2. **Backend Services**: Hook into user creation to auto-assign onboarding SOPs. New onboarding-specific endpoints. New middleware for guarding employee routes.
3. **Frontend**: Admin toggle in SOP forms. Employee onboarding page. Redirect logic for incomplete onboarding.

### Integration Points
| Existing Component | Change |
|---|---|
| `authModel.create()` | Auto-create acknowledgements after user insert |
| `server/routes/users.js` (bulk) | Same hook after bulk user creation |
| `sopAcknowledgementService` | Reuse `createAcknowledgement()` for auto-assignment |
| `EmployeeProtectedWrapper` (frontend) | Add onboarding check / redirect |
| `employeeSopController` | Optionally gate SOP access until onboarding complete |

---

## 2. Database Changes

### Schema Migration

Add a single column to the existing `sops` table:

```sql
ALTER TABLE sops ADD COLUMN IF NOT EXISTS is_default_onboarding TINYINT(1) NOT NULL DEFAULT 0 AFTER restriction_type;
CREATE INDEX idx_sops_default_onboarding ON sops(is_default_onboarding) WHERE is_default_onboarding = 1;
```

**Why this is safe:**
- No new tables required — reuses existing `sop_acknowledgements` for tracking.
- No foreign keys to add.
- Backward compatible: default value `0` means existing SOPs are unaffected.
- Partial index on MySQL 8+ (`WHERE is_default_onboarding = 1`) keeps the index tiny.

### Data Model Notes
- `sop_acknowledgements` already supports `status ENUM('Pending','Acknowledged','Reopened','Expired')`.
- We will create acknowledgement rows with `status = 'Pending'` for each new employee + each default SOP.
- Once the employee reads/acknowledges the SOP, the status flips to `Acknowledged`.

---

## 3. Files Affected

### Backend
| File | Action | Description |
|---|---|---|
| `server/config/database.js` | **Modify** | Add `is_default_onboarding` ALTER TABLE migration + index |
| `server/models/authModel.js` | **Modify** | After `INSERT` into `users`, call onboarding assignment service |
| `server/services/sopOnboardingService.js` | **Create** | New service: `assignOnboardingSopsToUser(userId)`, `getPendingOnboardingSops(userId)`, `isOnboardingComplete(userId)` |
| `server/middleware/onboarding.js` | **Create** | `requireOnboardingComplete()` — returns 403 with `ONBOARDING_REQUIRED` if pending defaults exist; admins bypass |
| `server/controllers/employeeOnboardingController.js` | **Create** | `getMyOnboarding()`, `acknowledgeOnboardingSop(ackId)` |
| `server/routes/employee.js` | **Modify** | Add onboarding endpoints under `/api/employee/onboarding/*` |
| `server/routes/users.js` | **Modify** | Pass `userId` to onboarding service after single + bulk creation |

### Frontend
| File | Action | Description |
|---|---|---|
| `client/src/features/sop-management/components/SOPCreateForm.jsx` | **Modify** | Add `is_default_onboarding` toggle/checkbox |
| `client/src/features/sop-management/components/SOPEditForm.jsx` | **Modify** | Add `is_default_onboarding` toggle/checkbox |
| `client/src/features/sop-management/pages/SOPListPage.jsx` | **Modify** | Show onboarding badge/filter column |
| `client/src/features/sop-management/services/sopService.js` | **Modify** | Include `is_default_onboarding` in create/update payloads |
| `client/src/features/employee/pages/EmployeeOnboardingPage.jsx` | **Create** | New page listing pending default SOPs with acknowledge action |
| `client/src/features/employee/api/employeeOnboarding.api.js` | **Create** | API client for onboarding endpoints |
| `client/src/features/employee/hooks/useEmployeeOnboarding.js` | **Create** | Hook for onboarding state, acknowledge mutation, completion check |
| `client/src/features/employee/components/OnboardingGuard.jsx` | **Create** | Route guard component — redirects to onboarding if incomplete |
| `client/src/App.jsx` | **Modify** | Wrap employee routes with `OnboardingGuard` |

---

## 4. Security Concerns

| Concern | Mitigation |
|---|---|
| **Admin bypass** | `requireOnboardingComplete` middleware must exempt `super_admin`, `admin`, `department_head` roles. Only `employee` role is gated. |
| **Authorization on endpoints** | `/api/employee/onboarding/*` requires `authenticateToken`. Users can only fetch/acknowledge their *own* onboarding SOPs (filter by `req.user.id`). |
| **Input validation** | `acknowledgeOnboardingSop` validates `ackId` param is numeric and belongs to the current user before updating status. |
| **Race conditions** | Use DB transaction when creating multiple acknowledgements during user creation. If any fail, roll back the entire user creation or log and continue (depending on business rule — recommend fail-safe: log and continue so user account is not blocked). |
| **Data leakage** | Onboarding endpoints return only `Pending` SOPs for the authenticated user. No other user's data is exposed. |

---

## 5. Performance Concerns

| Concern | Mitigation |
|---|---|
| **Bulk upload performance** | Creating acknowledgements for 100 users × 5 default SOPs = 500 inserts. Use batch `INSERT ... VALUES ..., (...), (...)` instead of individual queries. |
| **Index bloat** | Partial index on `sops.is_default_onboarding` keeps index small. |
| **Middleware overhead** | `requireOnboardingComplete` runs a single `SELECT COUNT(*) FROM sop_acknowledgements WHERE user_id = ? AND status = 'Pending' AND sop_version_id IN (SELECT ...)` query. Cache the result in `req.user.onboardingComplete` to avoid duplicate checks per request. |
| **Frontend redirect loops** | Onboarding page must exempt itself from the guard. Use a route-level flag or whitelist. |

---

## 6. Implementation Plan

### Phase 1: Database + Backend Core
1. **Migration** — Add `is_default_onboarding` to `sops` + partial index in `database.js`.
2. **Service** — Create `sopOnboardingService.js`:
   - `getDefaultOnboardingSops()` — returns all SOPs with `is_default_onboarding = 1` and their current `sop_version_id`.
   - `assignOnboardingSopsToUser(userId)` — for each default SOP, inserts into `sop_acknowledgements` (`sop_version_id`, `user_id`, `status = 'Pending'`).
   - `getPendingOnboardingSops(userId)` — joins `sop_acknowledgements` + `sops` + `sop_versions` for pending items.
   - `isOnboardingComplete(userId)` — boolean check.
3. **Model hook** — In `authModel.create()`, call `assignOnboardingSopsToUser(newUserId)` after insert.
4. **Bulk hook** — In `server/routes/users.js` `bulk-upload`, call the same after each successful user creation.
5. **Middleware** — Create `requireOnboardingComplete` in `server/middleware/onboarding.js`.

### Phase 2: API Endpoints
6. **Employee Onboarding Controller** — `server/controllers/employeeOnboardingController.js`:
   - `GET /api/employee/onboarding` — returns pending default SOPs with title, version, due date.
   - `POST /api/employee/onboarding/:ackId/acknowledge` — flips status to `Acknowledged`, sets `acknowledged_at`.
7. **Routes** — Mount in `server/routes/employee.js`.

### Phase 3: Frontend Admin UI
8. **SOP Forms** — Add checkbox "Required for new employee onboarding" in `SOPCreateForm.jsx` and `SOPEditForm.jsx`.
9. **SOP List** — Add onboarding badge column and filter in `SOPListPage.jsx`.
10. **Service** — Include `is_default_onboarding` in `sopService.js` create/update calls.

### Phase 4: Frontend Employee UI
11. **Onboarding Page** — `EmployeeOnboardingPage.jsx` listing pending SOPs with "Mark as Read" button.
12. **API Client** — `employeeOnboarding.api.js`.
13. **Hook** — `useEmployeeOnboarding.js` for fetching + acknowledging.
14. **Route Guard** — `OnboardingGuard.jsx` wrapping `/my-learning/*` routes in `App.jsx`. If incomplete, navigate to `/my-learning/onboarding`.
15. **Dashboard Integration** — Show onboarding progress banner in `EmployeeDashboard.jsx` when pending SOPs exist.

---

## 7. Edge Cases & Decisions

| Edge Case | Decision |
|---|---|
| **Admin creates user with role `admin`** | `requireOnboardingComplete` exempts admin roles. No onboarding enforced. |
| **Employee promoted to `department_head`** | Existing pending onboarding SOPs remain; middleware no longer gates them. No auto-clear needed. |
| **SOP marked as onboarding AFTER user creation** | Existing users do NOT get retroactively assigned. Only new users get the SOP. Rationale: avoids mass notification spam. If retroactive assignment is needed, add an admin "Re-assign to all employees" action later. |
| **User deactivates/reactivates** | Deactivation sets `is_active = FALSE`. On reactivation, existing pending acknowledgements remain. If business requires re-onboarding, add a future flag. |
| **Bulk upload with mixed roles** | Auto-assignment runs for every user regardless of role. Admins are simply not gated. |
| **No default SOPs configured** | `getDefaultOnboardingSops()` returns empty array. `isOnboardingComplete()` returns `true`. Employee features work normally. |

---

## 8. Rollout Strategy

1. **Feature flag** (optional but recommended): Wrap onboarding enforcement behind `ENABLE_ONBOARDING_GATE` env var. Deploy with flag OFF, verify DB migration, then flip ON.
2. **Migration safety**: ALTER TABLE with `IF NOT EXISTS` is idempotent. Safe to run multiple times.
3. **Backward compatibility**: Existing users (created before this feature) have no pending acknowledgements, so `isOnboardingComplete()` returns `true` — no disruption.

---

## 9. Testing Checklist

- [ ] DB migration runs cleanly on existing DB.
- [ ] Single user creation auto-creates acknowledgements for default SOPs.
- [ ] Bulk upload auto-creates acknowledgements for all new users.
- [ ] Employee with pending SOPs receives 403 on `/my-learning/*` with `ONBOARDING_REQUIRED`.
- [ ] Admin role bypasses the gate.
- [ ] Employee can view pending SOPs on onboarding page.
- [ ] Employee can acknowledge SOPs and gain access.
- [ ] Acknowledged SOPs no longer block access.
- [ ] SOP admin can toggle `is_default_onboarding` in create/edit forms.
- [ ] SOP list shows onboarding badge.
- [ ] No N+1 queries in onboarding service.
