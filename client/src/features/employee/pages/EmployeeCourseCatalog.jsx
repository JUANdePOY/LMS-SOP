import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Grid, List, Search, Filter, SortAsc, SortDesc, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import EmployeeCourseCard from "../components/EmployeeCourseCard";
import FilterSidebar from "@/features/course_management/library/components/FilterSidebar";
import { useEmployeeCourseCatalog } from "../hooks/useEmployeeDashboard";
import { StaggerList, MotionItem } from "@/shared/motion";

const ALL_DIFFICULTIES = ["beginner", "intermediate", "advanced", "all_levels"];
const DIFFICULTY_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All Levels",
};

const SORT_OPTIONS = [
  { value: "created_at", label: "Recently Added" },
  { value: "title", label: "Title" },
  { value: "enrollment_count", label: "Most Enrolled" },
];

function readParam(params, key, fallback = "") {
  return params.get(key) || fallback;
}

function FilterChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2.5 py-1 text-neutral-600 dark:text-neutral-300">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100"
      >
        <X size={12} />
      </button>
    </span>
  );
}

export default function EmployeeCourseCatalog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = readParam(searchParams, "search");
  const initialDifficulties = readParam(searchParams, "difficulty")
    ? readParam(searchParams, "difficulty").split(",").map((s) => s.trim()).filter((s) => ALL_DIFFICULTIES.includes(s))
    : [];
  const initialCategories = readParam(searchParams, "category")
    ? readParam(searchParams, "category").split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const initialSort = readParam(searchParams, "sort", "created_at");
  const initialOrder = readParam(searchParams, "order", "desc");

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [selectedDifficulties, setSelectedDifficulties] = useState(initialDifficulties);
  const [selectedCategories, setSelectedCategories] = useState(initialCategories);
  const [categories, setCategories] = useState([]);
  const [sortField, setSortField] = useState(initialSort);
  const [sortDirection, setSortDirection] = useState(initialOrder);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  const debounceRef = useRef(null);

  const queryParams = {
    search,
    difficulty: selectedDifficulties.join(","),
    category: selectedCategories.join(","),
    sort: sortField,
    order: sortDirection,
    status: "published",
    page: 1,
    limit: viewMode === "grid" ? 12 : 20,
  };

  const { courses, loading, error, pagination, refetch } = useEmployeeCourseCatalog(queryParams);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    if (courses.length > 0) {
      const uniqueCats = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
      setCategories((prev) => Array.from(new Set([...prev, ...uniqueCats])).sort());
    }
  }, [courses]);

  const syncUrl = useCallback((next) => {
    const params = new URLSearchParams();
    const {
      search = "",
      difficulties = [],
      cats = [],
      sort = "created_at",
      order = "desc",
    } = next;
    if (search) params.set("search", search);
    if (difficulties.length) params.set("difficulty", difficulties.join(","));
    if (cats.length) params.set("category", cats.join(","));
    if (sort !== "created_at") params.set("sort", sort);
    if (order !== "desc") params.set("order", order);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    syncUrl({
      search,
      difficulties: selectedDifficulties,
      cats: selectedCategories,
      sort: sortField,
      order: sortDirection,
    });
  }, [search, selectedDifficulties, selectedCategories, sortField, sortDirection, syncUrl]);

  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const toggleDifficulty = (value) => {
    setSelectedDifficulties((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  const toggleCategory = (value) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const handleCourseClick = (courseId) => {
    navigate(`/my-learning/course/${courseId}`);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSelectedDifficulties([]);
    setSelectedCategories([]);
    setSortField("created_at");
    setSortDirection("desc");
  };

  const hasActiveFilters = Boolean(
    search || selectedDifficulties.length || selectedCategories.length
  );

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">My Courses</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              View your assigned courses and track your progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn("rounded p-1 text-xs", viewMode === "grid" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-neutral-500 hover:text-neutral-700")}
                title="Grid view"
              >
                <Grid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn("rounded p-1 text-xs", viewMode === "list" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-neutral-500 hover:text-neutral-700")}
                title="List view"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-[var(--page-sticky-top)] z-20 -mx-1 rounded-xl border border-neutral-200/70 dark:border-neutral-700/70 bg-white/85 dark:bg-neutral-900/85 px-3 py-2.5 shadow-sm backdrop-blur sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search your courses..."
              aria-label="Search courses"
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortField}
              onChange={(e) => handleSort(e.target.value)}
              aria-label="Sort courses"
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              aria-label={`Toggle sort direction (currently ${sortDirection === "asc" ? "ascending" : "descending"})`}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-300 dark:hover:border-neutral-600"
              title="Toggle sort direction"
            >
              {sortDirection === "asc" ? <SortAsc size={12} /> : <SortDesc size={12} />}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700"
                title="Clear filters"
              >
                <Filter size={12} className="inline mr-1" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-pressed={sidebarOpen}
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                sidebarOpen || hasActiveFilters
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300"
                  : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 hover:text-neutral-800"
              )}
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        <div className="min-w-0 flex-1 space-y-6">
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2" aria-live="polite">
              <span className="font-medium text-neutral-500 dark:text-neutral-400">Active filters:</span>
              {search && (
                <FilterChip label={`Search: "${search}"`} onClear={() => setSearchInput("")} />
              )}
              {selectedDifficulties.map((d) => (
                <FilterChip
                  key={d}
                  label={`Difficulty: ${DIFFICULTY_LABELS[d] || d}`}
                  onClear={() => toggleDifficulty(d)}
                />
              ))}
              {selectedCategories.map((c) => (
                <FilterChip key={c} label={`Category: ${c}`} onClear={() => toggleCategory(c)} />
              ))}
            </div>
          )}

          {loading && (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 animate-pulse h-48">
                  <div className="h-24 bg-neutral-200 dark:bg-neutral-700 rounded-t-xl" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
              <p className="font-medium text-red-800 dark:text-red-300">Failed to load courses</p>
              <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
              <button onClick={() => refetch(queryParams)} className="mt-2 rounded-lg px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 transition-colors">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && courses.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                <Search size={24} className="text-neutral-400" />
              </div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No courses found</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {hasActiveFilters ? "Try adjusting your filters or clearing them to see all courses" : "Check back later for new courses"}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-300">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && courses.length > 0 && (
            <>
              <p className="text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
                {pagination.total} {pagination.total === 1 ? "course" : "courses"} found
              </p>
              <StaggerList className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
                {courses.map((course) => (
                  <MotionItem key={course.id}>
                    <EmployeeCourseCard
                      course={course}
                      onClick={() => handleCourseClick(course.id)}
                    />
                  </MotionItem>
                ))}
              </StaggerList>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} courses
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => refetch({ ...queryParams, page: pagination.page - 1 })}
                      disabled={pagination.page <= 1}
                      className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs hover:border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 px-2">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => refetch({ ...queryParams, page: pagination.page + 1 })}
                      disabled={pagination.page >= pagination.totalPages}
                      className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs hover:border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {sidebarOpen && (
          <FilterSidebar
            open
            onClose={() => setSidebarOpen(false)}
            categories={categories}
            selectedDifficulties={selectedDifficulties}
            selectedCategories={selectedCategories}
            sortField={sortField}
            sortDirection={sortDirection}
            onToggleDifficulty={toggleDifficulty}
            onToggleCategory={toggleCategory}
            onSortChange={(f) => handleSort(f)}
            onToggleDirection={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </div>
    </div>
  );
}
