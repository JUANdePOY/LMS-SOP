# Employee Role UI/UX Improvement Plan

## Overview
This document outlines a comprehensive UI/UX improvement plan for the **Employee role** in the LMS platform. The focus is on streamlining the user experience, enforcing strict data visibility constraints, and improving engagement across core modules.

---

## 1. Employee Dashboard Refinement

### Current State Analysis
**File:** `client/src/features/employee/pages/EmployeeDashboard.jsx`

The current Employee Dashboard includes:
- Personalized greeting with date
- "Continue Learning" section (in-progress courses)
- "My Courses" section (all enrolled courses)
- **"Explore Courses" section** — shows published courses from `useEmployeeDashboard()` (`publishedCourses`)
- Search functionality for exploring courses

### Issues Identified
1. **"Explore Courses" section violates access control** — Employees can browse all published courses, which contradicts the requirement that they should only view assigned content.
2. **No explicit visibility enforcement** — The dashboard relies on the hook to filter data, but the UI still presents an "explore/browse" experience.
3. **Search in dashboard is redundant** — If employees can only see assigned courses, a search/browse feature is unnecessary and confusing.

### Proposed Changes

#### 1.1 Remove "Explore Courses" Section
- **Remove lines 192-237** from `EmployeeDashboard.jsx`:
  - The entire `<div className="space-y-4">` block containing the "Explore Courses" heading, search input, and course grid.
- **Remove related state:**
  - `const [search, setSearch] = useState("");`
  - `const filteredLibrary = publishedCourses.filter(...)`
  - `handleLibraryClick` navigation
- **Keep only:**
  - Greeting/header section
  - "Continue Learning" card (if in-progress courses exist)
  - "My Courses" grid (assigned/enrolled courses only)

#### 1.2 Enforce Strict Access Control
- **Remove dependency on `publishedCourses`** from `useEmployeeDashboard()` hook.
- **Ensure `enrollments` only returns courses explicitly assigned to the employee** (backend enforcement required — see Backend section below).
- **Add empty state messaging:**
  - When no courses are assigned: "You have no courses assigned yet. Please contact your administrator."
  - Hide search/filter UI entirely when no courses exist.

#### 1.3 UI Refinements
- Simplify dashboard to a **single-column focus layout**:
  - Top: Welcome banner + quick stats (courses in progress, completed)
  - Middle: "Continue Learning" card (if applicable)
  - Bottom: "My Assigned Courses" grid
- Remove all browsing/discovery elements.
- Add visual cue that content is **assigned**, not optional.

---

## 2. Course Library Optimization — View-Only Mode

### Current State Analysis
**Files:**
- `client/src/features/course_management/library/pages/CourseLibraryPage.jsx`
- `client/src/features/course_management/library/pages/CourseLibraryDetailsPage.jsx`
- `client/src/features/employee/pages/EmployeeCourseCatalog.jsx`

The Course Library currently allows:
- Browsing all published courses
- Viewing course details
- **Potential enrollment actions** (depending on route/component)

### Proposed Changes

#### 2.1 Employee Course Catalog — View-Only Transformation
**File:** `client/src/features/employee/pages/EmployeeCourseCatalog.jsx`

- **Rename heading** from "Browse and enroll in published courses" to "Assigned Courses" or "My Courses".
- **Remove enrollment actions:**
  - Ensure no "Enroll" or "Join" buttons are present.
  - Course cards should be **clickable only if the employee is already enrolled**; otherwise, show a "Not Assigned" badge or hide the card entirely.
- **Add read-only indicators:**
  - Disable hover effects that suggest interactivity for unassigned courses.
  - Show lock icon or "Assigned Only" label on course cards.
- **Simplify filters:**
  - Keep search for assigned courses only.
  - Remove difficulty/category filters if they don't apply to assigned content.

#### 2.2 Course Library Details Page — Remove Admin Features
**File:** `client/src/features/course_management/library/pages/CourseLibraryDetailsPage.jsx`

- **Hide admin-only sections for employees:**
  - "Enrollments" tab
  - "Analytics" tab
  - "Assign Employees" button/modal
  - Export buttons (`exportGradesCSV`, `exportEnrollmentsExcel`, `exportCoursePDF`)
- **Show only:**
  - Course overview (title, description, instructor, duration)
  - Lesson list / curriculum
  - Progress tracking (if enrolled)
- **Add role-based conditional rendering:**
  ```jsx
  const isEmployee = user?.role === 'employee';
  // Hide tabs/sections when isEmployee is true
  ```

#### 2.3 Navigation Adjustments
- **Sidebar:** Keep "Course Library" visible for employees, but route to the employee-specific catalog (`EmployeeCourseCatalog`) instead of the admin library.
- **Disable view-mode toggles** (grid/list) for employees if unnecessary.
- **Remove "Create Course" / "Manage" actions** from employee navigation entirely.

---

## 3. SOP Library Access Control

### Current State Analysis
- Employees currently have access to the full SOP Library (`/sops` route).
- No department-based filtering is enforced in the UI or backend for SOP listings.

### Proposed Changes

#### 3.1 Frontend Filtering
- **Modify SOP list/query to filter by `department_id`** matching the logged-in employee's department.
- **Hide SOPs from other departments** — do not render them in the list at all.
- **Add empty state:**
  - "No SOPs are assigned to your department yet."
- **Remove search/filter options** that could reveal restricted SOPs (e.g., global search across all SOPs).

#### 3.2 SOP Details Page
- **Hide edit/delete/assign actions** for employees.
- **Show read-only view:**
  - SOP title, description, version, department
  - Steps/content only
- **Prevent navigation to edit routes** (`/sops/:id/edit`) for employees via route guards.

#### 3.3 Backend Enforcement
- **API endpoint `/api/sops`** must accept `department_id` param and filter results server-side.
- **Middleware/RBAC** must validate that employees can only fetch SOPs where `department_id = user.department_id`.
- **Never trust frontend filtering alone** — backend must enforce department scope.

---

## 4. Module Enhancements

### 4.1 Messaging Module
**Goal:** Improve engagement and usability for employees.

#### Proposed Changes
- **Simplified inbox view:**
  - Show only messages relevant to the employee (no broadcast/admin-only threads unless explicitly included).
  - Remove "Compose to all" or mass-messaging features.
- **Quick actions:**
  - Add "Reply" and "Mark as Read" as primary actions.
  - Hide "Delete for everyone" or admin moderation tools.
- **UI improvements:**
  - Conversation list with unread badges.
  - Search within conversations.
  - Timestamp grouping (Today, Yesterday, This Week).

### 4.2 Announcements Module
**Goal:** Make announcements scannable and relevant.

#### Proposed Changes
- **Role-targeted announcements:**
  - Employees see only announcements targeted to `employee` role or their department.
  - Hide admin-only announcements (e.g., system maintenance, user management updates).
- **Card-based layout:**
  - Priority indicators (high/medium/low).
  - Read/unread status.
  - "Mark all as read" button.
- **Dismissal behavior:**
  - Allow dismissing non-mandatory announcements.
  - Mandatory announcements remain visible until acknowledged.

### 4.3 Events Module
**Goal:** Streamline event discovery and interaction.

#### Proposed Changes
- **Event card redesign:**
  - Clear date/time, location (physical/virtual), and relevance indicator.
  - "Register" button only for events the employee is eligible for.
  - Hide event management/creation tools.
- **Calendar view (optional):**
  - Monthly calendar with event dots.
  - Click to view event details.
- **Filters:**
  - Upcoming vs. past events.
  - Department-specific events only.

---

## 5. Implementation Roadmap

### Phase 1: Dashboard & Access Control (High Priority)
1. Remove "Explore Courses" from `EmployeeDashboard.jsx`
2. Update `useEmployeeDashboard` hook to exclude `publishedCourses`
3. Add role-based guards in `CourseLibraryDetailsPage.jsx`
4. Backend: Ensure `/api/courses` and `/api/enrollments` enforce employee assignment rules

### Phase 2: Course Library View-Only Mode (High Priority)
1. Transform `EmployeeCourseCatalog.jsx` to view-only
2. Update `CourseLibraryPage.jsx` to detect employee role and simplify UI
3. Add conditional rendering for admin tabs in `CourseLibraryDetailsPage.jsx`
4. Backend: Add `skip_enrollment` or `view_only` flag to course API responses for employees

### Phase 3: SOP Library Department Restriction (High Priority)
1. Update SOP list query to filter by `department_id`
2. Hide admin actions in SOP details page for employees
3. Backend: Modify `/api/sops` to accept `department_id` and enforce RBAC
4. Add route guards for SOP edit/delete routes

### Phase 4: Module UI/UX Enhancements (Medium Priority)
1. Messaging: Redesign inbox, add quick actions, remove admin tools
2. Announcements: Implement role-targeted announcements, card layout
3. Events: Redesign event cards, add calendar view, restrict management features

---

## 6. Backend Requirements Summary

| Endpoint | Required Change |
|----------|-----------------|
| `GET /api/courses` | Filter by enrolled/assigned courses for employees |
| `GET /api/enrollments` | Return only employee's own enrollments |
| `GET /api/sops` | Accept `department_id`, filter results server-side |
| `GET /api/messages` | Filter by recipient/role |
| `GET /api/announcements` | Filter by target role/department |
| `GET /api/events` | Filter by eligibility/department |

---

## 7. Frontend Component Changes

| Component | Change |
|-----------|--------|
| `EmployeeDashboard.jsx` | Remove Explore Courses, keep My Courses + Continue Learning |
| `EmployeeCourseCatalog.jsx` | View-only, remove enrollment actions |
| `CourseLibraryPage.jsx` | Detect employee role, simplify to view-only |
| `CourseLibraryDetailsPage.jsx` | Hide admin tabs for employees |
| `EmployeeCourseView.jsx` | Keep as-is (already read-only for enrolled content) |
| `Sidebar.jsx` | Ensure employee menu items exclude management actions |
| `ProtectedRoute.jsx` | Verify employee role is correctly normalized and checked |

---

## 8. Success Metrics
- Employees cannot see or access courses/SOPs outside their assignment/department.
- Dashboard load time < 2s with only assigned content.
- Zero enrollment/admin actions available in employee UI.
- Announcements/messaging show only relevant content.
- No backend API leaks restricted data to employee requests.
