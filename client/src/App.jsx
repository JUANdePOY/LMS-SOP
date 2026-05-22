import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
const Dashboard         = lazy(() => import("@/pages/Dashboard"));
const Landing           = lazy(() => import("@/pages/Landing"));
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

const router = createBrowserRouter([
  {
    path: "/login",
    element: wrap(Login),
  },
  {
    path: "/landing",
    element: wrap(Landing),
  },
  {
    path: "/Landing",
    element: wrap(Landing),
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
      { path: "reservists",    element: ProtectedWrapper(Reservists)      },
      { path: "trainings",     element: ProtectedWrapper(Trainings)       },
      { path: "attendance",    element: ProtectedWrapper(Attendance)      },
      { path: "analytics",     element: ProtectedWrapper(Analytics)       },
      { path: "logistics",     element: ProtectedWrapper(Logistics)       },
      { path: "alerts",        element: ProtectedWrapper(Alerts)          },
      { path: "reports",     element: ProtectedWrapper(Reports)         },
      { path: "settings",    element: <ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute> },
      { path: "audit-logs",  element: <ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute> },
      { path: "airbase",      element: ProtectedWrapper(AirbaseOverview) },
      { path: "airbase/arcens",   element: ProtectedWrapper(ManageArcens) },
      { path: "airbase/groups",   element: ProtectedWrapper(ManageGroups) },
      { path: "airbase/squadrons",element: ProtectedWrapper(ManageSquadrons) },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
