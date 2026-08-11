import { SlidersHorizontal, X } from "lucide-react";

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all_levels", label: "All Levels" },
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Recently Added" },
  { value: "title", label: "Title (A–Z)" },
  { value: "enrollment_count", label: "Most Enrolled" },
];

function Chip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, count, children }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</h4>
        {count != null && (
          <span className="text-[11px] text-neutral-400">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function FilterSidebar({
  open,
  onClose,
  collapsible = false,
  onCollapse,
  categories,
  selectedDifficulties,
  selectedCategories,
  sortField,
  sortDirection,
  onToggleDifficulty,
  onToggleCategory,
  onSortChange,
  onToggleDirection,
  onClear,
  hasActiveFilters,
}) {
  if (!open) return null;

  return (
    <aside className="hidden w-full lg:block lg:w-72 shrink-0" aria-label="Course filters">
      <div className="sticky top-[5.5rem] max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            <SlidersHorizontal size={16} className="text-neutral-500 dark:text-neutral-400" />
            Filters
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button onClick={onClear} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                Clear all
              </button>
            )}
            {collapsible && (
              <button onClick={onCollapse} aria-label="Hide filters" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                <X size={16} />
              </button>
            )}
            <button onClick={onClose} aria-label="Close filters" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-4">
          <Section title="Difficulty" count={`${selectedDifficulties.length}/${DIFFICULTIES.length}`}>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d.value}
                  label={d.label}
                  active={selectedDifficulties.includes(d.value)}
                  onClick={() => onToggleDifficulty(d.value)}
                />
              ))}
            </div>
          </Section>

          <Section title="Category" count={selectedCategories.length || undefined}>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={selectedCategories.includes(c)}
                  onClick={() => onToggleCategory(c)}
                />
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-neutral-400">No categories yet</p>
              )}
            </div>
          </Section>

          <Section title="Sort by">
            <div className="flex flex-col gap-1.5">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSortChange(opt.value)}
                  aria-pressed={sortField === opt.value}
                  className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
                    sortField === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {opt.label}
                  {sortField === opt.value && (
                    <span className="text-[10px] uppercase tracking-wide opacity-80">
                      {sortDirection === "asc" ? "Asc" : "Desc"}
                    </span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={onToggleDirection}
                className="mt-1 self-start text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                Direction: {sortDirection === "asc" ? "Ascending ↑" : "Descending ↓"}
              </button>
            </div>
          </Section>
        </div>
      </div>
    </aside>
  );
}
