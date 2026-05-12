import { useState, useMemo } from "react";
import {
  Users, Search, X, ChevronRight,
  Layers, Shield, CheckCircle2, XCircle,
  Tag, RotateCcw, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hierarchyData } from "@/data/hierarchyData";
import ReservistList from "@/components/hierarchy/ReservistList";

// ─────────────────────────────────────────────────────────────
// Derived flat data — Groups extracted from hierarchy
// ─────────────────────────────────────────────────────────────

function flattenGroups(data) {
  const result = [];
  for (const area of data) {
    for (const arcen of area.arcens) {
      for (const group of arcen.groups) {
        result.push({
          ...group,
          _area:  { id: area.id,  name: area.name,  code: area.code  },
          _arcen: { id: arcen.id, name: arcen.name, code: arcen.code },
        });
      }
    }
  }
  return result;
}

const ALL_GROUPS = flattenGroups(hierarchyData);

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

/** Compact summary stat card */
function StatCard({ label, value, accent }) {
  return (
    <div className={cn(
      "flex flex-col rounded-xl border px-4 py-3",
      "bg-white dark:bg-neutral-900",
      "border-neutral-200 dark:border-neutral-800"
    )}>
      <span className={cn("text-xl font-bold tracking-tight leading-none", accent ?? "text-neutral-900 dark:text-neutral-50")}>
        {value}
      </span>
      <span className="mt-0.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-600">{label}</span>
    </div>
  );
}

/** Squadron badge inside a group card */
function SquadronBadge({ squadron }) {
  const isActive = squadron.status === "active";
  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg border px-2.5 py-2",
      "border-neutral-100 dark:border-neutral-800",
      "bg-neutral-50 dark:bg-neutral-950",
      "transition-colors duration-150"
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          isActive ? "bg-emerald-400" : "bg-neutral-300 dark:bg-neutral-700"
        )} />
        <span className="truncate text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          {squadron.name}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2 ml-2">
        <span className="text-[10px] text-neutral-400 dark:text-neutral-600">{squadron.members} mbr</span>
        <span className="font-mono text-[9px] text-neutral-300 dark:text-neutral-700">{squadron.code}</span>
      </div>
    </div>
  );
}

/** Full group card */
function GroupCard({ group, onSelectSquadron, selectedSquadronId }) {
  const [expanded, setExpanded] = useState(false);

  const activeCount   = group.squadrons.filter((s) => s.status === "active").length;
  const inactiveCount = group.squadrons.length - activeCount;

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      "border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900",
      "hover:border-neutral-300 dark:hover:border-neutral-700",
      "hover:shadow-sm dark:hover:shadow-none",
      "transition-all duration-150"
    )}>
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-0.5">
          <Layers size={16} strokeWidth={1.8} />
        </span>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
              {group.name}
            </span>
            <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[9px] text-neutral-500 dark:text-neutral-500">
              {group.code}
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-600">{group.type}</span>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-600">
            <Shield size={9} />
            <span>{group._arcen.name}</span>
            <ChevronRight size={9} />
            <span>{group._area.name}</span>
          </div>

          {/* Stats row */}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-500">
              <Users size={10} /> {group.reservists} reservists
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {activeCount} active sqdn
            </span>
            {inactiveCount > 0 && (
              <span className="text-[11px] text-neutral-400 dark:text-neutral-600">
                {inactiveCount} inactive
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium",
            "border-neutral-200 dark:border-neutral-700",
            "text-neutral-500 dark:text-neutral-400",
            "hover:border-neutral-300 dark:hover:border-neutral-600",
            "hover:text-neutral-700 dark:hover:text-neutral-200",
            "transition-all duration-150"
          )}
        >
          <ChevronRight
            size={12}
            className={cn("transition-transform duration-200", expanded && "rotate-90")}
          />
          {expanded ? "Hide" : `${group.squadrons.length} sqdn`}
        </button>
      </div>

      {/* Squadrons accordion */}
      <div className={cn(
        "overflow-hidden transition-all duration-200 ease-out",
        expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-600">
            Squadrons
          </p>
          <div className="flex flex-col gap-1.5">
            {group.squadrons.map((sq) => {
              const isSelected = selectedSquadronId === sq.id;
              return (
                <button
                  key={sq.id}
                  onClick={() => onSelectSquadron(sq, group)}
                  className={cn(
                    "group w-full rounded-lg border text-left transition-all duration-150",
                    isSelected
                      ? "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
                      : "border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 bg-neutral-50 dark:bg-neutral-950"
                  )}
                >
                  <div className="flex items-center justify-between px-2.5 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        sq.status === "active" ? "bg-emerald-400" : "bg-neutral-300 dark:bg-neutral-700"
                      )} />
                      <span className={cn(
                        "truncate text-[11px] font-medium",
                        isSelected
                          ? "text-indigo-700 dark:text-indigo-300"
                          : "text-neutral-700 dark:text-neutral-300"
                      )}>
                        {sq.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 ml-2">
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-600">{sq.members} mbr</span>
                      <Tag size={9} className="text-neutral-300 dark:text-neutral-700" />
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-600">{sq.specialization}</span>
                      {isSelected && (
                        <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          selected
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Right panel — reservist list for selected squadron */
function SquadronDetailPanel({ squadron, group, onClose }) {
  return (
    <div className={cn(
      "flex flex-col rounded-2xl border",
      "border-indigo-200 dark:border-indigo-500/30",
      "bg-white dark:bg-neutral-900",
      "shadow-xl shadow-black/5 dark:shadow-black/20"
    )}>
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Shield size={13} strokeWidth={2} />
          </span>
          <div>
            <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-50 leading-none">
              {squadron.name}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-neutral-400">{squadron.code}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Reservist list */}
      <div className="flex-1 overflow-y-auto p-5">
        <ReservistList
          squadronId={squadron.id}
          squadronName={squadron.name}
          arcenName={group?._arcen?.name}
          groupName={group?.name}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Groups page
// ─────────────────────────────────────────────────────────────

const TYPE_FILTERS = ["All Types", ...new Set(ALL_GROUPS.map((g) => g.type))];
const AREA_FILTERS = ["All Areas", ...new Set(ALL_GROUPS.map((g) => g._area.name))];

export default function Groups() {
  const [search,   setSearch]   = useState("");
  const [typeFilter, setType]   = useState("All Types");
  const [areaFilter, setArea]   = useState("All Areas");
  const [selectedSq, setSelectedSq]   = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const filtered = useMemo(() => {
    return ALL_GROUPS.filter((g) => {
      const matchSearch = !search.trim() ||
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.code.toLowerCase().includes(search.toLowerCase()) ||
        g.type.toLowerCase().includes(search.toLowerCase()) ||
        g._arcen.name.toLowerCase().includes(search.toLowerCase()) ||
        g.squadrons.some((s) => s.name.toLowerCase().includes(search.toLowerCase()));

      const matchType = typeFilter === "All Types" || g.type === typeFilter;
      const matchArea = areaFilter === "All Areas" || g._area.name === areaFilter;

      return matchSearch && matchType && matchArea;
    });
  }, [search, typeFilter, areaFilter]);

  // Global stats
  const totalReservists = ALL_GROUPS.reduce((a, g) => a + g.reservists, 0);
  const totalSquadrons  = ALL_GROUPS.reduce((a, g) => a + g.squadrons.length, 0);
  const activeSquadrons = ALL_GROUPS.reduce(
    (a, g) => a + g.squadrons.filter((s) => s.status === "active").length, 0
  );

  const handleSelectSquadron = (sq, group) => {
    if (selectedSq?.id === sq.id) {
      setSelectedSq(null);
      setSelectedGroup(null);
    } else {
      setSelectedSq(sq);
      setSelectedGroup(group);
    }
  };

  const handleReset = () => {
    setSearch("");
    setType("All Types");
    setArea("All Areas");
  };

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Users size={15} strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Groups & Units
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          All reserve groups across areas. Select a squadron to view its personnel.
        </p>
      </div>

      {/* ── Summary stats ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Total Groups"      value={ALL_GROUPS.length}               />
        <StatCard label="Total Squadrons"   value={totalSquadrons}                  />
        <StatCard label="Active Squadrons"  value={activeSquadrons} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Total Reservists"  value={totalReservists.toLocaleString()} accent="text-indigo-600 dark:text-indigo-400" />
        <StatCard label="Showing"           value={filtered.length} accent="text-neutral-500 dark:text-neutral-400" />
      </div>

      {/* ── Filter bar ──────────────────────────────────────── */}
      <div className={cn(
        "flex flex-wrap items-end gap-3 rounded-xl border px-4 py-3",
        "border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-900"
      )}>
        {/* Search */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-600 px-0.5">
            Search
          </span>
          <div className="relative">
            <Search size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600" />
            <input
              type="text"
              placeholder="Group, squadron, ARCEN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "rounded-lg border py-2 pl-8 pr-8 text-xs min-w-[200px]",
                "border-neutral-200 dark:border-neutral-700",
                "bg-white dark:bg-neutral-900",
                "text-neutral-800 dark:text-neutral-200",
                "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
                "outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400",
                "transition-all duration-150"
              )}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Type filter */}
        {[
          { label: "Type",    value: typeFilter, opts: TYPE_FILTERS, set: setType  },
          { label: "Area",    value: areaFilter, opts: AREA_FILTERS, set: setArea  },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-600 px-0.5">
              {f.label}
            </span>
            <div className="relative">
              <select
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className={cn(
                  "appearance-none rounded-lg border py-2 pl-3 pr-7 text-xs cursor-pointer",
                  "border-neutral-200 dark:border-neutral-700",
                  "bg-white dark:bg-neutral-900",
                  "text-neutral-700 dark:text-neutral-300",
                  "outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400",
                  "transition-all duration-150 min-w-[130px]"
                )}
              >
                {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronRight size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-neutral-400" />
            </div>
          </div>
        ))}

        {/* Reset */}
        <div className="flex flex-col gap-1 self-end">
          <div className="h-[18px]" />
          <button
            onClick={handleReset}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
              "border-neutral-200 dark:border-neutral-700",
              "text-neutral-500 dark:text-neutral-400",
              "hover:text-neutral-800 dark:hover:text-neutral-200",
              "hover:bg-neutral-50 dark:hover:bg-neutral-800",
              "transition-all duration-150"
            )}
          >
            <RotateCcw size={11} /> Reset
          </button>
        </div>
      </div>

      {/* ── Main layout: group list + detail panel ────────── */}
      <div className={cn(
        "grid gap-5",
        selectedSq ? "grid-cols-1 xl:grid-cols-[1fr_420px]" : "grid-cols-1"
      )}>

        {/* Group cards */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 py-12 text-center">
              <p className="text-sm text-neutral-400">No groups match your filters.</p>
              <button onClick={handleReset} className="mt-2 text-xs text-indigo-500 hover:underline">
                Reset filters
              </button>
            </div>
          ) : (
            filtered.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onSelectSquadron={handleSelectSquadron}
                selectedSquadronId={selectedSq?.id}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedSq && (
          <div className="sticky top-20 h-fit">
            <SquadronDetailPanel
              squadron={selectedSq}
              group={selectedGroup}
              onClose={() => { setSelectedSq(null); setSelectedGroup(null); }}
            />
          </div>
        )}
      </div>

    </div>
  );
}
