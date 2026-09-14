import {
  Users, UserCheck, ShieldCheck, GraduationCap,
  ClipboardCheck, AlertTriangle, TrendingUp, TrendingDown,
  BookOpen, Award, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = { Users, UserCheck, ShieldCheck, GraduationCap, ClipboardCheck, AlertTriangle, BookOpen, Award, FileText, TrendingUp, TrendingDown };

const colorMap = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-500/10",    icon: "text-blue-600 dark:text-blue-400",    border: "border-blue-100 dark:border-blue-500/20" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-500/20" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-500/10",  icon: "text-indigo-600 dark:text-indigo-400",  border: "border-indigo-100 dark:border-indigo-500/20" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-500/10",   icon: "text-amber-600 dark:text-amber-400",   border: "border-amber-100 dark:border-amber-500/20" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-500/10", icon: "text-orange-600 dark:text-orange-400", border: "border-orange-100 dark:border-orange-500/20" },
  red:     { bg: "bg-red-50 dark:bg-red-500/10",      icon: "text-red-600 dark:text-red-400",      border: "border-red-100 dark:border-red-500/20" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-500/10", icon: "text-violet-600 dark:text-violet-400", border: "border-violet-100 dark:border-violet-500/20" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-500/10",    icon: "text-teal-600 dark:text-teal-400",    border: "border-teal-100 dark:border-teal-500/20" },
};

function KPICard({ item }) {
  const Icon = typeof item.icon === "string" ? iconMap[item.icon] : item.icon;
  const c = colorMap[item.color];

  if (!Icon) return null;

  return (
    <div className={cn(
      "flex h-full flex-col rounded-xl p-4",
      "border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900",
      "hover:border-neutral-300 dark:hover:border-neutral-700",
      "hover:shadow-sm dark:hover:shadow-none",
      "transition-all duration-200",
      "group",
      "justify-between"
    )}>
      <div className="flex items-start justify-between">
        <span className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          c.bg, c.border, "border"
        )}>
          <Icon size={17} className={c.icon} strokeWidth={1.8} />
        </span>

        {item.trend === "up" && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={12} /> Up
          </span>
        )}
        {item.trend === "down" && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-red-500 dark:text-red-400">
            <TrendingDown size={12} /> Down
          </span>
        )}
        {item.trend === "warn" && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle size={12} /> Alert
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
          {item.value}
        </p>
        <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-500 leading-snug line-clamp-2">
          {item.label}
        </p>
      </div>

      <p className={cn(
        "text-[11px] font-medium line-clamp-2",
        item.trend === "up"   && "text-emerald-600 dark:text-emerald-400",
        item.trend === "down" && "text-red-500 dark:text-red-400",
        item.trend === "warn" && "text-amber-600 dark:text-amber-400",
        !item.trend           && "text-neutral-400 dark:text-neutral-500"
      )}>
        {item.sub}
      </p>

      <span className={cn(
        "absolute bottom-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        item.color === "blue"    && "bg-blue-400",
        item.color === "emerald" && "bg-emerald-400",
        item.color === "indigo"  && "bg-indigo-400",
        item.color === "amber"   && "bg-amber-400",
        item.color === "orange"  && "bg-orange-400",
        item.color === "red"     && "bg-red-400",
      )} />
    </div>
  );
}

function buildAdminDashboardKPI(data) {
  if (!data) return [];
  const users = data.users || {};
  const sops = data.sops || {};
  const training = data.training || {};
  const assessments = data.assessments || {};
  return [
    {
      id: "total-users",
      label: "Total Users",
      value: (users.total || 0).toLocaleString(),
      sub: `${users.active || 0} active`,
      icon: "Users",
      trend: null,
      color: "blue",
    },
    {
      id: "active-users",
      label: "Active Users",
      value: (users.active || 0).toLocaleString(),
      sub: `Of ${users.total || 0} total`,
      icon: "UserCheck",
      trend: null,
      color: "emerald",
    },
    {
      id: "sops-published",
      label: "SOPs Published",
      value: (sops.published || 0).toLocaleString(),
      sub: `${sops.total || 0} total SOPs`,
      icon: "FileText",
      trend: null,
      color: "indigo",
    },
    {
      id: "training-completion",
      label: "Total Average Progress",
      value: `${training.avg_progress || 0}%`,
      sub: `Task progress across all users`,
      icon: "GraduationCap",
      trend: null,
      color: "amber",
    },
    {
      id: "assessments-passed",
      label: "Assessments Passed",
      value: `${assessments.pass_rate || 0}%`,
      sub: "Across all assessments",
      icon: "ClipboardCheck",
      trend: null,
      color: "orange",
    },
    {
      id: "certificates-issued",
      label: "Certificates Issued",
      value: (data.certificatesIssued || 0).toLocaleString(),
      sub: "Total issued",
      icon: "Award",
      trend: null,
      color: "violet",
    },
  ];
}

function buildEmployeeDashboardKPI(stats) {
  if (!stats) return [];
  const completedSops = stats.sopHighlights?.filter((s) => s.status === "Completed").length || 0;
  const passRate =
    stats.assessmentsTotal > 0
      ? Math.round((Number(stats.assessmentsPassed) / Number(stats.assessmentsTotal)) * 100)
      : 0;
  return [
    {
      id: "sops-assigned",
      label: "SOPs Assigned",
      value: `${stats.sopsAssigned || 0} SOPs`,
      sub: `${completedSops} completed`,
      icon: "BookOpen",
      trend: null,
      color: "blue",
    },
    {
      id: "training-progress",
      label: "Training Progress",
      value: `${stats.trainingProgress || 0}%`,
      sub: "Keep learning",
      icon: "GraduationCap",
      trend: null,
      color: "emerald",
    },
    {
      id: "assessments-passed",
      label: "Assessments Passed",
      value: String(stats.assessmentsPassed || 0),
      sub: `${passRate}% pass rate`,
      icon: "ClipboardCheck",
      trend: null,
      color: "indigo",
    },
    {
      id: "certificates-earned",
      label: "Certificates Earned",
      value: String(stats.certificatesEarned || 0),
      sub: "Total earned",
      icon: "Award",
      trend: null,
      color: "amber",
    },
  ];
}

export default function KPIStatsGrid({ data, items }) {
  const kpiData = Array.isArray(items)
    ? items
    : buildAdminDashboardKPI(data);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {kpiData.map((item) => (
        <div key={item.id} className="aspect-square">
          <KPICard item={item} />
        </div>
      ))}
    </div>
  );
}
