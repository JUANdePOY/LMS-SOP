import { useMemo, useState } from "react";
import { Search, FileText, Check } from "lucide-react";

const STATUS_DOT = {
  published: "bg-emerald-500",
  draft: "bg-amber-500",
  archived: "bg-neutral-400",
};

/**
 * Searchable SOP picker. Replaces the plain <select> so authors can find a
 * procedure by code/title quickly and see its status before attaching it.
 */
export default function SopPicker({ sops, value, onChange, onOpen }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sops;
    return sops.filter((s) =>
      [s.title, s.code, s.category_name, s.department_name]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [sops, query]);

  const selected = sops.find((s) => String(s.id) === String(value)) || null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, code, or category..."
          aria-label="Search SOPs"
          className="w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
        />
      </div>

      {selected && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-blue-700">
            <Check size={14} className="shrink-0" />
            <span className="truncate">{selected.title || "Untitled SOP"}</span>
          </span>
          {onOpen && (
            <button
              type="button"
              onClick={onOpen}
              className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Open
            </button>
          )}
        </div>
      )}

      <div className="max-h-60 overflow-y-auto rounded-md border border-neutral-200 bg-white">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-sm text-neutral-500">No SOPs match your search.</p>
        ) : (
          <ul role="listbox" aria-label="Available SOPs" className="divide-y divide-neutral-100">
            {filtered.map((sop) => {
              const active = String(sop.id) === String(value);
              const status = (sop.status || "draft").toLowerCase();
              return (
                <li key={sop.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => onChange(String(sop.id))}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      active ? "bg-blue-50" : "hover:bg-neutral-50"
                    }`}
                  >
                    <FileText size={16} className="shrink-0 text-neutral-400" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        {sop.code && (
                          <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                            {sop.code}
                          </span>
                        )}
                        <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {sop.title || "Untitled SOP"}
                        </span>
                      </span>
                      {(sop.category_name || sop.department_name) && (
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">
                          {[sop.category_name, sop.department_name].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className={`flex shrink-0 items-center gap-1 text-[10px] font-medium ${active ? "text-blue-600" : "text-neutral-400"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] || STATUS_DOT.draft}`} />
                      {status}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
