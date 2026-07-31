import { cn } from "@/lib/utils";

const COLOR_CLASSES = {
  blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300",
  emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300",
  purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300",
  amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300",
  rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300",
  sky: "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300",
};

export default function StatCard({ title, value, icon: Icon, color = "blue", subtitle = null }) {
  return (
    <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", COLOR_CLASSES[color])}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{title}</p>
          {subtitle && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
