# Plan: Employee Course Assignment Notifications

## Current State

- **Backend**: `enrollmentsController.js` creates enrollments but never inserts into `notifications` table
- **Sidebar**: `getBadgeCount("/my-learning")` returns `0` — only messaging and banner dismissal counts are tracked
- **Header**: `NotificationDropdown` works but receives no enrollment notifications
- **Dashboard**: `usePageUpdates` polls enrollments every 30s and shows a **generic** `UpdateNotificationBanner` ("New changes are available on your dashboard") — not specific to new enrollments

## Goal

When an admin enrolls an employee in a course (single, bulk, or department-wide), the employee sees:
1. **Red badge** on "My Learning" in the sidebar
2. **Notification** in the top header bell dropdown
3. **Specific banner** on the employee dashboard: "You have been enrolled in: [Course Name]"

## Proposed Changes

### 1. Backend — Enrollment Notifications

**File**: `server/controllers/enrollmentsController.js`

Import `createSystemNotification` from `notificationService` and call it after successful enrollment creation in three places:

| Function | Trigger |
|----------|---------|
| `enrollStudent` | After `enrollmentModel.create()` succeeds |
| `bulkEnroll` | After `enrollmentModel.bulkCreate()` succeeds, for each new enrollment |
| `bulkEnrollByDepartment` | After `enrollmentModel.bulkCreate()` succeeds, for each new enrollment |

Notification payload:
```javascript
createSystemNotification({
  userId: enrolledUserId,
  title: 'You have been enrolled in a new course',
  body: course.title,
  type: 'info',
  link: '/my-learning',
  entityType: 'enrollment',
  entityId: enrollmentId,
}).catch(() => {});
```

Use fire-and-forget (`.catch(() => {})`) so enrollment speed is unaffected.

### 2. Frontend — Store Helpers

**File**: `client/src/shared/stores/notificationStore.js`

Add two methods to `NotificationStore`:
- `getEnrollmentNotificationCount()` — counts unread notifications where `entity_type === 'enrollment'`
- `getUnreadEnrollmentNotifications()` — returns unread enrollment notifications sorted by `created_at DESC`

Expose them via `useNotifications()` return value.

### 3. Frontend — Sidebar Badge

**File**: `client/src/shared/components/navigation/sidebar/Sidebar.jsx`

Update `getBadgeCount(path)`:
```javascript
if (path === "/messaging") return notificationStore.unreadMessageCount || 0;
if (path === "/my-learning") return notificationStore.getEnrollmentNotificationCount?.() || 0;
```

This makes the "My Learning" sidebar item show a red badge proportional to unread enrollment notifications.

### 4. Frontend — Header Dropdown

**File**: `client/src/shared/components/ui/NotificationDropdown.jsx`

Add `enrollment` to the existing entity-specific maps:
- `ENTITY_ICON['enrollment']` → `UserPlus`
- `ENTITY_BORDER['enrollment']` → `border-l-blue-400`
- `ENTITY_ICON_COLOR['enrollment']` → `bg-blue-100 text-blue-600`

This makes enrollment notifications render with a blue left border and UserPlus icon in the dropdown.

### 5. Frontend — Dashboard Banner

**File**: `client/src/features/employee/pages/EmployeeDashboard.jsx`

Replace the generic `usePageUpdates` banner with enrollment-specific banners driven by unread enrollment notifications:

1. Import `useNotifications` from the notification store
2. Get `unreadEnrollmentNotifications` from the store
3. For each unread enrollment notification, render a banner:
   ```
   "You have been enrolled in: [Course Title]"
   ```
4. When clicked → `markRead(notification.id)` + `navigate('/my-learning')`
5. Keep `usePageUpdates` for non-enrollment updates (course content changes, etc.) but render it below enrollment banners

### 6. UX Flow

```
Admin enrolls employee
        │
        ▼
Backend creates notification (entity_type='enrollment')
        │
        ▼
┌─────────────────────────────────────────────┐
│ Employee sees:                               │
│                                             │
│ 1. Sidebar "My Learning" → red badge count  │
│ 2. Header bell → red badge + dropdown item   │
│ 3. Dashboard → "You have been enrolled in:   │
│    [Course Name]" banner with CTA            │
└─────────────────────────────────────────────┘
        │
        ▼ (employee clicks banner or navigates)
Notification marked as read → badges clear
```

## Out of Scope

- Real-time push via WebSocket (continue polling)
- Notification preferences / opt-out
- Notifications for unenrollment
- Notifications for course content updates (separate from enrollment)

## Validation

1. Enroll a test employee in a course via admin panel
2. Verify employee sees red badge on "My Learning" in sidebar
3. Verify employee sees notification in header bell dropdown
4. Verify employee sees enrollment banner on dashboard
5. Click banner → navigates to My Learning, badge clears
6. Check bell dropdown → notification marked as read
