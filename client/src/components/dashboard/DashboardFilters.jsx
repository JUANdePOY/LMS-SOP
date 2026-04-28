import { useState } from "react";
import { Calendar, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterOptions } from "@/data/dashboardData";

function FilterSelect({ icon: Icon, value, options, onChange, className }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
          "border border-neutral-200 dark:border-neutral-700",
          "bg-white dark:bg-neutral-800",
          "text-neutral-700 dark:text-neutral-200",
          "hover:border-neutral-300 dark:hover:border-neutral-600",
          "hover:bg-neutral-50 dark:hover:bg-neutral-750",
          "transition-all duration-150",
          className
        )}
      >
        {Icon && <Icon size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />}
        <span className="max-w-[140px] truncate">{value}</span>
        <ChevronDown
          size={13}
          className={cn(
            "text-neutral-400 shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className={cn(
            "absolute top-full left-0 mt-1.5 z-50 min-w-[180px]",
            "rounded-lg border border-neutral-200 dark:border-neutral-700",
            "bg-white dark:bg-neutral-800 shadow-lg shadow-black/10 dark:shadow-black/40",
            "overflow-hidden"
          )}>
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-700",
                  "transition-colors duration-100",
                  value === opt
                    ? "text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-500/10"
                    : "text-neutral-700 dark:text-neutral-300"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * DashboardFilters
 * Smart filter bar: date range, group/unit, area, status + active filter chips
 */
export default function DashboardFilters({ filters, onChange }) {
  const activeFilters = Object.entries(filters).filter(
    ([k, v]) => !v.startsWith("All") && k !== "dateRange"
  );

  return (
    <div className="flex flex-col gap-3">
      {/* ── Filter row ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          icon={Calendar}
          value={filters.dateRange}
          options={filterOptions.dateRanges}
          onChange={(v) => onChange({ ...filters, dateRange: v })}
        />
        <FilterSelect
          value={filters.group}
          options={filterOptions.groups}
          onChange={(v) => onChange({ ...filters, group: v })}
        />
        <FilterSelect
          value={filters.area}
          options={filterOptions.areas}
          onChange={(v) => onChange({ ...filters, area: v })}
        />
        <FilterSelect
          value={filters.status}
          options={filterOptions.statuses}
          onChange={(v) => onChange({ ...filters, status: v })}
        />

        {/* Filter icon button */}
        <button className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
          "border border-neutral-200 dark:border-neutral-700",
          "bg-white dark:bg-neutral-800",
          "text-neutral-600 dark:text-neutral-300",
          "hover:bg-neutral-50 dark:hover:bg-neutral-700",
          "transition-all duration-150"
        )}>
          <SlidersHorizontal size={14} />
          <span>Filters</span>
          {activeFilters.length > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Active filter chips ──────────────────────────────── */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map(([key, val]) => (
            <span
              key={key}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                "bg-indigo-50 dark:bg-indigo-500/10",
                "text-indigo-700 dark:text-indigo-300",
                "border border-indigo-200 dark:border-indigo-500/30"
              )}
            >
              {val}
              <button
                onClick={() => {
                  const reset = key === "group" ? "All Groups"
                    : key === "area" ? "All Areas"
                    : "All Status";
                  onChange({ ...filters, [key]: reset });
                }}
                className="hover:text-indigo-900 dark:hover:text-indigo-100"
              >
                <X size={11} />
              </button>
            </span>
          ))}

          <button
            onClick={() => onChange({
              dateRange: filters.dateRange,
              group: "All Groups",
              area: "All Areas",
              status: "All Status",
            })}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 underline underline-offset-2 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
