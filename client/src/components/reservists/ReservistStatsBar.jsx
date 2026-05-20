import { cn } from "@/lib/utils";
import { Users, UserCheck, UserX, AlertCircle } from "lucide-react";

export default function ReservistStatsBar({ data }) {
  const total    = data.length;
  const active   = data.filter((r) => r.status === "active").length;
  const inactive = data.filter((r) => r.status === "inactive").length;
  const standby  = data.filter((r) => r.reserveStatus === "Standby Reserve").length;
  const retired  = data.filter((r) => r.reserveStatus === "Retired").length;

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
      label: "Standby Reserve",
      value: standby.toLocaleString(),
      icon: AlertCircle,
      color: "text-amber-600 dark:text-amber-400",
      bg:    "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
    },
    {
      label: "Retired",
      value: retired.toLocaleString(),
      icon: Users,
      color: "text-neutral-500 dark:text-neutral-400",
      bg:    "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700",
    },
    {
      label: "Ready Reserve",
      value: (total - standby - retired).toLocaleString(),
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg:    "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
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
