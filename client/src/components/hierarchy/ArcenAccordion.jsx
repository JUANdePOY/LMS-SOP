import { ChevronRight, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHierarchy } from "@/components/hierarchy/HierarchyContext";
import GroupAccordion from "./GroupAccordion";

/**
 * ArcenAccordion
 * Level 2 — ARCEN node. Expands to show GroupAccordion list.
 *
 * @param {{ arcen: Arcen }} props
 */
export default function ArcenAccordion({ arcen }) {
  const { expandedArcenId, toggleArcen } = useHierarchy();
  const isOpen = expandedArcenId === arcen.id;

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      "transition-colors duration-150",
      isOpen
        ? "border-indigo-200 dark:border-indigo-500/30"
        : "border-neutral-200 dark:border-neutral-800"
    )}>
      {/* ── ARCEN header button ──────────────────────────────── */}
      <button
        onClick={() => toggleArcen(arcen.id)}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left",
          "transition-all duration-150",
          "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-inset",
          isOpen
            ? "bg-indigo-50/80 dark:bg-indigo-500/10"
            : "bg-neutral-50 hover:bg-neutral-100/80 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/60"
        )}
      >
        {/* Chevron */}
        <ChevronRight
          size={14}
          className={cn(
            "shrink-0 text-neutral-400 dark:text-neutral-600",
            "transition-transform duration-200",
            isOpen && "rotate-90 text-indigo-500 dark:text-indigo-400"
          )}
        />

        {/* Icon */}
        <span className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          isOpen
            ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
            : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500"
        )}>
          <Shield size={13} strokeWidth={1.8} />
        </span>

        {/* Name + meta */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[13px] font-semibold truncate",
              isOpen
                ? "text-indigo-700 dark:text-indigo-300"
                : "text-neutral-700 dark:text-neutral-300"
            )}>
              {arcen.name}
            </span>
            <span className="shrink-0 rounded bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[9px] text-neutral-500 dark:text-neutral-500">
              {arcen.code}
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-600">
            Cmdr: {arcen.commander}
          </span>
        </div>

        {/* Stats */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-500">
            <Users size={11} /> {arcen.reservists.toLocaleString()}
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-600">
            {arcen.groups.length} group{arcen.groups.length !== 1 ? "s" : ""}
          </span>
        </div>
      </button>

      {/* ── Groups list ──────────────────────────────────────── */}
      <div className={cn(
        "overflow-hidden transition-all duration-200 ease-out",
        isOpen ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="border-t border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5 px-4 py-3">
          {/* Level label */}
          <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-400 dark:text-indigo-600">
            <span className="inline-block h-px w-3 bg-indigo-300 dark:bg-indigo-700" />
            Groups ({arcen.groups.length})
          </p>

          {/* Group accordions */}
          <div className="flex flex-col gap-1.5">
            {arcen.groups.map((group) => (
              <GroupAccordion key={group.id} group={group} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
