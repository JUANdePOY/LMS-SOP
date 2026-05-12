import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterSelect } from "@/components/airbase/AirbaseUI";
import { RANKS, SPECIALIZATIONS } from "@/data/reservistsData";
import { hierarchyData } from "@/data/hierarchyData";

// Build unique options from hierarchy
function buildOptions() {
  const airbases  = [];
  const arcens    = [];
  const groups    = [];
  const squadrons = [];

  hierarchyData.forEach((area) => {
    airbases.push(area.name);
    area.arcens.forEach((arcen) => {
      arcens.push(arcen.name);
      arcen.groups.forEach((group) => {
        groups.push({ value: group.name, label: group.name });
        group.squadrons.forEach((sq) => squadrons.push({ value: sq.name, label: sq.name }));
      });
    });
  });

  return { airbases, arcens, groups, squadrons: [...new Map(squadrons.map(s => [s.value, s])).values()] };
}

const { airbases, arcens, groups, squadrons } = buildOptions();

export const DEFAULT_FILTERS = {
  airbase:        "",
  arcen:          "",
  group:          "",
  squadron:       "",
  rank:           "",
  specialization: "",
  status:         "",
};

/**
 * ReservistFilters
 * Multi-level filter bar: Airbase → ARCEN → Group → Squadron + Rank + Spec + Status
 */
export default function ReservistFilters({ filters, onChange }) {
  const set = (key) => (val) => onChange({ ...filters, [key]: val });

  const activeCount = Object.values(filters).filter(Boolean).length;

  const clearAll = () => onChange(DEFAULT_FILTERS);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect value={filters.airbase}        onChange={set("airbase")}        options={airbases}        placeholder="All Airbases"  />
        <FilterSelect value={filters.arcen}          onChange={set("arcen")}          options={arcens}          placeholder="All ARCENs"    />
        <FilterSelect value={filters.group}          onChange={set("group")}          options={groups}          placeholder="All Groups"    />
        <FilterSelect value={filters.squadron}       onChange={set("squadron")}       options={squadrons}       placeholder="All Squadrons" />
        <FilterSelect value={filters.rank}           onChange={set("rank")}           options={RANKS}           placeholder="All Ranks"     />
        <FilterSelect value={filters.specialization} onChange={set("specialization")} options={SPECIALIZATIONS} placeholder="All Spec."     />
        <FilterSelect
          value={filters.status}
          onChange={set("status")}
          options={[
            { value: "active",   label: "Active"   },
            { value: "inactive", label: "Inactive" },
            { value: "standby",  label: "Standby"  },
          ]}
          placeholder="All Status"
        />

        {/* Clear all */}
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
              "border-neutral-200 dark:border-neutral-700",
              "bg-white dark:bg-neutral-900",
              "text-neutral-500 dark:text-neutral-400",
              "hover:text-red-600 dark:hover:text-red-400",
              "hover:border-red-200 dark:hover:border-red-500/30",
              "transition-all duration-150"
            )}
          >
            <X size={11} />
            Clear all
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(filters).map(([key, val]) => {
            if (!val) return null;
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <span key={key} className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                "bg-indigo-50 dark:bg-indigo-500/10",
                "text-indigo-700 dark:text-indigo-300",
                "border-indigo-200 dark:border-indigo-500/30"
              )}>
                <span className="text-indigo-400 text-[10px]">{label}:</span>
                {val}
                <button
                  onClick={() => onChange({ ...filters, [key]: "" })}
                  className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
