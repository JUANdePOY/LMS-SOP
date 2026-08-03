import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { lazy, Suspense } from "react";

import { ToastProvider } from "@/shared/components/Toast";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import ProtectedRoute from "@/shared/components/ProtectedRoute";
import { SOPProvider } from "@/features/sop-management/context/SOPContext";
import { CourseProvider } from "@/features/course_management/context/CourseContext";
import { CourseModalProvider } from "@/features/course_management/context/CourseModalContext";
import { EnrollmentProvider } from "@/features/course_management/context/EnrollmentContext";
import { GradingProvider } from "@/features/course_management/context/GradingContext";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard     = lazy(() => import("@/pages/Dashboard"));
const EmployeeDashboard = lazy(() => import("@/features/employee/pages/EmployeeDashboard"));
const EmployeeCourseCatalog = lazy(() => import("@/features/employee/pages/EmployeeCourseCatalog"));
const EmployeeCourseView = lazy(() => import("@/features/employee/pages/EmployeeCourseView"));
const Profile       = lazy(() => import("@/pages/Profile"));
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

const LMS_ROLES = ['super_admin', 'admin', 'department_head', 'employee'];

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
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={LMS_ROLES}>
        <Component />
      </ProtectedRoute>
    </Suspense>
  );
}

function SuperAdminProtectedWrapper(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={['super_admin']}>
        <Component />
      </ProtectedRoute>
    </Suspense>
  );
}

function EmployeeProtectedWrapper(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={['employee']}>
        <Component />
      </ProtectedRoute>
    </Suspense>
  );
}

function RoleBasedDashboard() {
  const { isEmployee, isAdmin, isDepartmentHead, isSuperAdmin, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return null;
  if (isEmployee) return <EmployeeDashboard />;
  if (isDepartmentHead || isAdmin || isSuperAdmin) return <Dashboard />;
  return null;
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: wrap(Login),
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
       { path: "my-learning", element: EmployeeProtectedWrapper(EmployeeDashboard), handle: { title: "My Learning" } },
       { path: "my-learning/catalog", element: EmployeeProtectedWrapper(EmployeeCourseCatalog), handle: { title: "Course Catalog" } },
       { path: "my-learning/course/:id", element: EmployeeProtectedWrapper(EmployeeCourseView), handle: { title: "Course" } },
       { path: "profile", element: LMSProtectedWrapper(Profile), handle: { title: "Profile" } },
      { path: "users", element: <Navigate to="/settings/users" replace /> },
      { path: "course-library", element: <Navigate to="/courses/library" replace /> },
      { path: "settings", element: SuperAdminProtectedWrapper(Settings), handle: { title: "Settings" } },
      { path: "settings/users", element: LMSProtectedWrapper(UsersPanel), handle: { title: "User Management" } },
      { path: "settings/roles", element: LMSProtectedWrapper(RolesPanel), handle: { title: "Roles & Permissions" } },
      { path: "audit-logs", element: SuperAdminProtectedWrapper(AuditLogs), handle: { title: "Audit Logs" } },
      { path: "sops", element: LMSProtectedWrapper(SOPListPage), handle: { title: "SOP Library" } },
      { path: "courses", element: LMSProtectedWrapper(Courses), handle: { title: "Course Catalog" } },
      { path: "courses/:id", element: LMSProtectedWrapper(CourseDetailsPage), handle: { title: "Course Details" } },
      { path: "courses/:id/builder", element: LMSProtectedWrapper(CourseBuilderPage), handle: { title: "Course Builder" } },
      { path: "courses/view/:id", element: LMSProtectedWrapper(CourseLearnerView), handle: { title: "My Course" } },
      { path: "courses/view/:id/lesson/:lessonId", element: LMSProtectedWrapper(LessonPage), handle: { title: "Lesson" } },
      { path: "courses/library", element: LMSProtectedWrapper(CourseLibraryPage), handle: { title: "Course Library" } },
      { path: "courses/library/:id", element: LMSProtectedWrapper(CourseLibraryDetailsPage), handle: { title: "Course Details" } },
      { path: "sops/:id", element: LMSProtectedWrapper(SOPWorkspacePage), handle: { title: "SOP Workspace" } },
      { path: "sops/:id/versions/:versionId", element: LMSProtectedWrapper(SOPVersionPage), handle: { title: "SOP Version" } },
      { path: "trash", element: LMSProtectedWrapper(SOPListPage), handle: { title: "Trash" } },
      { path: "certificates", element: LMSProtectedWrapper(CertificateTemplatesPage), handle: { title: "Certificates" } },
      { path: "certificates/my-certificates/:userId", element: LMSProtectedWrapper(MyCertificatesPage), handle: { title: "My Certificates" } },
      { path: "certificates/verify/:certificateNumber", element: LMSProtectedWrapper(VerifyCertificatePage), handle: { title: "Verify Certificate" } },

      // Organization Management routes
      { path: "admin/organization", element: LMSProtectedWrapper(OrgHierarchyPage), handle: { title: "SOP Management" } },
      { path: "admin/organization/hierarchy", element: LMSProtectedWrapper(OrgHierarchyPage), handle: { title: "Hierarchy Overview" } },
      { path: "admin/organization/businesses", element: LMSProtectedWrapper(OrgBusinessPage), handle: { title: "Businesses" } },
      { path: "admin/organization/departments", element: LMSProtectedWrapper(OrgDepartmentPage), handle: { title: "Departments" } },
      { path: "admin/organization/categories", element: LMSProtectedWrapper(OrgCategoryPage), handle: { title: "Categories" } },
      { path: "admin/organization/sop-management", element: <Navigate to="/sops" replace /> },
      { path: "assessments", element: LMSProtectedWrapper(AssessmentsDashboardPage), handle: { title: "My Quizzes" } },
      { path: "assessments/manage", element: LMSProtectedWrapper(QuizzesPanel), handle: { title: "Manage Quizzes" } },
      { path: "assessments/leaderboard", element: LMSProtectedWrapper(QuizLeaderboardPage), handle: { title: "Leaderboard" } },
      { path: "assessments/integrity", element: LMSProtectedWrapper(ViolationDashboardPage), handle: { title: "Integrity Reports" } },
      { path: "assessments/quiz/:quizId/results", element: LMSProtectedWrapper(QuizResultsPage), handle: { title: "Quiz Results" } },
      { path: "assessments/quiz/:quizId/leaderboard", element: LMSProtectedWrapper(QuizLeaderboardPage), handle: { title: "Leaderboard" } },
      { path: "assessments/quiz/:quizId/take/:attemptId?", element: LMSProtectedWrapper(TakeQuizPage), handle: { title: "Take Quiz" } },
      { path: "assessments/quiz/:quizId", element: LMSProtectedWrapper(QuizBuilderPage), handle: { title: "Quiz Builder" } },
    ],
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
        <AppRoot />
      </ToastProvider>
    </ErrorBoundary>
  );
}
