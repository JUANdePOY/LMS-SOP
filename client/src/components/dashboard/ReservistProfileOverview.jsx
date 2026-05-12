import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { PieChart, Pie } from "recharts";
import { Info, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { professionData, rankData } from "@/data/dashboardData";

function ChartCard({ title, icon: Icon, children, className }) {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <Icon size={14} className="text-blue-500 dark:text-blue-400" strokeWidth={1.8} />
        )}
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
          {title}
        </h3>
        <Info size={13} className="text-neutral-400 dark:text-neutral-600 ml-auto shrink-0" />
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
        {label || payload[0]?.name}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} style={{ color: p.fill ?? p.color }}>
          {p.name}: <span className="font-bold">{p.value}{p.dataKey === "pct" ? "%" : ""}</span>
        </p>
      ))}
    </div>
  );
}

const PROFESSION_COLORS = [
  "#6366f1", "#818cf8", "#a5b4fc",
  "#10b981", "#34d399", "#6ee7b7",
];

const RANK_COLORS = [
  "#6366f1", "#818cf8", "#a5b4fc",
  "#c7d2fe", "#e0e7ff", "#eef2ff",
];

/**
 * ProfessionBreakdown
 * Donut chart + legend for civilian profession mix.
 */
function ProfessionBreakdown() {
  const pieData = professionData.map((d, i) => ({
    name:  d.name,
    value: d.pct,
    color: PROFESSION_COLORS[i] ?? "#6366f1",
  }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
        Profession / Specialization Mix
      </p>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative h-[130px] w-[130px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={36} outerRadius={58}
                dataKey="value"
                paddingAngle={2}
                strokeWidth={0}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-600">Mix</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-1 flex-col gap-1.5">
          {pieData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="flex-1 text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
                {d.name}
              </span>
              <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 pl-2">
                {d.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * RankDistribution
 * Vertical bar chart of reservists by rank.
 */
function RankDistribution() {
  const total = rankData.reduce((a, d) => a + d.count, 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
        Rank Distribution
      </p>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          data={rankData}
          margin={{ top: 0, right: 0, left: -24, bottom: 0 }}
          barSize={28}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-neutral-100 dark:text-neutral-800"
            vertical={false}
          />
          <XAxis
            dataKey="rank"
            tick={{ fontSize: 9, fill: "currentColor" }}
            className="text-neutral-400"
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-neutral-400"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
          <Bar dataKey="count" name="Reservists" radius={[4, 4, 0, 0]}>
            {rankData.map((_, i) => (
              <Cell key={i} fill={RANK_COLORS[i] ?? "#e0e7ff"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary row */}
      <div className="flex flex-wrap gap-2 pt-1">
        {rankData.map((d, i) => (
          <div key={d.rank} className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
            "border-neutral-100 dark:border-neutral-800",
            "bg-neutral-50 dark:bg-neutral-950"
          )}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: RANK_COLORS[i] ?? "#e0e7ff" }} />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-500">{d.rank}</span>
            <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">{d.count}</span>
            <span className="text-[9px] text-neutral-400 dark:text-neutral-600">
              {Math.round((d.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ReservistProfileOverview
 * Full-width card with profession mix (left) + rank distribution (right).
 */
export default function ReservistProfileOverview() {
  return (
    <ChartCard title="Reservist Profile Overview" icon={Users}>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:divide-x xl:divide-neutral-100 xl:dark:divide-neutral-800">
        <ProfessionBreakdown />
        <div className="xl:pl-8">
          <RankDistribution />
        </div>
      </div>
    </ChartCard>
  );
}