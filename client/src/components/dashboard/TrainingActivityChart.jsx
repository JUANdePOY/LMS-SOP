import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { PieChart, Pie } from "recharts";
import { Info, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

function ChartCard({ title, icon: Icon, children, className }) {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={14} className="text-indigo-500 dark:text-indigo-400" strokeWidth={1.8} />}
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
      <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

const AREA_COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#eef2ff"];

export default function TrainingActivityChart({ data }) {
  const byArea = data?.by_area || [];
  const totalTrainings = byArea.reduce((a, d) => a + (d.trainings || 0), 0);

  const pieData = byArea.map((d, i) => ({
    name: d.area || "Unknown",
    value: d.trainings || 0,
    color: AREA_COLORS[i] ?? "#6366f1",
  }));

  return (
    <ChartCard title="Training Activity" icon={Dumbbell}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="relative h-[140px] w-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={42} outerRadius={62}
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
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] font-bold leading-none text-neutral-900 dark:text-neutral-50">
                {totalTrainings}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                total
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-400">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                    {d.value}
                  </span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-600 w-[34px] text-right">
                    {totalTrainings > 0 ? Math.round((d.value / totalTrainings) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
            {pieData.length === 0 && (
              <p className="text-xs text-neutral-400">No training data available</p>
            )}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
