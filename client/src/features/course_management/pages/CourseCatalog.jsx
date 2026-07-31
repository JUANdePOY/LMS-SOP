import { useState } from "react";
import { useCourseList } from "../hooks/useCourseList";
import { useCourseFilters } from "../hooks/useCourseFilters";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Search, Plus, Users, BookOpen, GraduationCap, Award } from "lucide-react";
import CourseTable from "../components/tables/CourseTable";
import CreateCourseModal from "../components/modals/CreateCourseModal";
import { useCreateCourse } from "../hooks/useCreateCourse";

export default function CourseCatalog() {
  const { data, loading, error, refetch } = useCourseList({ status: "published" });
  const { filters, updateFilter, resetFilters } = useCourseFilters();
  const { create, loading: createLoading } = useCreateCourse();
  const [open, setOpen] = useState(false);

  const handleCreate = async (values) => {
    await create(values);
    refetch();
    setOpen(false);
  };

  const filtered = (data ?? []).filter((c) => {
    if (filters.search && !c.title?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.category && c.category !== filters.category) return false;
    if (filters.difficulty && c.difficulty !== filters.difficulty) return false;
    return true;
  });

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 p-5 sm:p-6 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Course Catalog</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Browse and manage published courses</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => setOpen(true)} className="shadow-sm hover:shadow-md transition-all">
              <Plus size={16} className="mr-2" />
              Create Course
            </Button>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          placeholder="Search courses..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-full pl-9 sm:pl-10 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 transition-all"
        />
      </div>

      {loading && <p className="text-sm text-neutral-500">Loading courses...</p>}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">Failed to load courses</p>
          <p className="text-red-600 mt-1">{error}</p>
          <button onClick={refetch} className="mt-2 rounded-lg px-3 py-1.5 text-sm bg-red-600 text-white">Retry</button>
        </div>
      )}
      {!loading && !error && <CourseTable courses={filtered} />}
      <CreateCourseModal open={open} onClose={() => setOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}
