import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Grid, List, Search, Filter, SortAsc, SortDesc } from "lucide-react";
import { usePublishedCourses } from "../hooks/usePublishedCourses";
import CourseLibraryCard from "../components/CourseLibraryCard";
import CourseListRow from "../components/CourseListRow";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "all_levels"];
const DIFFICULTY_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All Levels",
};

export default function CourseLibraryPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  const queryParams = {
    search,
    difficulty,
    category,
    sort: sortField,
    order: sortDirection,
    status: "published",
    page: 1,
    limit: viewMode === "grid" ? 12 : 20,
  };

  const { courses, loading, error, pagination, refetch } = usePublishedCourses(queryParams);

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
    navigate(`/courses/library/${courseId}`);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    refetch({ ...queryParams, limit: mode === "grid" ? 12 : 20 });
  };

  const clearFilters = () => {
    setSearch("");
    setDifficulty("");
    setCategory("");
    setSortField("created_at");
    setSortDirection("desc");
  };

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Course Library</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Browse and assign published courses to employees</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-1">
              <button
                type="button"
                onClick={() => handleViewModeChange("grid")}
                className={`rounded p-1 text-xs ${viewMode === "grid" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-neutral-500 hover:text-neutral-700"}`}
                title="Grid view"
              >
                <Grid size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("list")}
                className={`rounded p-1 text-xs ${viewMode === "list" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-neutral-500 hover:text-neutral-700"}`}
                title="List view"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search courses..."
            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm focus:border-blue-500 dark:focus:border-blue-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm"
          >
            <option value="">All Difficulty Levels</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
            ))}
          </select>
          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm"
            >
              <option value="">All Course Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => handleSort("title")}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-300 dark:hover:border-neutral-600"
            title="Sort by title"
          >
            Title
            {sortField === "title" && (sortDirection === "asc" ? <SortAsc size={12} /> : <SortDesc size={12} />)}
          </button>
          {(search || difficulty || category) && (
            <button
              onClick={clearFilters}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700"
              title="Clear filters"
            >
              <Filter size={12} className="inline mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: viewMode === "grid" ? 12 : 6 }).map((_, i) => (
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
          <p className="font-medium text-red-800">Failed to load courses</p>
          <p className="text-red-600 mt-1">{error}</p>
          <button onClick={() => refetch(queryParams)} className="mt-2 rounded-lg px-3 py-1.5 text-sm bg-red-600 text-white">Retry</button>
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-4">
            <Search size={24} className="text-neutral-400" />
          </div>
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No published courses found</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {search || difficulty || category
              ? "Try adjusting your filters or clearing them to see all courses"
              : "No published courses are available yet"}
          </p>
          {(search || difficulty || category) && (
            <button onClick={clearFilters} className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-300">
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {courses.map((course) => (
                <CourseLibraryCard key={course.id} course={course} onClick={() => handleCourseClick(course.id)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <CourseListRow key={course.id} course={course} onClick={() => handleCourseClick(course.id)} />
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} courses
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => refetch({ ...queryParams, page: pagination.page - 1 })}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs hover:border-neutral-300 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-neutral-600 dark:text-neutral-300 px-2">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => refetch({ ...queryParams, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs hover:border-neutral-300 disabled:opacity-50"
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
