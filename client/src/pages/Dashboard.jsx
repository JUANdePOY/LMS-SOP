import { useState, useEffect } from "react";
import { getDashboard } from "@/services/api";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import KPIStatsGrid from "@/components/dashboard/KPIStatsGrid";
import ForceDistributionChart from "@/components/dashboard/ForceDistributionChart";
import TrainingActivityChart from "@/components/dashboard/TrainingActivityChart";
import AttendanceAnalytics from "@/components/dashboard/AttendanceAnalytics";
import ReadinessScoreChart from "@/components/dashboard/ReadinessScoreChart";
import ReservistProfileOverview from "@/components/dashboard/ReservistProfileOverview";
import { LowPerformingAreas, AlertsInsights } from "@/components/dashboard/AlertsPanels";
import { Loader } from "lucide-react";

const DEFAULT_FILTERS = {
  dateRange: "May 1 – May 31, 2025",
  group: "All Groups",
  area: "All Areas",
  status: "All Status",
};

export default function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDashboard();
      if (response.data.status === 'success') {
        setDashboardData(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Air Force Reservists Analytics Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            Real-time overview of reservist strength, training, attendance, and readiness.
          </p>
        </div>
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>

      <KPIStatsGrid data={dashboardData?.kpis} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ForceDistributionChart data={dashboardData?.force_distribution} />
        <TrainingActivityChart data={dashboardData?.trainings} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AttendanceAnalytics data={dashboardData?.attendance} />
        <ReadinessScoreChart data={dashboardData?.readiness} />
      </div>

      <ReservistProfileOverview data={dashboardData?.rank_distribution} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <LowPerformingAreas data={dashboardData?.low_performing} />
        <AlertsInsights data={dashboardData?.alerts} />
      </div>
    </div>
  );
}
