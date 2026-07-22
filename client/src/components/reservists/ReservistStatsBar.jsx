import { cn } from "@/lib/utils";
import { Users, UserCheck, ShieldCheck, Zap, UserPlus, Award } from "lucide-react";

export default function ReservistStatsBar({ stats = {} }) {
  const {
    total = 0,
    active = 0,
    bcmt = 0,
    adt = 0,
    vadt = 0,
    rotc = 0,
  } = stats;

  const cards = [
    {
      label: "Total Reservists",
      value: total,
      icon:  Users,
      color: "text-indigo-600 dark:text-indigo-400",
      bg:    "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
    },
    {
      label: "Active",
      value: active,
      icon:  UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg:    "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    },
    {
      label: "BCMT",
      value: bcmt,
      icon:  ShieldCheck,
      color: "text-blue-600 dark:text-blue-400",
      bg:    "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
    },
    {
      label: "ADT",
      value: adt,
      icon:  Zap,
      color: "text-amber-600 dark:text-amber-400",
      bg:    "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
    },
    {
      label: "VADT",
      value: vadt,
      icon:  UserPlus,
      color: "text-purple-600 dark:text-purple-400",
      bg:    "bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20",
    },
    {
      label: "ROTC",
      value: rotc,
      icon:  Award,
      color: "text-rose-600 dark:text-rose-400",
      bg:    "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((s) => {
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
                {Number(s.value).toLocaleString()}
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