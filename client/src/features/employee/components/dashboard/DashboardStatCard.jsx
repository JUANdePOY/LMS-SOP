import { cn } from "@/lib/utils";

const ICON_BG = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
};

const TREND_COLORS = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-500 dark:text-neutral-400",
};

export default function DashboardStatCard({
  label,
  value,
  icon: Icon,
  color = "blue",
  caption = null,
  progress = null,
  link = null,
  trend = null,
  subtitle = null,
}) {
  const trendColor = trend === 'up' ? TREND_COLORS.up : trend === 'down' ? TREND_COLORS.down : TREND_COLORS.neutral;
  const TrendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : null;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-neutral-800/50" />
      
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110",
              ICON_BG[color]
            )}>
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 truncate">{label}</p>
              {subtitle && (
                <p className="text-[10px] text-slate-400 dark:text-neutral-500 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          
          {trend && TrendIcon && (
            <span className={cn("flex items-center gap-0.5 text-xs font-semibold", trendColor)}>
              <span className="text-sm leading-none">{TrendIcon}</span>
              {trend === 'up' ? '+12%' : trend === 'down' ? '-5%' : ''}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight tracking-tight">{value}</p>
        </div>

        {caption && !link && (
          <p className="mt-1.5 text-xs text-slate-400 dark:text-neutral-500">{caption}</p>
        )}

        {link && (
          <a href={link.href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400">
            {link.label}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        )}

        {progress !== null && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-out dark:from-emerald-600 dark:to-emerald-500" 
              style={{ width: `${Math.min(progress, 100)}%` }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
