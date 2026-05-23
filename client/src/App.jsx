import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { lazy, Suspense } from "react";

import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
const Dashboard         = lazy(() => import("@/pages/Dashboard"));
const Reservists        = lazy(() => import("@/pages/Reservists"));
const Trainings         = lazy(() => import("@/pages/Trainings"));
const Attendance        = lazy(() => import("@/pages/Attendance"));
const Analytics         = lazy(() => import("@/pages/Analytics"));
const Logistics         = lazy(() => import("@/pages/Logistics"));
const Reports           = lazy(() => import("@/pages/Reports"));
const Settings          = lazy(() => import("@/pages/Settings"));
const Alerts            = lazy(() => import("@/pages/Alerts"));
const AuditLogs         = lazy(() => import("@/pages/AuditLogs"));
const Login             = lazy(() => import("@/pages/Login"));

// Airbase pages
const AirbaseOverview   = lazy(() => import("@/pages/airbase/AirbaseOverview"));
const ManageArcens      = lazy(() => import("@/pages/airbase/ManageArcens"));
const ManageGroups      = lazy(() => import("@/pages/airbase/ManageGroups"));
const ManageSquadrons   = lazy(() => import("@/pages/airbase/ManageSquadrons"));

// RBAC role groups (match server)
const ADMIN_ROLES = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron'];
const SUPER_ADMIN_ROLES = ['admin'];

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

function ProtectedWrapper(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute>
        <Component />
      </ProtectedRoute>
    </Suspense>
  );
}

function AdminProtectedWrapper(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={ADMIN_ROLES}>
        <Component />
      </ProtectedRoute>
    </Suspense>
  );
}

function SuperAdminProtectedWrapper(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={SUPER_ADMIN_ROLES}>
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
      { index: true,           element: ProtectedWrapper(Dashboard)       },
      { path: "reservists",    element: AdminProtectedWrapper(Reservists)      },
      { path: "trainings",     element: ProtectedWrapper(Trainings)       },
      { path: "attendance",    element: ProtectedWrapper(Attendance)      },
      { path: "analytics",     element: ProtectedWrapper(Analytics)       },
      { path: "logistics",     element: AdminProtectedWrapper(Logistics)       },
      { path: "alerts",        element: ProtectedWrapper(Alerts)          },
      { path: "reports",     element: ProtectedWrapper(Reports)         },
      { path: "settings",    element: SuperAdminProtectedWrapper(Settings) },
      { path: "audit-logs",  element: SuperAdminProtectedWrapper(AuditLogs) },
      { path: "airbase",      element: AdminProtectedWrapper(AirbaseOverview) },
      { path: "airbase/arcens",   element: AdminProtectedWrapper(ManageArcens) },
      { path: "airbase/groups",   element: AdminProtectedWrapper(ManageGroups) },
      { path: "airbase/squadrons",element: AdminProtectedWrapper(ManageSquadrons) },

    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
