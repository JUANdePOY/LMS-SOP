# Employee Messaging, Events, and Announcements Module Implementation

## Summary

Implemented employee-accessible functionality for the messaging, events, and announcements modules. Previously, these modules were admin-only (`super_admin`/`admin`). Employees can now access messaging (full CRUD), events (read-only), and announcements (read-only with detail view). The employee dashboard was also verified to have no "current events" section.

---

## 1. Employee Dashboard

### File: `client/src/features/employee/pages/EmployeeDashboard.jsx`

- **No events section**: Confirmed the employee dashboard does not contain a "current events" section. The dashboard displays Announcements and Recent Messages summaries only, linking to their respective full pages.
- **Data field fix**: Updated conversation display to use `conv.last_message_body` and `conv.last_message_at` (flat fields returned by the backend SQL) instead of the non-existent `conv.last_message?.body` / `conv.last_message?.created_at`.
- **Cleanup**: Removed unused imports (`Search`, `useState`) and unused state variables (`search`, `announcementsLoading`, `messagesLoading`) left over from the removed course-library search section.

---

## 2. Messaging Module (Full Employee Access)

### Backend Changes

#### `server/models/messageModel.js`
- **`listConversations(userId)`**: Added two computed fields to the SQL query:
  - `unread_count` — count of messages where `read_at IS NULL AND sender_id != userId`
  - `last_message_body` — body text of the most recent message
- **`getConversation(id)`**: Added the same `unread_count` and `last_message_body` fields for consistency with `listConversations`.

#### `server/controllers/messageController.js`
- **`createConversation`**: Changed the response to return the full conversation object (with `messages` array) instead of just the first message object. This allows the frontend to correctly add the new conversation to the list.

### Frontend Changes

#### `client/src/features/messaging/hooks/useMessages.js`
- **`useConversations`**: 
  - Added `cancelRef` for cleanup to prevent state updates after unmount.
  - Fixed `create` to return `res.data.data` (the conversation object) instead of `res.data`.
  - Added `markRead` function for single-message read status updates.
- **`useMessages`**: 
  - Added `cancelRef` for cleanup in the polling lifecycle.
  - Added `markAllAsRead(currentUserId)` callback that marks all unread messages as read and updates local state.

#### `client/src/features/messaging/components/ConversationList.jsx`
- Rewrote to display unread count badges, last message preview (`last_message_body`), and relative time formatting (`timeAgo`).
- Unread conversations are styled with bold text and a colored badge.

#### `client/src/features/messaging/components/MessageThread.jsx`
- Added `onMarkAllRead` prop with a "Mark all read" button that appears when unread messages exist.
- Added `loading` prop to show a spinner while messages are being fetched.
- Added read receipts: `CheckCheck` icon for read messages, `Check` icon for unread messages sent by the current user.
- Added `Loader2` spinner for send-in-progress state.

#### `client/src/features/messaging/pages/MessagingPage.jsx`
- Added `useAuth` for user identification.
- Added page header with title and description.
- Added loading state for the conversations list.
- Auto marks messages as read when a conversation is opened (via `useEffect` watching `selectedConversation` and `messages`).
- Wired up `onMarkAllRead` on `MessageThread`.
- Passed `onCreate` handler to `ConversationList` for the "New Conversation" button.

---

## 3. Events Module (Employee Read-Only)

### Route Change

#### `client/src/App.jsx`
- Changed `/events` route protection from `AdminProtectedWrapper` to `LMSProtectedWrapper`, allowing all LMS roles (including `employee`) to access the page.

### Role-Based UI Controls

#### `client/src/features/events/pages/EventsPage.jsx`
- Added `useAuth` and `canManage` check (`['super_admin', 'admin'].includes(user?.role)`).
- Passes `canManage` to `CalendarGrid` and `EventDayDetail`.
- The event form `Modal` only renders when `canManage` is true.
- Auto-selects today's date on load so the day detail panel shows immediately.
- Added page description.

#### `client/src/features/events/components/CalendarGrid.jsx`
- Accepts `canManage` prop.
- The "+" create button on selected days only appears when `canManage` is true.

#### `client/src/features/events/components/EventDayDetail.jsx`
- Accepts `canManage` prop.
- The "Add" button and edit/delete action buttons only appear when `canManage` is true.

#### `client/src/features/events/components/EventList.jsx`
- Accepts `canManage` prop.
- The "New Event" button and edit/delete action buttons only appear when `canManage` is true.

---

## 4. Announcements Module (Employee Read-Only)

### Route Change

#### `client/src/App.jsx`
- Changed `/announcements` route protection from `AdminProtectedWrapper` to `LMSProtectedWrapper`, allowing all LMS roles to access the page.

### Role-Based UI Controls

#### `client/src/features/announcements/pages/AnnouncementsPage.jsx`
- Added `useAuth` and `canManage` check.
- Passes `canManage` and `onView` to `AnnouncementList`.
- Added an `AnnouncementDetail` modal (available to all users) for viewing full announcement content.
- The announcement form `Modal` only renders when `canManage` is true.
- Added page header with title and description.

#### `client/src/features/announcements/components/AnnouncementList.jsx`
- Accepts `canManage` and `onView` props.
- The "New Announcement" button only appears when `canManage` is true.
- Edit/delete buttons only appear when `canManage` is true.
- Announcement items are clickable to open the detail view (eye icon); this is available to all users.

#### `client/src/features/announcements/components/AnnouncementDetail.jsx` (NEW)
- Full announcement detail viewer displaying title, priority badge, body, type, author, and creation date.

---

## 5. Sidebar Navigation

### `client/src/shared/components/navigation/sidebar/Sidebar.jsx`
- Changed COMMUNICATION group items (Messaging, Announcements, Events) from `roles: ['super_admin', 'admin']` to `roles: LMS_ROLES`, making them visible to all authenticated LMS users.

---

## 6. Lint Cleanup

Fixed pre-existing ESLint errors:
- `client/src/features/employee/api/employee.api.js` — removed unused `authHeaders` function.
- `client/src/features/employee/components/EmployeeCourseCard.jsx` — removed unused `isEnrolled` variable and `enrollmentStatus` prop.
- `client/src/features/employee/pages/EmployeeCourseView.jsx` — removed unused `useToast` import and `toast` reference.

## Verification

All modified files pass ESLint with zero errors or warnings.

---

## Deployment Fixes (Live Hostinger Issue)

### 1. Avatar Upload 422 Error

**Problem**: After uploading a profile picture, the image GET request returned `422 (Unprocessable Content)`.

**Root cause**: The `.htaccess` on Hostinger had no rewrite rules for serving `/uploads/` paths. All requests were routed to the Node.js server (via Passenger), but the server had no `express.static` middleware for the uploads directory. Requests for avatar images fell through to the SPA fallback, returning HTML instead of the image binary.

**Fix**:
- **`server/server.js`**: Added `app.use('/uploads', express.static(getUploadRoot()))` before the SPA fallback middleware, with `const { getUploadRoot } = require('./config/uploads')`.
- **`.htaccess`**: Added rewrite rules to:
  - Proxy `/api` requests to the Node.js server (Passenger on port 5000).
  - Proxy `/uploads/` requests to the Node.js server so `express.static` can serve avatars, certificates, and other uploaded files.
  - Serve `client/dist/index.html` as the SPA fallback for all other non-static routes.

### 2. Date Input Format Errors

**Problem**: Browser console warnings: `The specified value "2021-02-10T00:00:00.000Z" does not conform to the required format, "yyyy-MM-dd"`.

**Root cause**: HTML `<input type="date">` elements received ISO datetime strings from the API (e.g., `"1992-06-30T00:00:00.000Z"`) but expect `yyyy-MM-dd` format.

**Fix**: Added a `toDateInputValue(value)` helper in `client/src/pages/Profile.jsx` that converts ISO datetime strings to `yyyy-MM-dd` format before passing to date input fields. Applied to both the Personal Information and Employment Details sections for `date_hired` and `birthdate` fields.

### 3. JSX Parsing Error in Profile

**Problem**: `[plugin:vite:react-babel] Profile.jsx: Unexpected token (27:26)` — the build/dev server failed to parse the file.

**Root cause**: During the date input fixes, `strokeWidth={1.8}` was accidentally merged into the `className` string of the `SectionCard` component: `className="text-blue-500 dark:text-blue-400 strokeWidth={1.8}"`. The `{1.8}` inside the string was interpreted as a JSX expression, breaking the parser.

**Fix**: Restored `strokeWidth={1.8}` as a separate JSX prop outside the `className` string.

### 4. MariaDB Migration Syntax Errors

**Problem**: Hostinger runtime log showed:
```
Course migration error: You have an error in your SQL syntax ... near 'FOREIGN KEY (category_id) REFERENCES categories(id)...'
Assessments migration error: You have an error in your SQL syntax ... near 'FOREIGN KEY (hierarchy_id) REFERENCES quiz_hierarchy(id)...'
```

**Root cause**: MariaDB does not support `IF NOT EXISTS` with `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`. The `IF NOT EXISTS` clause is only valid for `CREATE` and `DROP` statements in MariaDB, not for `ALTER TABLE` constraint operations.

**Fix**: Removed `IF NOT EXISTS` from both migration statements:
- `server/migrations/courseManagement.js:32` — `ALTER TABLE courses ADD CONSTRAINT fk_courses_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL`
- `server/migrations/assessments.js:114` — `ALTER TABLE quiz_questions ADD CONSTRAINT fk_question_hierarchy FOREIGN KEY (hierarchy_id) REFERENCES quiz_hierarchy(id) ON DELETE SET NULL`

Both migration runners already catch `ER_DUP_KEYNAME` (error 1061) for subsequent runs, so removing `IF NOT EXISTS` is safe — the constraint creates on first run and is gracefully skipped on subsequent runs.

