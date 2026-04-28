import { AlertTriangle, Info, ArrowRight, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { lowPerformingAreas, alertsData } from "@/data/dashboardData";

function FlagBadge({ flag }) {
  if (flag === "critical") return (
    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
      <AlertTriangle size={9} /> Critical
    </span>
  );
  return (
    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
      <AlertCircle size={9} /> Warning
    </span>
  );
}

function AlertIcon({ type }) {
  if (type === "critical") return <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />;
  if (type === "warning")  return <AlertCircle  size={14} className="text-amber-500 shrink-0 mt-0.5" />;
  return <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />;
}

/**
 * LowPerformingAreas
 */
export function LowPerformingAreas() {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
            Low Performing Areas
          </h3>
          <span className="text-[10px] text-neutral-400 font-medium">(Need Attention)</span>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-neutral-400 dark:text-neutral-600">
            <th className="text-left pb-2 font-medium">Area</th>
            <th className="text-right pb-2 font-medium">Readiness</th>
            <th className="text-right pb-2 font-medium">Attendance</th>
            <th className="text-right pb-2 font-medium">Trainings</th>
            <th className="text-right pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {lowPerformingAreas.map((row) => (
            <tr key={row.area} className="text-neutral-700 dark:text-neutral-300">
              <td className="py-2.5 font-medium">{row.area}</td>
              <td className={cn("py-2.5 text-right font-semibold",
                row.readiness < 65 ? "text-red-500" : "text-amber-500"
              )}>{row.readiness}%</td>
              <td className={cn("py-2.5 text-right",
                row.attendance < 70 ? "text-red-500" : "text-neutral-500 dark:text-neutral-400"
              )}>{row.attendance}%</td>
              <td className="py-2.5 text-right text-neutral-500 dark:text-neutral-400">{row.trainings}</td>
              <td className="py-2.5 text-right"><FlagBadge flag={row.flag} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="mt-4 flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
        View All Areas <ArrowRight size={12} />
      </button>
    </div>
  );
}

/**
 * AlertsInsights
 */
export function AlertsInsights() {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-neutral-400" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
            Alerts & Insights
          </h3>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {alertsData.map((alert) => (
          <div key={alert.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <AlertIcon type={alert.type} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {alert.message}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-600">
                <Clock size={9} /> {alert.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-4 flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
        View All Alerts <ArrowRight size={12} />
      </button>
    </div>
  );
}
