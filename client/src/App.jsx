import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { lazy, Suspense } from "react";

// ── Pages ─────────────────────────────────────────────────────
const Dashboard  = lazy(() => import("@/pages/Dashboard"));
const Reservists = lazy(() => import("@/pages/Reservists")); // ← renamed
const Trainings  = lazy(() => import("@/pages/Trainings"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const Analytics  = lazy(() => import("@/pages/Analytics"));
const Logistics  = lazy(() => import("@/pages/Logistics"));
const Reports    = lazy(() => import("@/pages/Reports"));

// ── Airbase pages ──────────────────────────────────────────────
const AirbaseOverview = lazy(() => import("@/pages/airbase/AirbaseOverview"));
const ManageArcens    = lazy(() => import("@/pages/airbase/ManageArcens"));
const ManageGroups    = lazy(() => import("@/pages/airbase/ManageGroups"));
const ManageSquadrons = lazy(() => import("@/pages/airbase/ManageSquadrons"));

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

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true,           element: wrap(Dashboard)       },
      { path: "reservists",    element: wrap(Reservists)      }, // ← fixed path
      { path: "trainings",     element: wrap(Trainings)       },
      { path: "attendance",    element: wrap(Attendance)      },
      { path: "analytics",     element: wrap(Analytics)       },
      { path: "logistics",     element: wrap(Logistics)       },
      { path: "reports",       element: wrap(Reports)         },

      // ── Airbase nested routes ────────────────────────────────
      { path: "airbase",           element: wrap(AirbaseOverview) },
      { path: "airbase/arcens",    element: wrap(ManageArcens)    },
      { path: "airbase/groups",    element: wrap(ManageGroups)    },
      { path: "airbase/squadrons", element: wrap(ManageSquadrons) },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}