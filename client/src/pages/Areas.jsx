import { useState } from "react";
import { MapPin, Search, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { HierarchyProvider, useHierarchy } from "@/components/hierarchy/HierarchyContext";
import AreaAccordion from "@/components/hierarchy/AreaAccordion";
import SelectedSquadronPanel from "@/components/hierarchy/SelectedSquadronPanel";
import { hierarchyData } from "@/data/hierarchyData";

/**
 * HierarchySummaryBar
 * Shows totals across all areas.
 */
function HierarchySummaryBar({ data }) {
  const totalReservists = data.reduce((a, area) => a + area.reservists, 0);
  const totalArcens     = data.reduce((a, area) => a + area.arcens.length, 0);
  const totalGroups     = data.reduce((a, area) =>
    a + area.arcens.reduce((b, arc) => b + arc.groups.length, 0), 0);
  const totalSquadrons  = data.reduce((a, area) =>
    a + area.arcens.reduce((b, arc) =>
      b + arc.groups.reduce((c, g) => c + g.squadrons.length, 0), 0), 0);

  const stats = [
    { label: "Areas",      value: data.length    },
    { label: "ARCENs",     value: totalArcens    },
    { label: "Groups",     value: totalGroups    },
    { label: "Squadrons",  value: totalSquadrons },
    { label: "Reservists", value: totalReservists.toLocaleString() },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((s) => (
        <div key={s.label} className={cn(
          "flex flex-col rounded-xl border px-4 py-2.5 min-w-[80px]",
          "bg-white dark:bg-neutral-900",
          "border-neutral-200 dark:border-neutral-800"
        )}>
          <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
            {s.value}
          </span>
          <span className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-600 font-medium">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Inner content — needs to be inside HierarchyProvider to use useHierarchy.
 */
function AreasContent() {
  const [search, setSearch] = useState("");
  const { resetAll, selectedSquadron } = useHierarchy();

  // Filter areas by search
  const filtered = search.trim()
    ? hierarchyData.filter((area) =>
        area.name.toLowerCase().includes(search.toLowerCase()) ||
        area.code.toLowerCase().includes(search.toLowerCase()) ||
        area.arcens.some((arc) =>
          arc.name.toLowerCase().includes(search.toLowerCase()) ||
          arc.groups.some((g) =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.squadrons.some((s) =>
              s.name.toLowerCase().includes(search.toLowerCase())
            )
          )
        )
      )
    : hierarchyData;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* ── Page header ───────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <MapPin size={15} strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Areas
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Hierarchical drill-down: Area → ARCEN → Group → Squadron
        </p>
      </div>

      {/* ── Summary stats ─────────────────────────────────── */}
      <HierarchySummaryBar data={hierarchyData} />

      {/* ── Search + reset ────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative max-w-xs flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search area, group, squadron…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full rounded-lg border py-2 pl-8 pr-8 text-sm",
              "border-neutral-200 dark:border-neutral-700",
              "bg-white dark:bg-neutral-900",
              "text-neutral-800 dark:text-neutral-200",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
              "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
              "transition-all duration-150"
            )}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Reset all expanded */}
        <button
          onClick={resetAll}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
            "border-neutral-200 dark:border-neutral-700",
            "bg-white dark:bg-neutral-900",
            "text-neutral-500 dark:text-neutral-400",
            "hover:text-neutral-800 dark:hover:text-neutral-200",
            "hover:border-neutral-300 dark:hover:border-neutral-600",
            "transition-all duration-150"
          )}
        >
          <RotateCcw size={12} />
          Collapse All
        </button>
      </div>

      {/* ── Hierarchy Legend ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-[11px] text-neutral-500 dark:text-neutral-600">
        <span className="font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-wider text-[10px]">Hierarchy:</span>
        {[
          { level: "1", label: "Area",     color: "bg-indigo-500" },
          { level: "2", label: "ARCEN",    color: "bg-indigo-400" },
          { level: "3", label: "Group",    color: "bg-blue-400"   },
          { level: "4", label: "Squadron", color: "bg-blue-300"   },
        ].map((l, i) => (
          <span key={l.level} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-neutral-300 dark:text-neutral-700">›</span>}
            <span className={cn("h-2 w-2 rounded-full", l.color)} />
            <span>L{l.level}: {l.label}</span>
          </span>
        ))}
      </div>

      {/* ── Area accordion list ───────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 py-12 text-center">
          <p className="text-sm text-neutral-400">No areas match your search.</p>
          <button onClick={() => setSearch("")} className="mt-2 text-xs text-indigo-500 hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((area) => (
            <AreaAccordion key={area.id} area={area} />
          ))}
        </div>
      )}

      {/* ── Selected squadron floating panel ─────────────── */}
      {selectedSquadron && <SelectedSquadronPanel />}
    </div>
  );
}

/**
 * Areas page — wraps content in HierarchyProvider for centralized state.
 */
export default function Areas() {
  return (
    <HierarchyProvider>
      <AreasContent />
    </HierarchyProvider>
  );
}
