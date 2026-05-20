import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

function ChartCard({ title, children, className }) {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
          {title}
        </h3>
        <Info size={13} className="text-neutral-400 dark:text-neutral-600" />
      </div>
      {children}
    </div>
  );
}

export default function ForceDistributionChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Force Distribution by Area">
        <div className="flex h-32 items-center justify-center text-xs text-neutral-400">No data available</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Force Distribution by Area">
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-neutral-400 dark:text-neutral-600">
              <th className="text-left pb-2 font-medium">Area</th>
              <th className="text-right pb-2 font-medium">Total</th>
              <th className="text-right pb-2 font-medium">Active</th>
              <th className="text-right pb-2 font-medium">Standby</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.map((row) => (
              <tr key={row.area} className="text-neutral-700 dark:text-neutral-300">
                <td className="py-1.5 font-medium">{row.area || "Unassigned"}</td>
                <td className="py-1.5 text-right">{(row.total || 0).toLocaleString()}</td>
                <td className="py-1.5 text-right text-indigo-600 dark:text-indigo-400">{row.active || 0}</td>
                <td className="py-1.5 text-right text-neutral-400">{row.standby || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barSize={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} className="text-neutral-400" tickLine={false} axisLine={false} />
          <YAxis dataKey="area" type="category" tick={{ fontSize: 11, fill: "currentColor" }} className="text-neutral-500 dark:text-neutral-400" tickLine={false} axisLine={false} width={72} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5", background: "white" }} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="active" name="Active Reserve" fill="#6366f1" radius={[0, 4, 4, 0]} />
          <Bar dataKey="standby" name="Standby Reserve" fill="#d4d4d4" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
