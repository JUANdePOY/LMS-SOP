import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { PieChart, Pie } from "recharts";
import { Info, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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

const RANK_COLORS = [
  "#6366f1", "#818cf8", "#a5b4fc",
  "#c7d2fe", "#e0e7ff", "#eef2ff",
];

function RankDistribution({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
          Rank Distribution
        </p>
        <div className="flex h-32 items-center justify-center text-xs text-neutral-400">No data available</div>
      </div>
    );
  }

  const total = data.reduce((a, d) => a + (d.count || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
        Rank Distribution
      </p>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" vertical={false} />
          <XAxis dataKey="rank" tick={{ fontSize: 9, fill: "currentColor" }} className="text-neutral-400" tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: "currentColor" }} className="text-neutral-400" tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
          <Bar dataKey="count" name="Reservists" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={RANK_COLORS[i] ?? "#e0e7ff"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-2 pt-1">
        {data.map((d, i) => (
          <div key={d.rank} className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
            "border-neutral-100 dark:border-neutral-800",
            "bg-neutral-50 dark:bg-neutral-950"
          )}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: RANK_COLORS[i] ?? "#e0e7ff" }} />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-500">{d.rank}</span>
            <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">{d.count}</span>
            <span className="text-[9px] text-neutral-400 dark:text-neutral-600">
              {total > 0 ? Math.round((d.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReservistProfileOverview({ data }) {
  return (
    <ChartCard title="Reservist Profile Overview" icon={Users}>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <RankDistribution data={data} />
      </div>
    </ChartCard>
  );
}
