import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingActivityData, topGroupsData } from "@/data/dashboardData";

const COLORS = ["#6366f1","#818cf8","#a5b4fc","#c7d2fe","#ddd6fe","#ede9fe"];

/**
 * TrainingActivityChart
 * Bar chart of trainings per area + top conducting groups table.
 */
export default function TrainingActivityChart() {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
          Training Activity Overview
        </h3>
        <Info size={13} className="text-neutral-400 dark:text-neutral-600" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Bar chart */}
        <div>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-500 font-medium">
            Trainings Conducted per Area
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trainingActivityData} margin={{ top: 0, right: 8, left: -24, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" vertical={false} />
              <XAxis dataKey="area" tick={{ fontSize: 11, fill: "currentColor" }} className="text-neutral-500 dark:text-neutral-400" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-neutral-400" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5", background: "white" }}
                cursor={{ fill: "rgba(99,102,241,0.06)" }}
              />
              <Bar dataKey="trainings" name="Trainings" radius={[4, 4, 0, 0]}>
                {trainingActivityData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top groups table */}
        <div>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-500 font-medium">
            Top Conducting Groups / Units
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-400 dark:text-neutral-600">
                <th className="text-left pb-2 font-medium">Group / Unit</th>
                <th className="text-right pb-2 font-medium">Trainings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {topGroupsData.map((row) => (
                <tr key={row.group} className="text-neutral-700 dark:text-neutral-300">
                  <td className="py-1.5">{row.group}</td>
                  <td className="py-1.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                    {row.trainings}
                  </td>
                </tr>
              ))}
              <tr className="text-neutral-800 dark:text-neutral-200 font-semibold border-t-2 border-neutral-200 dark:border-neutral-700">
                <td className="pt-2">Total</td>
                <td className="pt-2 text-right text-indigo-600 dark:text-indigo-400">156</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
