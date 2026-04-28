import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { attendanceTimelineData, attendanceByAreaData } from "@/data/dashboardData";

function AttendanceBar({ area, rate }) {
  const color = rate < 70 ? "bg-red-400" : rate < 85 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-right text-xs text-neutral-600 dark:text-neutral-400 font-medium">
        {area}
      </span>
      <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={cn(
        "w-12 text-right text-xs font-semibold",
        rate < 70 ? "text-red-500" : rate < 85 ? "text-amber-500" : "text-emerald-500"
      )}>
        {rate}%
      </span>
    </div>
  );
}

/**
 * AttendanceAnalytics
 * Line chart over time + per-area attendance bars.
 */
export default function AttendanceAnalytics() {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
          Attendance Analytics
        </h3>
        <Info size={13} className="text-neutral-400 dark:text-neutral-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <div>
          <p className="mb-3 text-xs text-neutral-500 font-medium">Attendance Rate Over Time</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={attendanceTimelineData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "currentColor" }} className="text-neutral-400" tickLine={false} axisLine={false} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: "currentColor" }} className="text-neutral-400" tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5", background: "white" }}
                formatter={(v) => [`${v}%`, "Rate"]}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Per area */}
        <div>
          <p className="mb-3 text-xs text-neutral-500 font-medium">Attendance Rate per Area</p>
          <div className="flex flex-col gap-2.5">
            {attendanceByAreaData.map((row) => (
              <AttendanceBar key={row.area} area={row.area} rate={row.rate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
