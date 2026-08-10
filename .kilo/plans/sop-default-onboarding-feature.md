# SOP Default Onboarding Feature

## Overview

This feature allows administrators to mark specific SOPs as **Default Onboarding SOPs** for new employees. When a new employee account is created, the system automatically assigns these SOPs and requires the employee to read and acknowledge them before accessing any employee-facing features.

---

## How It Works

1. **Admin Configuration**: Administrators mark SOPs as "Required for new employee onboarding" in the SOP create/edit forms.
2. **Auto-Assignment**: When a new employee user is created (single or bulk upload), the system automatically creates `Pending` acknowledgement records for all default onboarding SOPs.
3. **Onboarding Gate**: New employees are redirected to a standalone onboarding page (`/my-learning/onboarding`) immediately after login.
4. **Module Reading**: Employees read the SOP modules one-by-one with Previous/Next navigation.
5. **Completion**: Upon reaching the last module, the employee clicks "Proceed to Dashboard," which marks the SOP as acknowledged and grants access to all employee features.
6. **Access Control**: The `OnboardingGuard` middleware checks onboarding status and redirects incomplete employees. Admins and managers bypass the gate.

---

## Database Changes

### Migration

Run the following SQL migration (already included in `server/config/database.js`):

```sql
ALTER TABLE sops ADD COLUMN IF NOT EXISTS is_default_onboarding TINYINT(1) NOT NULL DEFAULT 0 AFTER restriction_type;
CREATE INDEX idx_sops_default_onboarding ON sops(is_default_onboarding) WHERE is_default_onboarding = 1;
```

**Notes:**
- The column defaults to `0` (false), so existing SOPs are unaffected.
- The partial index only indexes rows where `is_default_onboarding = 1`, keeping the index small.
- No new tables are required; the existing `sop_acknowledgements` table tracks completion.

---

## Backend Changes

### New Files

| File | Purpose |
|------|---------|
| `server/services/sopOnboardingService.js` | Business logic for assigning/tracking onboarding SOPs |
| `server/middleware/onboarding.js` | `requireOnboardingComplete` middleware for route protection |
| `server/controllers/employeeOnboardingController.js` | API endpoints for employee onboarding status and acknowledgement |

### Modified Files

| File | Change |
|------|--------|
| `server/config/database.js` | Added migration entries for `is_default_onboarding` column and index |
| `server/models/sopModel.js` | Added `hasDefaultOnboarding` column detection; included in `create()` and `update()` |
| `server/services/sopService.js` | Passed `is_default_onboarding` in `createSop()` and whitelisted in `updateSop()` |
| `server/models/authModel.js` | Auto-assign onboarding SOPs after single user creation |
| `server/routes/users.js` | Auto-assign onboarding SOPs after bulk upload user creation |
| `server/routes/employee.js` | Added onboarding endpoints (`/api/employee/onboarding`) and gate middleware |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/employee/onboarding` | Returns pending default SOPs with modules for the authenticated employee |
| `POST` | `/api/employee/onboarding/:ackId/acknowledge` | Marks a specific SOP acknowledgement as completed |

**Response format for `GET /api/employee/onboarding`:**
```json
{
  "success": true,
  "data": {
    "is_complete": false,
    "pending_count": 2,
    "items": [
      {
        "acknowledgement_id": 1,
        "sop_id": 5,
        "sop_code": "OPS-2024-001",
        "title": "Workplace Safety",
        "description": "...",
        "version": "1.0",
        "version_id": 10,
        "status": "Pending",
        "modules": [
          {
            "id": 101,
            "title": "Introduction",
            "content": "<p>...</p>",
            "sort_order": 0
          }
        ]
      }
    ]
  }
}
```

---

## Frontend Changes

### New Files

| File | Purpose |
|------|---------|
| `client/src/features/employee/pages/EmployeeOnboardingPage.jsx` | Standalone onboarding page (no sidebar/topbar) |
| `client/src/features/employee/api/employeeOnboarding.api.js` | API client for onboarding endpoints |
| `client/src/features/employee/hooks/useEmployeeOnboarding.js` | React hook for onboarding state management |
| `client/src/features/employee/components/OnboardingGuard.jsx` | Route guard component for employee routes |

### Modified Files

| File | Change |
|------|--------|
| `client/src/App.jsx` | Added standalone onboarding route; wrapped employee dashboard in `OnboardingGuard` |
| `client/src/layout/AppLayout.jsx` | Hidden sidebar and mobile bottom nav on `/my-learning/onboarding` path |
| `client/src/features/sop-management/components/SOPCreateForm.jsx` | Added "Required for new employee onboarding" checkbox |
| `client/src/features/sop-management/components/SOPEditForm.jsx` | Added "Required for new employee onboarding" checkbox |
| `client/src/features/sop-management/pages/SOPListPage.jsx` | Added onboarding badge display |
| `client/src/features/sop-management/hooks/useSOPList.js` | Added `is_default_onboarding` state and API payload |
| `client/src/features/sop-management/services/sopService.js` | Included `is_default_onboarding` in create/update payloads |

### Routing Behavior

| Path | Layout | Guard |
|------|--------|-------|
| `/my-learning/onboarding` | Standalone (no sidebar/topbar) | `EmployeeProtectedWrapper` only |
| `/my-learning/*` | Full `AppLayout` | `EmployeeProtectedWrapper` + `OnboardingGuard` |

---

## Admin Configuration

### Enabling Onboarding for a SOP

1. Navigate to **SOP Library** (`/sops`)
2. Create a new SOP or edit an existing one
3. Check the box: **"Required for new employee onboarding"**
4. Save the SOP

The SOP will now be automatically assigned to all newly created employee accounts.

### SOP List Badge

In the SOP Library, SOPs marked as onboarding defaults display an amber **"Onboarding"** badge in both grid and list views.

---

## New Employee Experience

### Login Flow

1. Employee logs in with credentials
2. System checks if the employee has pending default SOPs
3. If pending SOPs exist → redirect to `/my-learning/onboarding` (standalone page, no sidebar/topbar)
4. If no pending SOPs → redirect to normal employee dashboard (`/my-learning`)

### Onboarding Page Features

- **Required Reading** header with list of pending SOPs
- Each SOP card displays:
  - SOP title and version badge
  - SOP code
  - Description
  - Module progress indicator (Module X of Y, percentage)
  - Previous/Next navigation buttons
  - Dot indicators for module progress
- **Proceed to Dashboard** button appears on the last module
- Images within module content open in a lightbox when clicked
- After clicking "Proceed to Dashboard," the SOP is marked as acknowledged and the employee is redirected to `/my-learning`

### Admin/Manager Bypass

Users with roles `super_admin`, `admin`, or `department_head` are exempt from the onboarding gate and can access all features immediately.

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Admin bypass | `requireOnboardingComplete` middleware exempts admin roles |
| Authorization | Onboarding endpoints filter by `req.user.id`; users can only access their own data |
| Input validation | `acknowledgeOnboardingSop` validates `ackId` belongs to the current user |
| Race conditions | Uses DB transaction (`FOR UPDATE`) when acknowledging SOPs |
| Data leakage | Endpoints return only `Pending` SOPs for the authenticated user |

---

## Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| Bulk upload performance | Batch `INSERT` for multiple users × multiple SOPs |
| Index bloat | Partial index on `is_default_onboarding` keeps index tiny |
| Middleware overhead | Single `COUNT` query per request with cached result |
| Frontend redirect loops | Onboarding page exempts itself from the guard |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No default SOPs configured | All employees access features normally; `isOnboardingComplete()` returns `true` |
| Employee promoted to manager | Existing pending SOPs remain, but middleware no longer gates access |
| SOP unmarked as onboarding after user creation | Existing users do NOT get retroactively assigned |
| User deactivated/reactivated | Pending acknowledgements persist; employee still needs to complete onboarding |
| SOP with no modules | Shows "No content modules available for this SOP" |
| Multiple default SOPs | All must be acknowledged before access is granted |

---

## Testing Checklist

- [ ] DB migration runs cleanly on existing database
- [ ] Single user creation auto-creates acknowledgements for default SOPs
- [ ] Bulk upload auto-creates acknowledgements for all new users
- [ ] Employee with pending SOPs receives redirect to `/my-learning/onboarding`
- [ ] Admin role bypasses the gate
- [ ] Employee can view pending SOPs on onboarding page
- [ ] Modules display with Previous/Next navigation
- [ ] Progress indicator updates correctly
- [ ] "Proceed to Dashboard" appears on last module
- [ ] Images open in lightbox
- [ ] After acknowledging, employee can access `/my-learning/*` routes
- [ ] SOP admin can toggle `is_default_onboarding` in create/edit forms
- [ ] SOP list shows onboarding badge
- [ ] Sidebar and mobile nav hidden on onboarding page
- [ ] Root dashboard redirects incomplete employees to onboarding

---

## Rollout Strategy

1. Deploy backend with feature flag disabled (if using `ENABLE_ONBOARDING_GATE` env var)
2. Run DB migration
3. Verify migration success
4. Enable feature flag
5. Test with a new employee account
6. Monitor for any issues

---

## Related Files Summary

### Backend
- `server/services/sopOnboardingService.js`
- `server/middleware/onboarding.js`
- `server/controllers/employeeOnboardingController.js`
- `server/models/sopModel.js`
- `server/services/sopService.js`
- `server/models/authModel.js`
- `server/routes/users.js`
- `server/routes/employee.js`
- `server/config/database.js`

### Frontend
- `client/src/features/employee/pages/EmployeeOnboardingPage.jsx`
- `client/src/features/employee/api/employeeOnboarding.api.js`
- `client/src/features/employee/hooks/useEmployeeOnboarding.js`
- `client/src/features/employee/components/OnboardingGuard.jsx`
- `client/src/App.jsx`
- `client/src/layout/AppLayout.jsx`
- `client/src/features/sop-management/components/SOPCreateForm.jsx`
- `client/src/features/sop-management/components/SOPEditForm.jsx`
- `client/src/features/sop-management/pages/SOPListPage.jsx`
- `client/src/features/sop-management/hooks/useSOPList.js`
- `client/src/features/sop-management/services/sopService.js`
