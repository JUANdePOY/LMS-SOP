import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, SortAsc, SortDesc } from "lucide-react";
import { cn } from "@/lib/utils";
import EmployeeCourseCard from "../components/EmployeeCourseCard";
import { useEmployeeCourseCatalog } from "../hooks/useEmployeeDashboard";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "all_levels"];
const DIFFICULTY_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All Levels",
};

export default function EmployeeCourseCatalog() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = {
    search,
    difficulty,
    category,
    sort: sortField,
    order: sortDirection,
    status: "published",
    page: 1,
    limit: 20,
  };

  const { courses, loading, error, pagination, refetch } = useEmployeeCourseCatalog(queryParams);

  useEffect(() => {
    if (courses.length > 0) {
      const uniqueCats = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
      setCategories((prev) => Array.from(new Set([...prev, ...uniqueCats])).sort());
    }
  }, [courses]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleCourseClick = (courseId) => {
    navigate(`/my-learning/course/${courseId}`);
  };

  const clearFilters = () => {
    setSearch("");
    setDifficulty("");
    setCategory("");
    setSortField("created_at");
    setSortDirection("desc");
  };

  const activeFilters = search || difficulty || category;

  return (
    <div className="w-full max-w-none mx-auto max-w-6xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-neutral-900 dark:via-blue-900/20 dark:to-indigo-950 shadow-sm">
        <div className="absolute -top-4 -right-4 h-48 w-48 rounded-full bg-gradient-to-br from-blue-300/20 to-purple-300/20 dark:from-blue-500/5 dark:to-purple-500/5 blur-3xl" />
        <div className="absolute -bottom-4 -left-4 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-300/20 to-sky-300/20 dark:from-indigo-500/5 dark:to-sky-500/5 blur-3xl" />
        <div className="absolute inset-0 bg-grid-white/10 dark:bg-grid-neutral-800/20 [mask-image:radial-gradient(white,transparent_85%)]" />

        <div className="relative px-5 sm:px-6 py-6">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Assigned Courses</h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            View your assigned courses and track your progress
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={handleSearchChange}
                placeholder="Search your courses..."
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                showFilters || activeFilters
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              )}
            >
              <Filter size={14} />
              Filters
              {activeFilters && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-medium text-white">
                  {(search ? 1 : 0) + (difficulty ? 1 : 0) + (category ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {(showFilters || activeFilters) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
              >
                <option value="">All Levels</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                ))}
              </select>
              {categories.length > 0 && (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => handleSort("created_at")}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-300 dark:hover:border-neutral-600"
              >
                Newest
                {sortField === "created_at" && (sortDirection === "asc" ? <SortAsc size={12} /> : <SortDesc size={12} />)}
              </button>
              {activeFilters && (
                <button
                  onClick={clearFilters}
                  className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load courses</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
          <button onClick={() => refetch(queryParams)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">
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
            {activeFilters ? "Try adjusting your filters" : "Check back later for new courses"}
          </p>
          {activeFilters && (
            <button onClick={clearFilters} className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-300">
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {courses.map((course) => (
              <EmployeeCourseCard
                key={course.id}
                course={course}
                onClick={() => handleCourseClick(course.id)}
              />
            ))}
          </div>

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
  );
}
