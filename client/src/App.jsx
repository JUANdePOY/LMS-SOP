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

const Dashboard     = lazy(() => import("@/pages/Dashboard"));
const Profile       = lazy(() => import("@/pages/Profile"));
const Login         = lazy(() => import("@/pages/Login"));
const Settings      = lazy(() => import("@/pages/Settings"));
const AuditLogs     = lazy(() => import("@/pages/AuditLogs"));
const Courses = lazy(() => import("@/pages/courses"));
const CourseDetailsPage = lazy(() => import("@/features/course_management/pages/CourseDetailsPage"));
const CourseLearnerView = lazy(() => import("@/features/course_management/pages/CourseLearnerView"));
const LessonPage = lazy(() => import("@/features/course_management/pages/LessonPage"));
const CourseBuilderPage = lazy(() => import("@/features/course_management/pages/CourseBuilderPage"));
const SOPListPage    = lazy(() => import("@/features/sop-management/pages/SOPListPage"));
const SOPWorkspacePage = lazy(() => import("@/features/sop-management/pages/SOPWorkspacePage"));
const SOPVersionPage = lazy(() => import("@/features/sop-management/pages/SOPVersionPage"));

// Organization Management
const OrgHierarchyPage = lazy(() => import("@/features/organization-management/pages/HierarchyOverviewPage"));
const OrgBusinessPage = lazy(() => import("@/features/organization-management/pages/BusinessPage"));
const OrgDepartmentPage = lazy(() => import("@/features/organization-management/pages/DepartmentPage"));
const OrgCategoryPage = lazy(() => import("@/features/organization-management/pages/CategoryPage"));

// Management sub-pages
const UsersPanel = lazy(() => import("@/pages/management/userspanel/UsersPanel"));
const RolesPanel = lazy(() => import("@/pages/management/RolesPanel"));

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

const router = createBrowserRouter([
  {
    path: "/login",
    element: wrap(Login),
  },
  {
    path: "/",
    element: (
      <ErrorBoundary>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </ErrorBoundary>
    ),
    children: [
      { index: true, element: LMSProtectedWrapper(Dashboard), handle: { title: "Dashboard" } },
      { path: "profile", element: LMSProtectedWrapper(Profile), handle: { title: "Profile" } },
      { path: "users", element: <Navigate to="/settings/users" replace /> },
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
      { path: "sops/:id", element: LMSProtectedWrapper(SOPWorkspacePage), handle: { title: "SOP Workspace" } },
      { path: "sops/:id/versions/:versionId", element: LMSProtectedWrapper(SOPVersionPage), handle: { title: "SOP Version" } },
      { path: "trash", element: LMSProtectedWrapper(SOPListPage), handle: { title: "Trash" } },

      // Organization Management routes
      { path: "admin/organization", element: LMSProtectedWrapper(OrgHierarchyPage), handle: { title: "SOP Management" } },
      { path: "admin/organization/hierarchy", element: LMSProtectedWrapper(OrgHierarchyPage), handle: { title: "Hierarchy Overview" } },
      { path: "admin/organization/businesses", element: LMSProtectedWrapper(OrgBusinessPage), handle: { title: "Businesses" } },
      { path: "admin/organization/departments", element: LMSProtectedWrapper(OrgDepartmentPage), handle: { title: "Departments" } },
      { path: "admin/organization/categories", element: LMSProtectedWrapper(OrgCategoryPage), handle: { title: "Categories" } },
      { path: "admin/organization/sop-management", element: <Navigate to="/sops" replace /> },
    ],
  },
]);

export default function App() {
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
