import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  builderList, builderDelete, publishCourse, archiveCourse,
} from "@/features/course_management/api/course.api";
import CreateCourseModal from "@/features/course_management/components/modals/CreateCourseModal";
import { useToast } from "@/shared/components/ui/Toast";
import { StaggerList, MotionItem } from "@/shared/motion";
import { resolveFileUrl } from "@/lib/fileUrl";

const STATUS_META = {
  published: {
    label: "Published",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  draft: {
    label: "Draft",
    chip: "bg-neutral-100 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-200 border-neutral-200 dark:border-neutral-500/30",
    dot: "bg-neutral-400",
  },
  archived: {
    label: "Archived",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500",
  },
  under_review: {
    label: "Under Review",
    chip: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100 border-blue-200 dark:border-blue-500/30",
    dot: "bg-blue-500",
  },
};

const DIFFICULTY_META = {
  beginner: { label: "Beginner", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30" },
  intermediate: { label: "Intermediate", color: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30" },
  advanced: { label: "Advanced", color: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-100 border-rose-200 dark:border-rose-500/30" },
  all_levels: { label: "All Levels", color: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100 border-sky-200 dark:border-sky-500/30" },
};

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "all_levels"];

export default function Courses({ departments = [] }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({ search: "", status: "", difficulty: "", category: "" });
  const [sort, setSort] = useState({ field: "created_at", direction: "desc" });
  const [page, setPage] = useState({ current: 1, size: 10 });

  const [modals, setModals] = useState({ add: false, edit: false });
  const [editingCourse, setEditingCourse] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState(null);

  const apiParams = useCallback(() => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.category) params.category = filters.category;
    params.page = page.current;
    params.limit = page.size;
    params.sort = sort.field;
    params.order = sort.direction;
    return params;
  }, [filters, page, sort]);

  const computeStatus = (course) => {
    if (course.status === "archived") return "archived";
    if (course.status === "draft") return "draft";
    if (course.status === "under_review") return "under_review";
    return "published";
  };

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await builderList(apiParams());
      if (res?.success) {
        const data = Array.isArray(res.data) ? res.data : (res.data?.rows || []);
        setCourses(data);
        const uniqueCats = Array.from(new Set(data.map((c) => c.category).filter(Boolean)));
        setCategories((prev) => Array.from(new Set([...prev, ...uniqueCats])).sort());
      }
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [apiParams, toast]);

  const refreshStats = useCallback(async () => {
    try {
      const [publishedRes, totalRes] = await Promise.all([
        builderList({ status: "published", limit: 1 }),
        builderList({ limit: 1 }),
      ]);
      const total = totalRes.pagination?.total || 0;
      const published = publishedRes.pagination?.total || 0;
      setStats({
        total,
        published,
        draft: Math.max(0, total - published),
        enrolled: courses.reduce((sum, c) => sum + (c.enrollment_count || c.enrollments_count || 0), 0),
      });
    } catch {
      // ignore
    }
  }, [courses]);

  useEffect(() => {
    const timer = setTimeout(() => setPage((p) => ({ ...p, current: 1 })), filters.search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => { refreshStats(); }, [refreshStats]);

  const openAdd = () => {
    setModals((m) => ({ ...m, add: true }));
  };

  const openEdit = (course) => {
    setEditingCourse(course);
    setModals((m) => ({ ...m, edit: true }));
  };

  const openBuilder = (course) => {
    navigate(`/courses/${course.id}/builder`);
  };

  const openDelete = (course) => {
    setDeletingCourse(course);
    setModals((m) => ({ ...m, delete: true }));
  };

  const closeModals = () => {
    setModals({ add: false, edit: false });
    setEditingCourse(null);
    setDeletingCourse(null);
  };

  const handleEditSuccess = () => {
    fetchCourses();
  };

  const handleCreateSuccess = () => {
    setPage((p) => ({ ...p, current: 1 }));
    fetchCourses();
    refreshStats();
  };

  const handleDelete = async () => {
    if (!deletingCourse) return;
    setSaving(true);
    try {
      const res = await builderDelete(deletingCourse.id);
      if (res?.success) {
        toast.success("Course deleted successfully");
        closeModals();
        await fetchCourses();
      } else {
        throw new Error(res.data?.message || "Failed to delete course");
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to delete course";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAction = async (course, action) => {
    try {
      if (action === "publish") {
        const res = await publishCourse(course.id);
        if (res?.success) toast.success("Course published");
      } else if (action === "archive") {
        const res = await archiveCourse(course.id);
        if (res?.success) toast.success("Course archived");
      }
      await fetchCourses();
    } catch {
      toast.error("Action failed");
    }
  };

  const updateField = (field, value) => {
    setInitialData((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleSort = (field) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredCourses = courses.filter((c) => {
    const term = (filters.search || "").toLowerCase();
    if (term) {
      const haystack = `${c.title || ""} ${c.description || ""} ${c.category || ""} ${String(c.id || "")}`;
      if (!haystack.toLowerCase().includes(term)) return false;
    }
    if (filters.status && computeStatus(c) !== filters.status) return false;
    if (filters.difficulty && c.difficulty !== filters.difficulty) return false;
    if (filters.category && c.category !== filters.category) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / page.size));
  const safePage = Math.min(page.current, totalPages);
  const startIdx = filteredCourses.length === 0 ? 0 : (safePage - 1) * page.size + 1;
  const endIdx = Math.min(safePage * page.size, filteredCourses.length);
  const pagedCourses = filteredCourses.slice((safePage - 1) * page.size, safePage * page.size);

  if (loading && courses.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Courses</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Design learning experiences and manage enrollment</p>
          </div>
          <button onClick={openAdd} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:shadow-md transition-all">
            + Add Course
          </button>
        </div>
      </div>

      {stats && (
        <StaggerList className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <MotionItem>
            <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-4 shadow-sm">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-neutral-500">Total Courses</p>
            </div>
          </MotionItem>
          <MotionItem>
            <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-4 shadow-sm">
              <p className="text-2xl font-bold">{stats.published}</p>
              <p className="text-xs text-neutral-500">Published</p>
            </div>
          </MotionItem>
          <MotionItem>
            <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-4 shadow-sm">
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-xs text-neutral-500">Draft</p>
            </div>
          </MotionItem>
          <MotionItem>
            <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-4 shadow-sm">
              <p className="text-2xl font-bold">{stats.enrolled || 0}</p>
              <p className="text-xs text-neutral-500">Enrollments</p>
            </div>
          </MotionItem>
        </StaggerList>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search courses..."
            className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters((prev) => ({ ...prev, difficulty: e.target.value }))}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            >
              <option value="">All Levels</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{DIFFICULTY_META[d]?.label || d}</option>
              ))}
            </select>
            {categories.length > 0 && (
              <select
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/80">
                <th className="px-3 py-3 w-10"></th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 hidden sm:table-cell">Thumbnail</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <button onClick={() => handleSort("title")} className="flex items-center gap-1">
                    Course Title {sort.field === "title" && <span>{sort.direction === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">Status</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 hidden md:table-cell">Category</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/80">
              {pagedCourses.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-4 py-20 text-center">
                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No courses found</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {filters.search || filters.status || filters.difficulty || filters.category
                        ? "Try adjusting your filters or clear them to see all courses"
                        : "Get started by creating your first course for learners"}
                    </p>
                    {!filters.search && !filters.status && !filters.difficulty && !filters.category && (
                      <button onClick={openAdd} className="mt-4 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:border-neutral-300">
                        + Create Course
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pagedCourses.map((c, idx) => {
                  const statusKey = computeStatus(c);
                  const status = STATUS_META[statusKey] || STATUS_META.draft;
                  const difficulty = DIFFICULTY_META[c.difficulty] || DIFFICULTY_META.beginner;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => openBuilder(c)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openBuilder(c);
                        }
                      }}
                      aria-label={`Open course ${c.title || "Untitled Course"}`}
                      className={`${idx % 2 === 0 ? "bg-white dark:bg-neutral-800" : "bg-neutral-50/30 dark:bg-neutral-800/50"} cursor-pointer transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500`}
                    >
                      <td className="px-3 py-3.5 w-10"></td>
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        {c.thumbnail_url ? (
                          <img src={resolveFileUrl(c.thumbnail_url)} alt={c.title} className="h-10 w-10 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-sm ring-1 ring-blue-400/30 shrink-0">
                            <span className="text-sm font-bold">📚</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-sm ring-1 ring-blue-400/30 shrink-0 sm:hidden">
                            <span className="text-sm font-bold">📚</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{c.title || "Untitled Course"}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[280px] mt-0.5">{c.description || "No description provided"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.chip}`}>
                          <span className={`h-2 w-2 rounded-full ${status.dot}`}></span>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300 hidden md:table-cell">
                        {c.category ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-700 px-2 py-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                            {c.category}
                          </span>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                          {c.status === "draft" && (
                            <button onClick={() => handleQuickAction(c, "publish")} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Publish">
                              🌐
                            </button>
                          )}
                           {c.status === "published" && (
                             <button onClick={() => handleQuickAction(c, "archive")} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-amber-600 hover:bg-amber-50 transition-all" title="Archive">
                               📦
                             </button>
                           )}
                           <button onClick={() => openEdit(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Edit">
                             ✏️
                           </button>
                           <button onClick={() => openBuilder(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Open Builder">
                             🛠️
                           </button>
                          <button onClick={() => openDelete(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredCourses.length > page.size && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Showing {startIdx}–{endIdx} of {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <select value={String(page.size)} onChange={(e) => setPage((p) => ({ ...p, size: Number(e.target.value), current: 1 }))} className="w-20 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-sm">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => ({ ...p, current: Math.max(1, p.current - 1) }))} disabled={safePage <= 1} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm hover:border-blue-300 hover:text-blue-700 transition-all disabled:opacity-50">
                  Previous
                </button>
                <span className="text-xs text-neutral-600 dark:text-neutral-300 min-w-[3rem] text-center font-medium">{safePage} / {totalPages}</span>
                <button onClick={() => setPage((p) => ({ ...p, current: Math.min(totalPages, p.current + 1) }))} disabled={safePage >= totalPages} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm hover:border-blue-300 hover:text-blue-700 transition-all disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateCourseModal
        open={modals.add}
        onClose={closeModals}
        loading={saving}
        onSuccess={handleCreateSuccess}
      />

      <CreateCourseModal
        open={modals.edit}
        onClose={closeModals}
        loading={saving}
        course={editingCourse}
        onSuccess={handleEditSuccess}
      />

      {modals.delete && deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Delete Course</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
               Are you sure you want to delete "{deletingCourse.title || "this course"}"? This will move the course and its modules to the trash.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeModals} className="rounded-lg px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 transition-all">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={saving} className="rounded-lg px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50">
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
