import { MapPin, PlaneTakeoff } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HierarchyProvider, useHierarchy } from "@/context/HierarchyContext";
import AreaAccordion from "@/components/hierarchy/AreaAccordion";
import SelectedSquadronPanel from "@/components/hierarchy/SelectedSquadronPanel";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import { hierarchyData } from "@/data/hierarchyData";
import { useState } from "react";
import { Search, X, RotateCcw } from "lucide-react";

function SummaryCard({ label, value, sub }) {
  return (
    <div className={cn(
      "flex flex-col rounded-xl border px-4 py-3",
      "bg-white dark:bg-neutral-900",
      "border-neutral-200 dark:border-neutral-800"
    )}>
      <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
        {value}
      </span>
      <span className="mt-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-500">{label}</span>
      {sub && <span className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-600">{sub}</span>}
    </div>
  );
}

function OverviewContent() {
  const [search, setSearch] = useState("");
  const { resetAll, selectedSquadron } = useHierarchy();

  const totalReservists = hierarchyData.reduce((a, area) => a + area.reservists, 0);
  const totalArcens     = hierarchyData.reduce((a, area) => a + area.arcens.length, 0);
  const totalGroups     = hierarchyData.reduce((a, area) =>
    a + area.arcens.reduce((b, arc) => b + arc.groups.length, 0), 0);
  const totalSquadrons  = hierarchyData.reduce((a, area) =>
    a + area.arcens.reduce((b, arc) =>
      b + arc.groups.reduce((c, g) => c + g.squadrons.length, 0), 0), 0);

  const filtered = search.trim()
    ? hierarchyData.filter((area) =>
        area.name.toLowerCase().includes(search.toLowerCase()) ||
        area.code.toLowerCase().includes(search.toLowerCase()) ||
        area.arcens.some((arc) =>
          arc.name.toLowerCase().includes(search.toLowerCase()) ||
          arc.groups.some((g) =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.squadrons.some((s) => s.name.toLowerCase().includes(search.toLowerCase()))
          )
        )
      )
    : hierarchyData;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <AirbasePageHeader
        icon={PlaneTakeoff}
        title="Airbase Overview"
        description="Hierarchical drill-down: Airbase → ARCEN → Group → Squadron"
        breadcrumbs={[
          { label: "Airbase", path: "/airbase" },
          { label: "Overview" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/airbase/arcens" className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium",
              "border-neutral-200 dark:border-neutral-700",
              "text-neutral-600 dark:text-neutral-400",
              "hover:bg-neutral-50 dark:hover:bg-neutral-800",
              "transition-colors duration-150"
            )}>
              Manage ARCENs
            </Link>
            <Link to="/airbase/groups" className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium",
              "border-neutral-200 dark:border-neutral-700",
              "text-neutral-600 dark:text-neutral-400",
              "hover:bg-neutral-50 dark:hover:bg-neutral-800",
              "transition-colors duration-150"
            )}>
              Manage Groups
            </Link>
            <Link to="/airbase/squadrons" className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium",
              "border-neutral-200 dark:border-neutral-700",
              "text-neutral-600 dark:text-neutral-400",
              "hover:bg-neutral-50 dark:hover:bg-neutral-800",
              "transition-colors duration-150"
            )}>
              Manage Squadrons
            </Link>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Airbases"   value={hierarchyData.length} />
        <SummaryCard label="ARCENs"     value={totalArcens} />
        <SummaryCard label="Groups"     value={totalGroups} />
        <SummaryCard label="Squadrons"  value={totalSquadrons} />
        <SummaryCard label="Reservists" value={totalReservists.toLocaleString()} />
      </div>

      {/* Search + collapse */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search area, ARCEN, group, squadron…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full rounded-lg border py-2 pl-8 pr-8 text-sm",
              "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900",
              "text-neutral-800 dark:text-neutral-200",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
              "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
            )}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={resetAll}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
            "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900",
            "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200",
            "transition-all duration-150"
          )}
        >
          <RotateCcw size={12} /> Collapse All
        </button>
      </div>

      {/* Hierarchy legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-[11px] text-neutral-500 dark:text-neutral-600">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Hierarchy:</span>
        {[
          { level: "1", label: "Airbase",  color: "bg-indigo-500" },
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

      {/* Accordion list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 py-12 text-center">
          <p className="text-sm text-neutral-400">No areas match your search.</p>
          <button onClick={() => setSearch("")} className="mt-2 text-xs text-indigo-500 hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((area) => <AreaAccordion key={area.id} area={area} />)}
        </div>
      )}

      {selectedSquadron && <SelectedSquadronPanel />}
    </div>
  );
}

export default function AirbaseOverview() {
  return (
    <HierarchyProvider>
      <OverviewContent />
    </HierarchyProvider>
  );
}
