import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { lazy, Suspense } from "react";

import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";

const Dashboard     = lazy(() => import("@/pages/Dashboard"));
const Profile       = lazy(() => import("@/pages/Profile"));
const Login         = lazy(() => import("@/pages/Login"));
const Users         = lazy(() => import("@/pages/Users"));
const Settings      = lazy(() => import("@/pages/Settings"));
const AuditLogs     = lazy(() => import("@/pages/AuditLogs"));

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
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}