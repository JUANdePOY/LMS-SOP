import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { readinessRankingData, readinessCompositionData } from "@/data/dashboardData";

function RankRow({ rank, area, score }) {
  const color = score < 65 ? "text-red-500" : score < 80 ? "text-amber-500" : "text-emerald-500";
  const barColor = score < 65 ? "bg-red-400" : score < 80 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-4 shrink-0 text-center text-xs font-bold text-neutral-400 dark:text-neutral-600">
        {rank}
      </span>
      <span className="w-24 shrink-0 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {area}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("w-12 text-right text-xs font-semibold", color)}>
        {score}%
      </span>
    </div>
  );
}

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {value}%
    </text>
  );
}

/**
 * ReadinessScoreChart
 * Ranked list of areas + donut showing score composition.
 */
export default function ReadinessScoreChart() {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
          Readiness Score by Area
        </h3>
        <Info size={13} className="text-neutral-400 dark:text-neutral-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ranking list */}
        <div>
          <p className="mb-2 text-xs text-neutral-500 font-medium">Readiness Score Ranking</p>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {readinessRankingData.map((row, i) => (
              <RankRow key={row.area} rank={i + 1} area={row.area} score={row.score} />
            ))}
          </div>
        </div>

        {/* Donut */}
        <div className="flex flex-col items-center">
          <p className="mb-2 text-xs text-neutral-500 font-medium self-start">
            Readiness Score Composition (Average)
          </p>
          <div className="relative">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={readinessCompositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  dataKey="value"
                  labelLine={false}
                  label={CustomLabel}
                >
                  {readinessCompositionData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5", background: "white" }}
                  formatter={(v, n) => [`${v}%`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-neutral-900 dark:text-neutral-50">78.4%</span>
              <span className="text-[10px] text-neutral-400">Overall Avg</span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-col gap-1.5 self-start">
            {readinessCompositionData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span>{d.name}</span>
                <span className="ml-auto font-semibold text-neutral-700 dark:text-neutral-300">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
