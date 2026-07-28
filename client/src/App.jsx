import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { lazy, Suspense } from "react";

import { ToastProvider } from "@/shared/components/Toast";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import ProtectedRoute from "@/shared/components/ProtectedRoute";
import { SOPModalProvider } from "@/features/sop_management/context/SOPModalContext";
import { SOPPermissionProvider } from "@/features/sop_management/context/SOPPermissionContext";
import { SOPProvider } from "@/features/sop_management/context/SOPContext";

const Dashboard     = lazy(() => import("@/pages/Dashboard"));
const Profile       = lazy(() => import("@/pages/Profile"));
const Login         = lazy(() => import("@/pages/Login"));
const Users         = lazy(() => import("@/pages/Users"));
const Settings      = lazy(() => import("@/pages/Settings"));
const AuditLogs     = lazy(() => import("@/pages/AuditLogs"));
const SOPListPage    = lazy(() => import("@/features/sop_management/pages/SOPListPage"));
const SOPDetailsPage = lazy(() => import("@/features/sop_management/pages/SOPDetailsPage"));

// Organization Management
const OrgHierarchyPage = lazy(() => import("@/features/organization-management/pages/HierarchyOverviewPage"));
const OrgBusinessPage = lazy(() => import("@/features/organization-management/pages/BusinessPage"));
const OrgDepartmentPage = lazy(() => import("@/features/organization-management/pages/DepartmentPage"));
const OrgCategoryPage = lazy(() => import("@/features/organization-management/pages/CategoryPage"));

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
      { path: "users", element: LMSProtectedWrapper(Users), handle: { title: "Administration" } },
      { path: "settings", element: SuperAdminProtectedWrapper(Settings), handle: { title: "Settings" } },
      { path: "audit-logs", element: SuperAdminProtectedWrapper(AuditLogs), handle: { title: "Audit Logs" } },
      { path: "sops", element: LMSProtectedWrapper(SOPListPage), handle: { title: "SOP Library" } },
      { path: "sops/:id", element: LMSProtectedWrapper(SOPDetailsPage), handle: { title: "SOP Details" } },

      // Organization Management routes
      { path: "admin/organization", element: LMSProtectedWrapper(OrgHierarchyPage), handle: { title: "Organization Hierarchy" } },
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
      <SOPModalProvider>
        <SOPPermissionProvider>
          <RouterProvider router={router} />
        </SOPPermissionProvider>
      </SOPModalProvider>
    </SOPProvider>
  );
}