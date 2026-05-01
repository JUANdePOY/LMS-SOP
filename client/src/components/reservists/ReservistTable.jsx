import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, MonoCode } from "@/components/airbase/AirbaseUI";

const COLUMNS = [
  { key: "serialNo",        label: "Serial No.",      sortable: true  },
  { key: "lastName",        label: "Name",            sortable: true  },
  { key: "rank",            label: "Rank",            sortable: true  },
  { key: "squadron",        label: "Squadron",        sortable: true  },
  { key: "airbase",         label: "Airbase",         sortable: true  },
  { key: "specialization",  label: "Specialization",  sortable: true  },
  { key: "readinessScore",  label: "Readiness",       sortable: true  },
  { key: "attendanceRate",  label: "Attendance",      sortable: true  },
  { key: "status",          label: "Status",          sortable: false },
];

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={11} className="text-neutral-300 dark:text-neutral-700" />;
  return sortDir === "asc"
    ? <ChevronUp   size={11} className="text-indigo-500" />
    : <ChevronDown size={11} className="text-indigo-500" />;
}

function ReadinessBar({ value }) {
  const color = value >= 80 ? "bg-emerald-400" : value >= 60 ? "bg-amber-400" : "bg-red-400";
  const text  = value >= 80 ? "text-emerald-600 dark:text-emerald-400"
              : value >= 60 ? "text-amber-600 dark:text-amber-400"
              : "text-red-500 dark:text-red-400";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("text-[11px] font-semibold w-8 text-right", text)}>{value}%</span>
    </div>
  );
}

/**
 * ReservistTable
 * Sortable table — clicking any row opens the detail modal.
 * Actions (edit/delete/toggle) have been moved to the modal footer.
 */
export default function ReservistTable({ data, onView }) {
  const [sortField, setSortField] = useState("lastName");
  const [sortDir,   setSortDir]   = useState("asc");

  const handleSort = (key) => {
    if (sortField === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(key); setSortDir("asc"); }
  };

  const sorted = [...data].sort((a, b) => {
    const av = a[sortField] ?? "";
    const bv = b[sortField] ?? "";
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Head */}
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider",
                    "text-neutral-500 dark:text-neutral-500",
                    col.sortable && "cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300",
                    col.className
                  )}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-600">
                  No reservists found matching your filters.
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onView(row)}
                  className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors duration-100 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <MonoCode>{row.serialNo}</MonoCode>
                  </td>

                  {/* Name + avatar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[10px] font-bold text-white">
                        {row.firstName[0]}{row.lastName[0]}
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">
                          {row.lastName}, {row.firstName}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                    {row.rank}
                  </td>

                  <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400 max-w-[140px] truncate">
                    {row.squadron}
                  </td>

                  <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-500">
                    {row.airbase}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      {row.specialization}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <ReadinessBar value={row.readinessScore} />
                  </td>

                  <td className="px-4 py-3">
                    <ReadinessBar value={row.attendanceRate} />
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {sorted.length > 0 && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-2.5">
          <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
            Showing <span className="font-semibold text-neutral-600 dark:text-neutral-400">{sorted.length}</span> reservist{sorted.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}