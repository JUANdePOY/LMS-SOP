import { cn } from "@/lib/utils";
import { Users, UserCheck, UserX, TrendingUp, Award } from "lucide-react";

/**
 * ReservistStatsBar
 * Summary KPI cards computed from current filtered/full data.
 */
export default function ReservistStatsBar({ data }) {
  const total    = data.length;
  const active   = data.filter((r) => r.status === "active").length;
  const inactive = data.filter((r) => r.status === "inactive").length;
  const standby  = data.filter((r) => r.status === "standby").length;

  const avgReadiness  = total
    ? Math.round(data.reduce((a, r) => a + (r.readinessScore || 0), 0)  / total)
    : 0;
  const avgAttendance = total
    ? Math.round(data.reduce((a, r) => a + (r.attendanceRate || 0), 0) / total)
    : 0;

  const stats = [
    {
      label: "Total Reservists",
      value: total.toLocaleString(),
      icon: Users,
      color: "text-indigo-600 dark:text-indigo-400",
      bg:    "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
    },
    {
      label: "Active",
      value: active.toLocaleString(),
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg:    "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    },
    {
      label: "Inactive",
      value: inactive.toLocaleString(),
      icon: UserX,
      color: "text-red-500 dark:text-red-400",
      bg:    "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20",
    },
    {
      label: "Standby",
      value: standby.toLocaleString(),
      icon: Users,
      color: "text-amber-600 dark:text-amber-400",
      bg:    "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
    },
    {
      label: "Avg Readiness",
      value: `${avgReadiness}%`,
      icon: TrendingUp,
      color: avgReadiness >= 80 ? "text-emerald-600 dark:text-emerald-400"
           : avgReadiness >= 60 ? "text-amber-600 dark:text-amber-400"
           : "text-red-500 dark:text-red-400",
      bg: "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800",
    },
    {
      label: "Avg Attendance",
      value: `${avgAttendance}%`,
      icon: Award,
      color: avgAttendance >= 80 ? "text-emerald-600 dark:text-emerald-400"
           : avgAttendance >= 60 ? "text-amber-600 dark:text-amber-400"
           : "text-red-500 dark:text-red-400",
      bg: "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className={cn(
            "flex flex-col gap-2.5 rounded-xl border p-4",
            "transition-all duration-150",
            s.bg
          )}>
            <span className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border",
              s.bg, s.color
            )}>
              <Icon size={15} strokeWidth={1.8} />
            </span>
            <div>
              <p className={cn("text-2xl font-black leading-none tracking-tight", s.color)}>
                {s.value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-500 leading-tight">
                {s.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
