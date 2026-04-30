import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { Info, ClipboardCheck, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { attendanceTimelineData, attendanceByAreaData } from "@/data/dashboardData";

/** Shared card shell */
function ChartCard({ title, icon: Icon, badge, children, className }) {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <Icon size={14} className="text-emerald-500 dark:text-emerald-400" strokeWidth={1.8} />
        )}
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
          {title}
        </h3>
        {badge && (
          <span className={cn(
            "ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            badge.type === "down"
              ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          )}>
            {badge.type === "down"
              ? <TrendingDown size={9} className="inline mr-0.5" />
              : <TrendingUp   size={9} className="inline mr-0.5" />
            }
            {badge.label}
          </span>
        )}
        <Info size={13} className="text-neutral-400 dark:text-neutral-600 ml-auto shrink-0" />
      </div>
      {children}
    </div>
  );
}

/** Custom tooltip */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill ?? p.stroke }}>
          {p.name}: <span className="font-bold">{p.value}%</span>
        </p>
      ))}
    </div>
  );
}

/**
 * AttendanceAnalytics
 * Timeline area chart + per-area bar breakdown.
 */
export default function AttendanceAnalytics() {
  const latest = attendanceTimelineData.at(-1)?.rate ?? 0;
  const prev   = attendanceTimelineData.at(-2)?.rate ?? 0;
  const delta  = (latest - prev).toFixed(1);
  const isDown = delta < 0;

  return (
    <ChartCard
      title="Attendance Analytics"
      icon={ClipboardCheck}
      badge={{ type: isDown ? "down" : "up", label: `${isDown ? "" : "+"}${delta}% vs prev` }}
    >
      <div className="flex flex-col gap-6">

        {/* ── Headline number ───────────────────────────────── */}
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
            {latest}%
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-600 mb-0.5">
            avg attendance rate · latest week
          </span>
        </div>

        {/* ── Timeline area chart ───────────────────────────── */}
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart
            data={attendanceTimelineData}
            margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
          >
            <defs>
              <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-neutral-100 dark:text-neutral-800"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-neutral-400"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[70, 100]}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-neutral-400"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="rate"
              name="Attendance"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#attendanceGrad)"
              dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#10b981" }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* ── Divider ──────────────────────────────────────── */}
        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* ── Per-area breakdown ────────────────────────────── */}
        <div>
          <p className="mb-3 text-[11px] font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
            Attendance Rate by Area
          </p>
          <div className="flex flex-col gap-2">
            {attendanceByAreaData.map((row) => {
              const isLow = row.rate < 70;
              const isMid = row.rate >= 70 && row.rate < 85;
              const color = isLow ? "bg-red-400" : isMid ? "bg-amber-400" : "bg-emerald-400";
              const textColor = isLow
                ? "text-red-600 dark:text-red-400"
                : isMid
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400";

              return (
                <div key={row.area} className="flex items-center gap-3">
                  <span className="w-[72px] shrink-0 text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">
                    {row.area}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", color)}
                      style={{ width: `${row.rate}%` }}
                    />
                  </div>
                  <span className={cn("w-[42px] shrink-0 text-right text-[11px] font-semibold", textColor)}>
                    {row.rate}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </ChartCard>
  );
}