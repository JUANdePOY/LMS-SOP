import { ChevronRight, PlaneTakeoff, Users, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHierarchy } from "@/context/HierarchyContext";
import ArcenAccordion from "./ArcenAccordion";

function ReadinessBar({ score }) {
  const color =
    score >= 80 ? "bg-emerald-400" :
    score >= 65 ? "bg-amber-400"   : "bg-red-400";
  const textColor =
    score >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    score >= 65 ? "text-amber-600 dark:text-amber-400"     : "text-red-500 dark:text-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("text-[11px] font-semibold", textColor)}>{score}%</span>
    </div>
  );
}

/**
 * AreaAccordion — Level 1 (Airbase / PAFR root)
 * Expands to show ARCEN list.
 */
export default function AreaAccordion({ area }) {
  const { expandedAreaId, toggleArea } = useHierarchy();
  const isOpen = expandedAreaId === area.id;

  const totalGroups = area.arcens.reduce((acc, a) => acc + a.groups.length, 0);
  const totalSquadrons = area.arcens.reduce((acc, a) =>
    acc + a.groups.reduce((b, g) => b + g.squadrons.length, 0), 0
  );

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-200",
      isOpen
        ? "border-neutral-300 dark:border-neutral-700 shadow-md shadow-black/5 dark:shadow-black/20"
        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
    )}>
      {/* ── Header ──────────────────────────────────────────── */}
      <button
        onClick={() => toggleArea(area.id)}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center gap-4 px-5 py-4 text-left",
          "transition-all duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-inset",
          isOpen
            ? "bg-white dark:bg-neutral-900"
            : "bg-white hover:bg-neutral-50/80 dark:bg-neutral-900 dark:hover:bg-neutral-800/40"
        )}
      >
        <ChevronRight
          size={16}
          className={cn(
            "shrink-0 text-neutral-400 dark:text-neutral-600 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />

        {/* Icon */}
        <span className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isOpen
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
        )}>
          <PlaneTakeoff size={16} strokeWidth={1.8} />
        </span>

        {/* Name */}
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[15px] font-bold tracking-tight truncate",
              isOpen ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-800 dark:text-neutral-200"
            )}>
              {area.name}
            </span>
            <span className="shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 font-mono text-[10px] text-neutral-500">
              {area.code}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-600">
            {area.arcens.length} ARCENs · {totalGroups} Groups · {totalSquadrons} Squadrons
          </span>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex shrink-0 items-center gap-5">
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-1 text-[11px] text-neutral-500">
              <Users size={11} /> {area.reservists.toLocaleString()} reservists
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-600 flex items-center gap-1">
              <Activity size={10} /> Readiness
            </span>
            <ReadinessBar score={area.readiness} />
          </div>
        </div>
      </button>

      {/* ── ARCEN list ───────────────────────────────────────── */}
      <div className={cn(
        "overflow-hidden transition-all duration-250 ease-out",
        isOpen ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="border-t border-neutral-200 dark:border-neutral-800" />
        <div className="bg-neutral-50 dark:bg-neutral-950 px-5 py-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-600">
            <span className="inline-block h-px w-4 bg-neutral-300 dark:bg-neutral-700" />
            ARCEN Units ({area.arcens.length})
          </p>
          <div className="flex flex-col gap-2">
            {area.arcens.map((arcen) => (
              <ArcenAccordion key={arcen.id} arcen={arcen} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}