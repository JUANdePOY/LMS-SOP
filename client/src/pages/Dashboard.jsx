import { useState } from "react";
import DashboardFilters     from "@/components/dashboard/DashboardFilters";
import KPIStatsGrid         from "@/components/dashboard/KPIStatsGrid";
import ForceDistributionChart  from "@/components/dashboard/ForceDistributionChart";
import TrainingActivityChart   from "@/components/dashboard/TrainingActivityChart";
import AttendanceAnalytics     from "@/components/dashboard/AttendanceAnalytics";
import ReadinessScoreChart     from "@/components/dashboard/ReadinessScoreChart";
import ReservistProfileOverview from "@/components/dashboard/ReservistProfileOverview";
import { LowPerformingAreas, AlertsInsights } from "@/components/dashboard/AlertsPanels";

const DEFAULT_FILTERS = {
  dateRange: "May 1 – May 31, 2025",
  group:     "All Groups",
  area:      "All Areas",
  status:    "All Status",
};

/**
 * Dashboard page
 * Owns filter state; passes it down to charts (wire up to API later).
 */
export default function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* ── Page header + filters ─────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Air Force Reservists Analytics Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            Real-time overview of reservist strength, training, attendance, and readiness.
          </p>
        </div>

        {/* Smart filter bar */}
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>

      {/* ── KPI Stats ─────────────────────────────────────── */}
      <KPIStatsGrid />

      {/* ── Row 2: Force Distribution + Training Activity ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ForceDistributionChart />
        <TrainingActivityChart />
      </div>

      {/* ── Row 3: Attendance + Readiness ─────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AttendanceAnalytics />
        <ReadinessScoreChart />
      </div>

      {/* ── Row 4: Reservist Profile (full width) ──────────── */}
      <ReservistProfileOverview />

      {/* ── Row 5: Low Performing + Alerts ────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <LowPerformingAreas />
        <AlertsInsights />
      </div>

    </div>
  );
}
