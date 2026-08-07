import { cn } from "@/lib/utils";

const FILL = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
  sky: "bg-sky-500",
};

export default function ProgressBar({ value = 0, color = "emerald", className }) {
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-slate-100 dark:bg-neutral-800", className)}>
      <div className={cn("h-full rounded-full transition-all", FILL[color])} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}
