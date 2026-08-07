import { useMemo, useState } from "react";
import { Search, Award, Check } from "lucide-react";

const STATUS_DOT = {
  active: "bg-emerald-500",
  draft: "bg-amber-500",
  archived: "bg-neutral-400",
};

/**
 * Searchable certificate template picker. Replaces the plain <select> so authors
 * can find a template by name/department quickly and see its status and
 * orientation before attaching it to a lesson.
 */
export default function CertificatePicker({ templates, value, onChange, onOpen }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      [t.name, t.department_name, t.orientation, t.public_id]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [templates, query]);

  const selected = templates.find((t) => String(t.id) === String(value)) || null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or department..."
          aria-label="Search certificate templates"
          className="w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
        />
      </div>

      {selected && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-blue-700">
            <Check size={14} className="shrink-0" />
            <span className="truncate">{selected.name || "Untitled template"}</span>
          </span>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Clear
            </button>
            {onOpen && (
              <button
                type="button"
                onClick={onOpen}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Open
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-h-60 overflow-y-auto rounded-md border border-neutral-200 bg-white">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-sm text-neutral-500">
            {templates.length === 0
              ? "No active certificate templates available."
              : "No templates match your search."}
          </p>
        ) : (
          <ul role="listbox" aria-label="Available certificate templates" className="divide-y divide-neutral-100">
            {filtered.map((tpl) => {
              const active = String(tpl.id) === String(value);
              const status = (tpl.status || "draft").toLowerCase();
              return (
                <li key={tpl.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => onChange(active ? null : tpl.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      active ? "bg-blue-50" : "hover:bg-neutral-50"
                    }`}
                  >
                    <Award size={16} className="shrink-0 text-neutral-400" />
                    <span className="min-w-0 flex-1">
                      <span className="truncate block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {tpl.name || "Untitled template"}
                      </span>
                      {(tpl.department_name || tpl.orientation) && (
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">
                          {[tpl.department_name, tpl.orientation].filter(Boolean).join(" · ")}
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
