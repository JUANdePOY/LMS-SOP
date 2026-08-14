# Page Content Animation Enhancement Plan

## Context
The app already has a global motion layer:
- `shared/motion/MotionProvider` wraps the app in `<MotionConfig reducedMotion="user">` → animations auto-disable for users who prefer reduced motion (accessibility already covered).
- `layout/AppLayout.jsx:354` wraps every route in `<PageTransition>` → all pages already fade+slide on navigation.
- Primitives exist in `shared/motion`: `StaggerList`, `MotionItem`, `FadeIn`, `MotionFrame`, `PageTransition`, and `tokens` (`EASE`, `DURATION`, `STAGGER`, `PAGE_VARIANT`, `SHEET_VARIANT`).

`CourseLibraryDetailsPage.jsx` is the reference pattern: section panels and stat cards are wrapped in `<StaggerList>` (container) + `<MotionItem>` (each card), giving a staggered fade/slide-in feel.

**Goal:** Apply that same staggered content-animation pattern to the primary feature pages so the whole system "feels" animated, not just on route change.

**Scope (confirmed):** All page files under `client/src/features/**/pages/**` (≈55 pages). Skip the legacy duplicate routing pages in `client/src/pages/**` (e.g. `pages/courses.jsx`, `pages/management/CoursesPanel.jsx`) — those are superseded by the feature pages.

## Reusable Transformation Recipe
For each target page, make these mechanical changes:

1. **Imports** at top of file:
   ```js
   import { StaggerList, MotionItem, FadeIn } from "@/shared/motion";
   ```
   (add `MotionFrame` only where animating a modal/drawer body.)

2. **Stat / info card grids** (KPI cards, "What you'll learn", Course Info, etc.):
   - Wrap the grid container in `<StaggerList className="...existing grid classes...">`.
   - Convert each card from `<div>`/`<li>` to `<MotionItem>` (keep `key` and `className`). Use `as="li"` if it was a list item.

3. **Lists / tables of entities** (course cards, lesson rows, enrollment rows, quiz rows, SOP cards, employee rows):
   - Wrap the mapped collection's container in `<StaggerList>`.
   - Wrap each mapped item in `<MotionItem as="...">` where `as` matches the rendered element (`"div"`, `"li"`, `"tr"`, `"button"` — `MotionItem` supports the `as` prop). Keep existing `key`, `className`, and event handlers.

4. **Section headers / hero panels**: optionally wrap in `<FadeIn delay={0.05}>` for a gentle entrance. Use sparingly to avoid over-animation.

5. **Modals / drawers** (only if cheap): wrap inner content in `<MotionFrame variant="sheet">`. Otherwise leave existing modal animations untouched.

### Notes / constraints
- `MotionItem` default renders a `div` and animates `{opacity:0,y:10}→{opacity:1,y:0}`. For tables use `as="tr"` / `as="li"` / `as="button"` so HTML structure stays valid.
- Keep `staggerChildren` at the default `0.05` (feels snappy). Do not exceed ~0.08.
- Do NOT remove or double the existing `<PageTransition>` wrapper — it handles the page-level fade; content stagger is additive.
- For very large or frequently re-filtered tables, wrapping in `StaggerList` only animates on mount/add of children, which is acceptable; do not add per-keystroke re-animation.
- Respect the component-size rule (<300 lines): wrapping with these primitives adds only imports + wrapper tags, not logic.
- reduced-motion is handled globally — no per-component checks needed.

## Implementation Tasks (grouped by feature area)
Apply the recipe above to each page in these groups:

**employee** — `EmployeeDashboard`, `EmployeeTrainingDashboard`, `EmployeeCourseCatalog`, `EmployeeCourseView`, `EmployeeSOPLibrary`, `EmployeeSOPView`, `EmployeeOnboardingPage`, `EmployeeSettings`

**course_management** — `CourseCatalog`, `CourseDetailsPage`, `CourseCreatePage`, `CourseBuilderPage`, `CourseLearnerView`, `LessonPage`, `LearnerDashboard`, `InstructorDashboard`, `ContentManagePage`, `ModuleManagePage`, `QuizManagePage`, `AssignmentManagePage`, `GradebookPage`, `EnrollmentManagePage`, `DiscussionManagePage`, `ReportsPage`, `employee/EmployeeDashboard`

**course_management/library** — `CourseLibraryPage` (details page already matches the pattern)

**assessments** — `AssessmentsDashboardPage`, `QuizListPage`, `QuizLeaderboardPage`, `QuizResultsPage`, `TakeQuizPage`, `QuizBuilderPage`, `ViolationDashboardPage`

**sop-management** — `SOPListPage`, `SOPWorkspacePage`, `SOPVersionPage`, `PublicSOPPage`

**organization-management** — `HierarchyOverviewPage`, `BusinessPage`, `DepartmentPage`, `CategoryPage`

**certificate-management** — `CertificateTemplatesPage`, `MyCertificatesPage`, `VerifyCertificatePage`

**employee-directory** — `EmployeeDirectoryPage`

**events** — `EventsPage`

**messaging** — `MessagingPage`

**announcements** — `AnnouncementsPage`

**profile** — `UserProfilePage`

**digital-id** — `DigitalIDPage`

**task-management** — `TasksPage`, `MyTasksPage`, `TaskDetailsPage`

## Validation
- `npm run build` succeeds with no new warnings/errors.
- Manually navigate through pages in each group; confirm stat cards, lists, and tables fade/slide in with a stagger on mount.
- Toggle OS "reduce motion" setting (or emulate via DevTools rendering emulation) and confirm animations are suppressed (global `MotionConfig` handles this).
- Verify no console errors and that interactive handlers (clicks, row selection) still work after wrapping.
- Confirm existing `PageTransition` page fade still occurs on route change.
