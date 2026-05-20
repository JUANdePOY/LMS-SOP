import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";

// Pages — lazy-loaded for performance
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Reservations = lazy(() => import("@/pages/Reservations"));
const Groups = lazy(() => import("@/pages/Groups"));
const Areas = lazy(() => import("@/pages/Areas"));
const Trainings = lazy(() => import("@/pages/Trainings"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Logistics = lazy(() => import("@/pages/Logistics"));
const Reports = lazy(() => import("@/pages/Reports"));
const Landing = lazy(() => import("@/pages/Landing"));

// Simple fallback while lazy chunks load
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/landing",
    element: (
      <Suspense fallback={<PageLoader />}>
        <Landing />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: "reservations",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Reservations />
          </Suspense>
        ),
      },
      {
        path: "groups",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Groups />
          </Suspense>
        ),
      },
      {
        path: "areas",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Areas />
          </Suspense>
        ),
      },
      {
        path: "trainings",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Trainings />
          </Suspense>
        ),
      },
      {
        path: "attendance",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Attendance />
          </Suspense>
        ),
      },
      {
        path: "analytics",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Analytics />
          </Suspense>
        ),
      },
      {
        path: "logistics",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Logistics />
          </Suspense>
        ),
      },
      {
        path: "reports",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Reports />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}