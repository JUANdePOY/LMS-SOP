import { cn } from "@/lib/utils";

const ICON_BG = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
};

export default function DashboardStatCard({
  label,
  value,
  icon: Icon,
  color = "blue",
  caption = null,
  progress = null,
  link = null,
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", ICON_BG[color])}>
            <Icon size={20} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-neutral-400 truncate">{label}</p>
        </div>
      </div>

      <p className="mt-3 text-3xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{value}</p>

      {caption && !link && (
        <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500">{caption}</p>
      )}

      {link && (
        <a href={link.href} className="mt-1 inline-block text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
          {link.label}
        </a>
      )}

      {progress !== null && (
        <div className="mt-4 h-1.5 w-full rounded-full bg-slate-100 dark:bg-neutral-800">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}
