import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from "recharts";
import { PieChart, Pie } from "recharts";
import { Info, ShieldCheck } from "lucide-react";
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
          <Icon size={14} className="text-indigo-500 dark:text-indigo-400" strokeWidth={1.8} />
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
      <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{label || payload[0]?.name}</p>
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} style={{ color: p.fill ?? p.color }}>
          {p.name}: <span className="font-bold">{p.value}{typeof p.value === "number" && p.value < 100 ? "%" : ""}</span>
        </p>
      ))}
    </div>
  );
}

function readinessColor(score) {
  if (score >= 80) return { bar: "#10b981", text: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 70) return { bar: "#6366f1", text: "text-indigo-600 dark:text-indigo-400" };
  if (score >= 65) return { bar: "#f59e0b", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "#ef4444", text: "text-red-600 dark:text-red-400" };
}

export default function ReadinessScoreChart({ data }) {
  const byArsen = data?.by_arsen || [];
  const composition = data?.composition || [];

  const avg = byArsen.length > 0
    ? (byArsen.reduce((a, d) => a + (d.avg_readiness_score || 0), 0) / byArsen.length).toFixed(1)
    : "0.0";

  return (
    <ChartCard title="Readiness Score" icon={ShieldCheck}>
      <div className="flex flex-col gap-6">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
            {avg}%
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-600 mb-0.5">
            average readiness across all areas
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {byArsen.map((row, i) => {
            const score = row.avg_readiness_score || 0;
            const { bar, text } = readinessColor(score);
            return (
              <div key={row.arsen_id || i} className="flex items-center gap-3">
                <span className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                  i === 0
                    ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500"
                )}>
                  {i + 1}
                </span>
                <span className="w-[72px] shrink-0 text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">
                  {row.arsen_name || "Unknown"}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(score, 100)}%`, background: bar }}
                  />
                </div>
                <span className={cn("w-[42px] shrink-0 text-right text-[11px] font-bold", text)}>
                  {score}%
                </span>
              </div>
            );
          })}
          {byArsen.length === 0 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-600 text-center py-4">No readiness data available</p>
          )}
        </div>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        <div>
          <p className="mb-3 text-[11px] font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
            Score Composition
          </p>
          <div className="flex items-center gap-4">
            <div className="h-[90px] w-[90px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={composition}
                    cx="50%" cy="50%"
                    innerRadius={26} outerRadius={40}
                    dataKey="value"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {composition.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5">
              {composition.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-400">{d.name}</span>
                  <span className="ml-auto text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 pl-2">
                    {d.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
