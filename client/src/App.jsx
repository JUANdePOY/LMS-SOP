import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { lazy, Suspense } from "react";

import { ToastProvider } from "@/shared/components/Toast";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import ProtectedRoute from "@/shared/components/ProtectedRoute";
import { MotionProvider } from "@/shared/motion";
import { SOPProvider } from "@/features/sop-management/context/SOPContext";
import { CourseProvider } from "@/features/course_management/context/CourseContext";
import { CourseModalProvider } from "@/features/course_management/context/CourseModalContext";
import { EnrollmentProvider } from "@/features/course_management/context/EnrollmentContext";
import { GradingProvider } from "@/features/course_management/context/GradingContext";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingGuard from "@/features/employee/components/OnboardingGuard";

const Dashboard     = lazy(() => import("@/pages/Dashboard"));
const EmployeeDashboard = lazy(() => import("@/features/employee/pages/EmployeeDashboard"));
const EmployeeTrainingDashboard = lazy(() => import("@/features/employee/pages/EmployeeTrainingDashboard"));
const EmployeeCourseCatalog = lazy(() => import("@/features/employee/pages/EmployeeCourseCatalog"));
const EmployeeCourseView = lazy(() => import("@/features/employee/pages/EmployeeCourseView"));
const EmployeeSOPView = lazy(() => import("@/features/employee/pages/EmployeeSOPView"));
const EmployeeOnboardingPage = lazy(() => import("@/features/employee/pages/EmployeeOnboardingPage"));
const Profile       = lazy(() => import("@/pages/Profile"));
const UserProfilePage = lazy(() => import("@/features/profile/pages/UserProfilePage"));
const Login         = lazy(() => import("@/pages/Login"));
const Settings      = lazy(() => import("@/pages/Settings"));
const AuditLogs     = lazy(() => import("@/pages/AuditLogs"));
const Courses = lazy(() => import("@/pages/courses"));
const CourseDetailsPage = lazy(() => import("@/features/course_management/pages/CourseDetailsPage"));
const CourseLearnerView = lazy(() => import("@/features/course_management/pages/CourseLearnerView"));
const LessonPage = lazy(() => import("@/features/course_management/pages/LessonPage"));
const CourseBuilderPage = lazy(() => import("@/features/course_management/pages/CourseBuilderPage"));
const CourseLibraryPage = lazy(() => import("@/features/course_management/library/pages/CourseLibraryPage"));
const CourseLibraryDetailsPage = lazy(() => import("@/features/course_management/library/pages/CourseLibraryDetailsPage"));
const SOPListPage    = lazy(() => import("@/features/sop-management/pages/SOPListPage"));
const SOPWorkspacePage = lazy(() => import("@/features/sop-management/pages/SOPWorkspacePage"));
const SOPVersionPage = lazy(() => import("@/features/sop-management/pages/SOPVersionPage"));
const PublicSOPPage = lazy(() => import("@/features/sop-management/pages/PublicSOPPage"));
const CertificateTemplatesPage = lazy(() => import("@/features/certificate-management/pages/CertificateTemplatesPage"));
const MyCertificatesPage = lazy(() => import("@/features/certificate-management/pages/MyCertificatesPage"));
const VerifyCertificatePage = lazy(() => import("@/features/certificate-management/pages/VerifyCertificatePage"));

// Organization Management
const OrgHierarchyPage = lazy(() => import("@/features/organization-management/pages/HierarchyOverviewPage"));
const OrgBusinessPage = lazy(() => import("@/features/organization-management/pages/BusinessPage"));
const OrgDepartmentPage = lazy(() => import("@/features/organization-management/pages/DepartmentPage"));
const OrgCategoryPage = lazy(() => import("@/features/organization-management/pages/CategoryPage"));

// Management sub-pages
const UsersPanel = lazy(() => import("@/pages/management/userspanel/UsersPanel"));
const RolesPanel = lazy(() => import("@/pages/management/RolesPanel"));

// Assessments
const AssessmentsDashboardPage = lazy(() => import("@/features/assessments/pages/AssessmentsDashboardPage"));
const QuizBuilderPage = lazy(() => import("@/features/assessments/pages/QuizBuilderPage"));
const TakeQuizPage = lazy(() => import("@/features/assessments/pages/TakeQuizPage"));
const QuizResultsPage = lazy(() => import("@/features/assessments/pages/QuizResultsPage"));
const QuizLeaderboardPage = lazy(() => import("@/features/assessments/pages/QuizLeaderboardPage"));
const ViolationDashboardPage = lazy(() => import("@/features/assessments/pages/ViolationDashboardPage"));
const QuizzesPanel = lazy(() => import("@/pages/management/QuizzesPanel"));
const AnnouncementsPage = lazy(() => import("@/features/announcements/pages/AnnouncementsPage"));
const EventsPage = lazy(() => import("@/features/events/pages/EventsPage"));
const MessagingPage = lazy(() => import("@/features/messaging/pages/MessagingPage"));
const EmployeeDirectoryPage = lazy(() => import("@/features/employee-directory/pages/EmployeeDirectoryPage"));
const TasksPage = lazy(() => import("@/features/task-management/pages/TasksPage"));
const TaskDetailsPage = lazy(() => import("@/features/task-management/pages/TaskDetailsPage"));
const MyTasksPage = lazy(() => import("@/features/task-management/pages/MyTasksPage"));

const LMS_ROLES = ['super_admin', 'admin', 'department_head', 'employee'];

function RedirectToSOP() {
  return <Navigate to="/sops" replace />;
}

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function wrap(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

function LMSProtectedWrapper(Component) {
  return (
    <ProtectedRoute allowedRoles={LMS_ROLES}>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </ProtectedRoute>
  );
}

function AdminProtectedWrapper(Component) {
  return (
    <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </ProtectedRoute>
  );
}

function SuperAdminProtectedWrapper(Component) {
  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </ProtectedRoute>
  );
}

function EmployeeProtectedWrapper(Component) {
  return (
    <ProtectedRoute allowedRoles={['employee']}>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </ProtectedRoute>
  );
}

function RoleBasedDashboard() {
  const { isEmployee, isAdmin, isDepartmentHead, isSuperAdmin, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return null;
  if (isEmployee) return <OnboardingGuard><EmployeeTrainingDashboard /></OnboardingGuard>;
  if (isDepartmentHead || isAdmin || isSuperAdmin) return <Dashboard />;
  return null;
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: wrap(Login),
  },
  {
    path: "s/:token",
    element: wrap(PublicSOPPage),
    handle: { title: "SOP Link" },
  },
  {
    path: "/",
    element: (
      <AuthRoute>
        <ErrorBoundary>
          <ToastProvider>
            <AppLayout />
          </ToastProvider>
        </ErrorBoundary>
      </AuthRoute>
    ),
    children: [
      { index: true, element: LMSProtectedWrapper(RoleBasedDashboard), handle: { title: "Dashboard" } },
      { path: "my-learning", element: EmployeeProtectedWrapper(() => <OnboardingGuard><EmployeeDashboard /></OnboardingGuard>), handle: { title: "My Learning" } },
      { path: "my-learning/catalog", element: EmployeeProtectedWrapper(() => <OnboardingGuard><EmployeeCourseCatalog /></OnboardingGuard>), handle: { title: "Course Catalog" } },
      { path: "my-learning/course/:id", element: EmployeeProtectedWrapper(() => <OnboardingGuard><EmployeeCourseView /></OnboardingGuard>), handle: { title: "Course" } },
      { path: "my-learning/sops/:id", element: EmployeeProtectedWrapper(() => <OnboardingGuard><EmployeeSOPView /></OnboardingGuard>), handle: { title: "SOP" } },
      { path: "profile", element: LMSProtectedWrapper(Profile), handle: { title: "Profile" } },
      { path: "profile/:userId", element: LMSProtectedWrapper(UserProfilePage), handle: { title: "Profile" } },
      { path: "users", element: <Navigate to="/settings/users" replace /> },
      { path: "course-library", element: <Navigate to="/courses/library" replace /> },
      { path: "settings", element: AdminProtectedWrapper(Settings), handle: { title: "Settings" } },
      { path: "settings/users", element: AdminProtectedWrapper(UsersPanel), handle: { title: "User Management" } },
      { path: "settings/roles", element: AdminProtectedWrapper(RolesPanel), handle: { title: "Roles & Permissions" } },
      { path: "audit-logs", element: AdminProtectedWrapper(AuditLogs), handle: { title: "Audit Logs" } },
      { path: "sops", element: AdminProtectedWrapper(SOPListPage), handle: { title: "SOP Library" } },
      { path: "courses", element: LMSProtectedWrapper(Courses), handle: { title: "Course Catalog" } },
      { path: "courses/:id", element: LMSProtectedWrapper(CourseDetailsPage), handle: { title: "Course Details" } },
      { path: "courses/:id/builder", element: LMSProtectedWrapper(CourseBuilderPage), handle: { title: "Course Builder" } },
      { path: "courses/view/:id", element: LMSProtectedWrapper(CourseLearnerView), handle: { title: "My Course" } },
      { path: "courses/view/:id/lesson/:lessonId", element: LMSProtectedWrapper(LessonPage), handle: { title: "Lesson" } },
      { path: "courses/library", element: LMSProtectedWrapper(CourseLibraryPage), handle: { title: "Course Library" } },
      { path: "courses/library/:id", element: LMSProtectedWrapper(CourseLibraryDetailsPage), handle: { title: "Course Details" } },
      { path: "sops/:id", element: AdminProtectedWrapper(SOPWorkspacePage), handle: { title: "SOP Workspace" } },
      { path: "sops/:id/versions/:versionId", element: AdminProtectedWrapper(SOPVersionPage), handle: { title: "SOP Version" } },
      { path: "trash", element: AdminProtectedWrapper(SOPListPage), handle: { title: "Trash" } },
      { path: "certificates", element: LMSProtectedWrapper(CertificateTemplatesPage), handle: { title: "Certificates" } },
       { path: "certificates/my-certificates/:userId?", element: LMSProtectedWrapper(MyCertificatesPage), handle: { title: "My Certificates" } },
      { path: "certificates/verify/:certificateNumber", element: LMSProtectedWrapper(VerifyCertificatePage), handle: { title: "Verify Certificate" } },

      // Organization Management routes
      { path: "admin/organization", element: AdminProtectedWrapper(OrgHierarchyPage), handle: { title: "SOP Management" } },
      { path: "admin/organization/hierarchy", element: AdminProtectedWrapper(OrgHierarchyPage), handle: { title: "Hierarchy Overview" } },
      { path: "admin/organization/businesses", element: AdminProtectedWrapper(OrgBusinessPage), handle: { title: "Businesses" } },
      { path: "admin/organization/departments", element: AdminProtectedWrapper(OrgDepartmentPage), handle: { title: "Departments" } },
      { path: "admin/organization/categories", element: AdminProtectedWrapper(OrgCategoryPage), handle: { title: "Categories" } },
      { path: "admin/organization/sop-management", element: AdminProtectedWrapper(RedirectToSOP), handle: { title: "SOP Management" } },
      { path: "assessments", element: LMSProtectedWrapper(AssessmentsDashboardPage), handle: { title: "My Quizzes" } },
      { path: "assessments/manage", element: AdminProtectedWrapper(QuizzesPanel), handle: { title: "Manage Quizzes" } },
      { path: "assessments/leaderboard", element: LMSProtectedWrapper(QuizLeaderboardPage), handle: { title: "Leaderboard" } },
      { path: "assessments/integrity", element: SuperAdminProtectedWrapper(ViolationDashboardPage), handle: { title: "Integrity Reports" } },
      { path: "assessments/quiz/:quizId/results", element: AdminProtectedWrapper(QuizResultsPage), handle: { title: "Quiz Results" } },
      { path: "assessments/quiz/:quizId/leaderboard", element: LMSProtectedWrapper(QuizLeaderboardPage), handle: { title: "Leaderboard" } },
      { path: "assessments/quiz/:quizId/take/:attemptId?", element: LMSProtectedWrapper(TakeQuizPage), handle: { title: "Take Quiz" } },
      { path: "assessments/quiz/:quizId", element: AdminProtectedWrapper(QuizBuilderPage), handle: { title: "Quiz Builder" } },
      { path: "announcements", element: LMSProtectedWrapper(AnnouncementsPage), handle: { title: "Announcements" } },
      { path: "events", element: LMSProtectedWrapper(EventsPage), handle: { title: "Events" } },
      { path: "messaging", element: LMSProtectedWrapper(MessagingPage), handle: { title: "Messaging" } },
      { path: "people", element: LMSProtectedWrapper(EmployeeDirectoryPage), handle: { title: "People" } },
      { path: "tasks", element: LMSProtectedWrapper(TasksPage), handle: { title: "Tasks & Projects" } },
      { path: "tasks/:id", element: LMSProtectedWrapper(TaskDetailsPage), handle: { title: "Task Details" } },
      { path: "tasks/my", element: LMSProtectedWrapper(MyTasksPage), handle: { title: "My Tasks" } },
    ],
  },
  {
    path: "/my-learning/onboarding",
    element: EmployeeProtectedWrapper(EmployeeOnboardingPage),
    handle: { title: "Onboarding" },
  },
]);

function AuthRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoot() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <SOPProvider>
      <CourseProvider>
        <CourseModalProvider>
          <EnrollmentProvider>
            <GradingProvider>
              <RouterProvider router={router} />
            </GradingProvider>
          </EnrollmentProvider>
        </CourseModalProvider>
      </CourseProvider>
    </SOPProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <MotionProvider>
          <AppRoot />
        </MotionProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
