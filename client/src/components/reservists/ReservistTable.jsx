import { useState } from "react";
import { Eye, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, ActionButton, MonoCode } from "@/components/airbase/AirbaseUI";

const COLUMNS = [
  { key: "serialNo",        label: "Serial No.",      sortable: true  },
  { key: "lastName",        label: "Name",            sortable: true  },
  { key: "rank",            label: "Rank",            sortable: true  },
  { key: "squadron",        label: "Squadron",        sortable: true  },
  { key: "specialization",  label: "Specialization",  sortable: true  },
  { key: "status",          label: "Status",          sortable: false },
  { key: "actions",         label: "",                sortable: false, className: "w-28" },
];

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={11} className="text-neutral-300 dark:text-neutral-700" />;
  return sortDir === "asc"
    ? <ChevronUp   size={11} className="text-indigo-500" />
    : <ChevronDown size={11} className="text-indigo-500" />;
}

function MobileCard({ row, onView, onEdit, onDelete, onToggleStatus }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
      {/* Header: avatar + name + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-xs font-bold text-white">
            {row.firstName?.[0]}{row.lastName?.[0]}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 truncate">
              {row.lastName}, {row.firstName}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-500 font-mono truncate">{row.serialNo}</p>
          </div>
        </div>
        <StatusBadge status={row.status} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <span className="text-neutral-400 dark:text-neutral-500">Rank</span>
          <p className="font-medium text-neutral-700 dark:text-neutral-300">{row.rank || "—"}</p>
        </div>
        <div>
          <span className="text-neutral-400 dark:text-neutral-500">Squadron</span>
          <p className="font-medium text-neutral-700 dark:text-neutral-300 truncate">{row.squadron || "—"}</p>
        </div>
        <div>
          <span className="text-neutral-400 dark:text-neutral-500">Specialization</span>
          <p className="font-medium text-neutral-700 dark:text-neutral-300 truncate">{row.specialization || "—"}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
        <button onClick={() => onView(row)} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
          <Eye size={13} /> View
        </button>
        <button onClick={() => onEdit(row)} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
          <Pencil size={13} /> Edit
        </button>
        <button onClick={() => onToggleStatus(row.id)} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
          {row.status === "active" ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
          Toggle
        </button>
        <button onClick={() => onDelete(row.id)} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

export default function ReservistTable({ data, onView, onEdit, onDelete, onToggleStatus }) {
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

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-16 text-center text-sm text-neutral-400 dark:text-neutral-600">
        No reservists found matching your filters.
      </div>
    );
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="flex flex-col gap-3 lg:hidden">
        {sorted.map((row) => (
          <MobileCard
            key={row.id}
            row={row}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
          />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden lg:block overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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

            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
              {sorted.map((row) => (
                <tr
                  key={row.id}
                  className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors duration-100"
                >
                  <td className="px-4 py-3">
                    <MonoCode>{row.serialNo}</MonoCode>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[10px] font-bold text-white">
                        {row.firstName?.[0]}{row.lastName?.[0]}
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

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      {row.specialization}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <ActionButton icon={Eye}    label="View"   onClick={() => onView(row)} />
                      <ActionButton icon={Pencil} label="Edit"   onClick={() => onEdit(row)} />
                      <ActionButton
                        icon={row.status === "active" ? ToggleRight : ToggleLeft}
                        label="Toggle Status"
                        onClick={() => onToggleStatus(row.id)}
                      />
                      <ActionButton icon={Trash2} label="Delete" onClick={() => onDelete(row.id)} variant="danger" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sorted.length > 0 && (
          <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-2.5">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
              Showing <span className="font-semibold text-neutral-600 dark:text-neutral-400">{sorted.length}</span> reservist{sorted.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Footer count for mobile */}
      <div className="lg:hidden">
        <p className="text-[11px] text-neutral-400 dark:text-neutral-600 px-1">
          Showing <span className="font-semibold text-neutral-600 dark:text-neutral-400">{sorted.length}</span> reservist{sorted.length !== 1 ? "s" : ""}
        </p>
      </div>
    </>
  );
}
