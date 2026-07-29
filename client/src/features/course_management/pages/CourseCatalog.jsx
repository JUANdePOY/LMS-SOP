import { useState } from "react";
import { useCourseList } from "../hooks/useCourseList";
import { useCourseFilters } from "../hooks/useCourseFilters";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Course Catalog</h1>
        <button onClick={() => setOpen(true)} className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white">Create Course</button>
      </div>
      <div className="flex gap-2">
        <input placeholder="Search courses..." value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm flex-1" />
        <button onClick={resetFilters} className="rounded-lg px-3 py-2 text-sm border border-[var(--border)]">Reset</button>
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
