import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { professionData, rankData } from "@/data/dashboardData";

const COLORS = ["#6366f1","#10b981","#f59e0b","#3b82f6","#ec4899","#94a3b8"];

/**
 * ReservistProfileOverview
 * Profession donut + rank breakdown table.
 */
export default function ReservistProfileOverview() {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
          Reservist Profile Overview
        </h3>
        <Info size={13} className="text-neutral-400 dark:text-neutral-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profession donut */}
        <div>
          <p className="mb-2 text-xs text-neutral-500 font-medium">Profession / Occupation Distribution</p>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={professionData} dataKey="pct" cx="50%" cy="50%" innerRadius={36} outerRadius={56} strokeWidth={0}>
                    {professionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e5e5", background: "white" }}
                    formatter={(v, n) => [`${v}%`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold text-neutral-900 dark:text-neutral-50">2,846</span>
                <span className="text-[9px] text-neutral-400">Total</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {professionData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                  <span className="truncate max-w-[120px]">{d.name}</span>
                  <span className="ml-auto font-semibold text-neutral-700 dark:text-neutral-300">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rank table */}
        <div>
          <p className="mb-2 text-xs text-neutral-500 font-medium">Reservists by Rank</p>
          <div className="flex flex-col gap-2">
            {rankData.map((row) => (
              <div key={row.rank} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-neutral-600 dark:text-neutral-400">{row.rank}</span>
                <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(row.count / 1125) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {row.count.toLocaleString()}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              <span>Total</span>
              <span>2,846</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
