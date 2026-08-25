# Hide avg progress & launch buttons for non-enrolled employees

## Goal
On the course library and course details pages, an employee who is **not enrolled/assigned** to a course must not see:
1. The average-progress indicator (grid cards **and** list/table rows).
2. The "Open Course" / "Open in Learner View" launch buttons on the details page.

Enrolled employees keep their own "Your progress" and launch buttons.

## Key facts / data flow
- Enrollment for the current employee is derived from `myProgress`:
  - `CourseLibraryPage.jsx`: `decoratedCourses` sets `myProgress = myEnrollments[c.id] ? myEnrollments[c.id].progress : null` (line ~156). `myEnrollments` comes from `useMyEnrollments`, keyed by `course_id`. `null` ⇒ not enrolled.
  - `CourseLibraryDetailsPage.jsx`: `enrollments` from `useCourseLibraryDetails(courseId)`. `mine = enrollments.find(e => e.user_id === user?.id)` (line ~231). Presence ⇒ enrolled/assigned (any status).
- `isEnrolled = myProgress != null` is already computed in `CourseLibraryCard` and `CourseListRow`. `CourseTableRow` (in `CourseTable.jsx`) also has `myProgress` but no `isEnrolled` flag.
- Admin/manager cards already hide progress via `!isAdmin` (presence of `onAssign`). Leave admin behavior unchanged.

## Changes

### 1. `library/components/CourseLibraryCard.jsx` (grid card)
- Currently renders progress block when `!isAdmin` (line 98-109) and labels it "Your progress" vs "Avg progress" based on `isEnrolled`.
- Change the wrapper condition to `(!isAdmin && isEnrolled)` so non-enrolled employees see **no** progress block at all.
- Update the label text to just `"Your progress"` (the avg branch is no longer reachable).

### 2. `library/components/CourseTable.jsx` (list view rows)
- `CourseTableRow` (lines 15-101): compute `const isEnrolled = myProgress != null;` and gate the progress `<td>` cell (lines 80-95) on `showProgress && isEnrolled`.
- When `showProgress` is true but the employee is not enrolled, render a muted placeholder (e.g. `—` / "Not enrolled") instead of the avg-progress bar so the column stays aligned. Keep the "Progress" column header when `showProgress` is true.

### 3. `library/components/CourseListRow.jsx` (consistency, if still used)
- Mirror change #1: only render the progress line (`avgProgress` block, lines 63-79) when `isEnrolled` (already computed line 11). Non-enrolled ⇒ hide the progress line. (Leave enrollment/completed counts visible.)

### 4. `library/pages/CourseLibraryDetailsPage.jsx` (launch buttons)
- Add derived flag: `const employeeEnrolled = Boolean(enrollments.find(e => e.user_id === user?.id))` (reuse existing `myProgress`/`mine` logic; can compute once near line 230).
- Hero `primaryAction` (lines 377-395): change to `isEmployee ? (employeeEnrolled && <Open Course button>) : <Edit Course button>`. Non-enrolled employee ⇒ no primary action.
- Content-tab `headerAction` (lines 435-445): change to `isEmployee && employeeEnrolled ? <Open in Learner View button> : null`.

## Out of scope (note only)
- Employees can still open the details page and view course content/lessons even when not enrolled; only the launch buttons are removed.
- `enrollments` list is capped at `limit: 100` (library.api.js). If a course has >100 enrollments, a legitimately enrolled user might not appear and would be treated as not enrolled. Acceptable for this UI task; flag if data correctness is critical.

## Validation
- As an employee not enrolled in a course: grid card + list row show no progress; details page shows neither launch button.
- As an enrolled employee: card/row show "Your progress" with the correct %; details page shows both launch buttons; learner view opens.
- As admin/manager: cards/rows show no progress (unchanged); details page still shows "Edit Course" (unchanged).
- `npm run build` succeeds with no new errors/warnings.
