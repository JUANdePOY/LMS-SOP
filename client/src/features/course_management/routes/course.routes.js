import { lazy } from "react";

const CourseCatalog = lazy(() => import("../pages/CourseCatalog"));
const CourseCreatePage = lazy(() => import("../pages/CourseCreatePage"));
const CourseDetailsPage = lazy(() => import("../pages/CourseDetailsPage"));
const CourseLibraryPage = lazy(() => import("../library/pages/CourseLibraryPage"));
const CourseLearnerView = lazy(() => import("../pages/CourseLearnerView"));
const LessonPage = lazy(() => import("../pages/LessonPage"));
const ModuleManagePage = lazy(() => import("../pages/ModuleManagePage"));
const ContentManagePage = lazy(() => import("../pages/ContentManagePage"));
const EnrollmentManagePage = lazy(() => import("../pages/EnrollmentManagePage"));
const GradebookPage = lazy(() => import("../pages/GradebookPage"));
const AssignmentManagePage = lazy(() => import("../pages/AssignmentManagePage"));
const QuizManagePage = lazy(() => import("../pages/QuizManagePage"));
const DiscussionManagePage = lazy(() => import("../pages/DiscussionManagePage"));
const InstructorDashboard = lazy(() => import("../pages/InstructorDashboard"));
const LearnerDashboard = lazy(() => import("../pages/LearnerDashboard"));
const ReportsPage = lazy(() => import("../pages/ReportsPage"));

const courseRouteConfig = [
  { path: "", Component: CourseCatalog, handle: { title: "Course Catalog" } },
  { path: "create", Component: CourseCreatePage, handle: { title: "Create Course" } },
  { path: ":id", Component: CourseDetailsPage, handle: { title: "Course Details" } },
  { path: ":id/edit", Component: CourseDetailsPage, handle: { title: "Edit Course" } },
  { path: ":id/modules/:moduleId", Component: ContentManagePage, handle: { title: "Module Content" } },
  { path: ":id/grades", Component: GradebookPage, handle: { title: "Gradebook" } },
  { path: ":id/enrollments", Component: EnrollmentManagePage, handle: { title: "Enrollments" } },
  { path: ":id/assignments", Component: AssignmentManagePage, handle: { title: "Assignments" } },
  { path: ":id/quizzes", Component: QuizManagePage, handle: { title: "Quizzes" } },
  { path: "library", Component: CourseLibraryPage, handle: { title: "Course Library" } },
  { path: "modules", Component: ModuleManagePage, handle: { title: "Modules" } },
  { path: "content", Component: ContentManagePage, handle: { title: "Content" } },
  { path: "discussions", Component: DiscussionManagePage, handle: { title: "Discussions" } },
  { path: "instructor", Component: InstructorDashboard, handle: { title: "Instructor Dashboard" } },
  { path: "learner", Component: LearnerDashboard, handle: { title: "Learner Dashboard" } },
  { path: "reports", Component: ReportsPage, handle: { title: "Reports" } },
  { path: "view/:id", Component: CourseLearnerView, handle: { title: "My Course" } },
  { path: "view/:id/lesson/:lessonId", Component: LessonPage, handle: { title: "Lesson" } },
];

export default courseRouteConfig;
