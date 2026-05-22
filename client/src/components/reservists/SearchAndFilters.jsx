import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Clock, Command, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterSelect } from "@/components/airbase/AirbaseUI";
import { getReservistFilterMetadata } from "@/services/api";

const SEARCH_HISTORY_KEY = "reservist_search_history";
const MAX_HISTORY = 8;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveHistory(term) {
  if (!term.trim()) return;
  const history = getHistory();
  const filtered = history.filter((h) => h !== term);
  filtered.unshift(term);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
}
function clearHistory() { localStorage.removeItem(SEARCH_HISTORY_KEY); }

export const DEFAULT_FILTERS = {
  arsenId: "", groupId: "", squadronId: "", rank: "", specialization: "",
  reserveStatus: "", category: "", sourceOfCommission: "", bloodType: "",
  sex: "", civilStatus: "", status: "",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "standby", label: "Standby" },
];

export default function SearchAndFilters({ search, onSearchChange, filters, onFiltersChange, resultCount }) {
  const [localValue, setLocalValue] = useState(search);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { setLocalValue(search); }, [search]);
  useEffect(() => { setHistory(getHistory()); }, []);

  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);
    getReservistFilterMetadata()
      .then((res) => { if (!cancelled && res.data.status === "success") setMetadata(res.data.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMetaLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === "Escape") inputRef.current?.blur();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const debouncedOnChange = useCallback((val) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(val);
      if (val.trim()) saveHistory(val.trim());
      setHistory(getHistory());
    }, 300);
  }, [onSearchChange]);

  const handleChange = (e) => { setLocalValue(e.target.value); debouncedOnChange(e.target.value); };
  const handleClear = () => { setLocalValue(""); onSearchChange(""); setHistory(getHistory()); inputRef.current?.focus(); };
  const handleHistoryClick = (term) => { setLocalValue(term); onSearchChange(term); saveHistory(term); setHistory(getHistory()); setFocused(false); };
  const handleClearHistory = (e) => { e.stopPropagation(); clearHistory(); setHistory([]); };

  const set = useCallback((key) => (val) => onFiltersChange({ ...filters, [key]: val }), [filters, onFiltersChange]);
  const handleArsenChange = useCallback((val) => onFiltersChange({ ...filters, arsenId: val, groupId: "", squadronId: "" }), [filters, onFiltersChange]);
  const handleGroupChange = useCallback((val) => onFiltersChange({ ...filters, groupId: val, squadronId: "" }), [filters, onFiltersChange]);

  const activeCount = Object.entries(filters).filter(([, v]) => v !== "").length;
  const clearAll = useCallback(() => onFiltersChange(DEFAULT_FILTERS), [onFiltersChange]);
  const clearSingle = useCallback((key) => onFiltersChange({ ...filters, [key]: "" }), [filters, onFiltersChange]);

  const groupsForArsen = metadata?.groups?.filter((g) => !filters.arsenId || g.arsen_id === Number(filters.arsenId)) ?? [];
  const squadronsForGroup = metadata?.squadrons?.filter((s) => !filters.groupId || s.group_id === Number(filters.groupId)) ?? [];

  const showDropdown = focused && history.length > 0 && !localValue;

  const chipMap = [
    { key: "arsenId", label: "ARSEN", display: metadata?.arsens?.find(a => String(a.id) === filters.arsenId)?.name ?? filters.arsenId },
    { key: "groupId", label: "Group", display: metadata?.groups?.find(g => String(g.id) === filters.groupId)?.name ?? filters.groupId },
    { key: "squadronId", label: "Squadron", display: metadata?.squadrons?.find(s => String(s.id) === filters.squadronId)?.name ?? filters.squadronId },
    { key: "rank", label: "Rank" },
    { key: "specialization", label: "Spec" },
    { key: "reserveStatus", label: "Reserve" },
    { key: "category", label: "Category" },
    { key: "sourceOfCommission", label: "Source" },
    { key: "bloodType", label: "Blood" },
    { key: "sex", label: "Sex" },
    { key: "civilStatus", label: "Civil" },
    { key: "status", label: "Status", display: STATUS_OPTIONS.find(s => s.value === filters.status)?.label ?? filters.status },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {/* Single row: search input + filter toggle + result count */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 min-w-0">
          <div className={cn(
            "relative flex items-center rounded-lg border transition-all duration-200",
            "bg-white dark:bg-neutral-900",
            focused
              ? "border-indigo-400 dark:border-indigo-500/50 ring-2 ring-indigo-500/20"
              : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
          )}>
            <Search size={14} className={cn("absolute left-3 transition-colors pointer-events-none", focused ? "text-indigo-500" : "text-neutral-400 dark:text-neutral-500")} />
            <input
              ref={inputRef}
              type="text"
              value={localValue}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="Search name, serial no., rank, squadron…"
              className="w-full rounded-lg border-0 bg-transparent py-2 pl-9 pr-16 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none"
            />
            <div className="absolute right-1.5 flex items-center gap-0.5">
              {localValue && (
                <button onClick={handleClear} className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <X size={13} />
                </button>
              )}
              {!focused && !localValue && (
                <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                  <Command size={9} />K
                </kbd>
              )}
            </div>
          </div>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Recent</span>
                <button onClick={handleClearHistory} className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors">Clear</button>
              </div>
              <div className="max-h-40 overflow-y-auto py-0.5">
                {history.map((term, i) => (
                  <button key={`${term}-${i}`} onMouseDown={(e) => e.preventDefault()} onClick={() => handleHistoryClick(term)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-600 dark:text-neutral-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    <Clock size={11} className="shrink-0 text-neutral-400" />
                    <span className="truncate">{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all duration-150 shrink-0",
            "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900",
            filtersOpen
              ? "border-indigo-300 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          )}
        >
          <SlidersHorizontal size={12} />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          {filtersOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {activeCount > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/30 transition-all shrink-0">
            <RotateCcw size={10} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        {metaLoading && <Loader size={12} className="animate-spin text-neutral-400 dark:text-neutral-500 shrink-0" />}

        <p className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0 whitespace-nowrap">
          {filteredDataLength(resultCount)}
        </p>
      </div>

      {/* Expanded filter grid */}
      {filtersOpen && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-2.5">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            <FilterSelect value={filters.arsenId} onChange={handleArsenChange} options={metadata?.arsens?.map(a => ({ value: String(a.id), label: a.name })) ?? []} placeholder="All ARSENs" />
            <FilterSelect value={filters.groupId} onChange={handleGroupChange} options={groupsForArsen.map(g => ({ value: String(g.id), label: g.name }))} placeholder="All Groups" />
            <FilterSelect value={filters.squadronId} onChange={set("squadronId")} options={squadronsForGroup.map(s => ({ value: String(s.id), label: s.name }))} placeholder="All Squadrons" />
            <FilterSelect value={filters.rank} onChange={set("rank")} options={metadata?.ranks ?? []} placeholder="All Ranks" />
            <FilterSelect value={filters.specialization} onChange={set("specialization")} options={metadata?.specializations ?? []} placeholder="All Specializations" />
            <FilterSelect value={filters.reserveStatus} onChange={set("reserveStatus")} options={metadata?.reserveStatuses ?? []} placeholder="All Reserve Statuses" />
            <FilterSelect value={filters.status} onChange={set("status")} options={STATUS_OPTIONS} placeholder="Active Status" />
            <FilterSelect value={filters.category} onChange={set("category")} options={metadata?.categories ?? []} placeholder="All Categories" />
            <FilterSelect value={filters.sourceOfCommission} onChange={set("sourceOfCommission")} options={metadata?.sourcesOfCommission ?? []} placeholder="All Sources" />
            <FilterSelect value={filters.bloodType} onChange={set("bloodType")} options={metadata?.bloodTypes ?? []} placeholder="All Blood Types" />
            <FilterSelect value={filters.sex} onChange={set("sex")} options={metadata?.sexes ?? []} placeholder="All Sex" />
            <FilterSelect value={filters.civilStatus} onChange={set("civilStatus")} options={metadata?.civilStatuses ?? []} placeholder="All Civil Statuses" />
          </div>
        </div>
      )}

      {/* Active chips when collapsed */}
      {!filtersOpen && activeCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {chipMap.map(({ key, label, display }) => {
            const val = filters[key];
            if (!val) return null;
            return (
              <span key={key} className="flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                <span className="text-indigo-400 dark:text-indigo-500 text-[9px] font-semibold uppercase">{label}</span>
                {display ?? val}
                <button onClick={() => clearSingle(key)} className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors">
                  <X size={9} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function filteredDataLength(count) {
  return `${count} result${count !== 1 ? "s" : ""}`;
}
