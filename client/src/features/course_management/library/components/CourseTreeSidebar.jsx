import { useState } from "react";
import { ChevronRight, Building2, FolderOpen, SignalHigh } from "lucide-react";

export default function CourseTreeSidebar({
  tree,
  loading,
  activeKey,
  onSelect,
  onClear,
  hasActiveFilters,
}) {
  const [openDepts, setOpenDepts] = useState({});
  const [openCats, setOpenCats] = useState({});

  const toggleDept = (id) => setOpenDepts((p) => ({ ...p, [id]: !p[id] }));
  const toggleCat = (key) => setOpenCats((p) => ({ ...p, [key]: !p[key] }));

  const nodeKey = (deptId, cat, diff) => [deptId ?? "all", cat ?? "all", diff ?? "all"].join("::");

  return (
    <aside className="w-full shrink-0 lg:w-64" aria-label="Course hierarchy">
      <div className="sticky top-[5.5rem] rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Browse by Structure</h3>
          {hasActiveFilters && (
            <button onClick={onClear} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
              Clear
            </button>
          )}
        </div>

        {loading && <p className="text-xs text-neutral-400">Loading structure…</p>}

        <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {tree.map((dept) => {
            const deptKey = nodeKey(dept.id, null, null);
            const deptOpen = openDepts[dept.id ?? "all"] ?? false;
            return (
              <div key={dept.id ?? "all"} className="rounded-lg">
                <button
                  type="button"
                  onClick={() => toggleDept(dept.id ?? "all")}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <ChevronRight
                    size={14}
                    className={`shrink-0 text-neutral-400 transition-transform ${deptOpen ? "rotate-90" : ""}`}
                  />
                  <Building2 size={14} className="shrink-0 text-neutral-400" />
                  <span className="truncate">{dept.name}</span>
                  <span className="ml-auto text-[10px] text-neutral-400">{dept.categories.length}</span>
                </button>

                {deptOpen && (
                  <div className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-700">
                    {dept.categories.map((cat) => {
                      const catKey = nodeKey(dept.id, cat.name, null);
                      const catOpen = openCats[catKey] ?? false;
                      return (
                        <div key={cat.name} className="rounded-md">
                          <button
                            type="button"
                            onClick={() => toggleCat(catKey)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          >
                            <ChevronRight
                              size={12}
                              className={`shrink-0 text-neutral-400 transition-transform ${catOpen ? "rotate-90" : ""}`}
                            />
                            <FolderOpen size={12} className="shrink-0 text-neutral-400" />
                            <span className="truncate">{cat.name}</span>
                            <span className="ml-auto text-[10px] text-neutral-400">{cat.count}</span>
                          </button>

                          {catOpen && (
                            <div className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-700">
                              {cat.difficulties.map((diff) => {
                                const key = nodeKey(dept.id, cat.name, diff);
                                const active = activeKey === key;
                                return (
                                  <button
                                    key={diff}
                                    type="button"
                                    onClick={() => onSelect({ departmentId: dept.id ?? null, category: cat.name, difficulty: diff })}
                                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                                      active
                                        ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                        : "text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                                    }`}
                                  >
                                    <SignalHigh size={11} className="shrink-0 text-neutral-400" />
                                    <span className="capitalize">{diff.replace("_", " ")}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {!loading && tree.length === 0 && (
            <p className="px-2 py-2 text-xs text-neutral-400">No courses available</p>
          )}
        </div>
      </div>
    </aside>
  );
}


