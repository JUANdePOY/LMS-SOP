import { cn } from "@/lib/utils";

const categoryColors = {
  "Uniforms": "bg-blue-500",
  "Shoes": "bg-amber-500",
  "Badges": "bg-yellow-500",
  "Weapons": "bg-red-500",
  "Ammunition": "bg-orange-500",
  "Protective Equipment": "bg-purple-500",
  "Communications": "bg-cyan-500",
  "Medical": "bg-green-500",
  "Field Equipment": "bg-teal-500",
  "Rations": "bg-lime-500",
  "Optics": "bg-indigo-500",
  "Training Aids": "bg-pink-500",
  "Logistics": "bg-slate-500",
  "Other": "bg-neutral-500",
};

export function KPICard({ icon: Icon, label, value, subtext, color = "text-indigo-600 dark:text-indigo-400", bgColor = "bg-indigo-50 dark:bg-indigo-500/10" }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 min-w-[160px]">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", bgColor)}>
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-xl font-bold leading-none", color)}>{value}</p>
        <p className="mt-0.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500">{label}</p>
        {subtext && <p className="text-[9px] text-neutral-400">{subtext}</p>}
      </div>
    </div>
  );
}

export function CategoryBadge({ category }) {
  const colorClass = categoryColors[category] || categoryColors["Other"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white", colorClass)}>
      {category}
    </span>
  );
}

export function StockLevelBar({ current, reorder, max }) {
  const pct = max ? Math.min((current / max) * 100, 100) : 0;
  const reorderPct = max ? (reorder / max) * 100 : 0;
  const isLow = current <= reorder;
  const isCritical = current === 0;

  return (
    <div className="w-full">
      <div className="relative h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all",
            isCritical ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
        {max > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-neutral-400 dark:bg-neutral-500"
            style={{ left: `${reorderPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

export { categoryColors };
