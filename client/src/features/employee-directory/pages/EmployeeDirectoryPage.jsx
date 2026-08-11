import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users as UsersIcon, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEmployeeDirectory } from "../hooks/useEmployeeDirectory";
import EmployeeCard from "../components/EmployeeCard";
import EmployeeProfileDrawer from "../components/EmployeeProfileDrawer";
import { getDepartments } from "@/services/api";

export default function EmployeeDirectoryPage() {
  const navigate = useNavigate();
  const {
    employees,
    totalPages,
    page,
    setPage,
    loading,
    error,
    search,
    changeSearch,
    departmentId,
    changeDepartment,
  } = useEmployeeDirectory({ limit: 24 });

  const [selected, setSelected] = useState(null);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    let active = true;
    getDepartments({ limit: 200 })
      .then((res) => {
        if (active) setDepartments(Array.isArray(res.data?.data?.rows) ? res.data.data.rows : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleMessage = useCallback(
    (employee) => {
      setSelected(null);
      navigate(`/messaging?to=${employee.id}`);
    },
    [navigate]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <UsersIcon size={20} className="text-neutral-400" />
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">People</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Search and connect with people across the organization
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by name, email, or employee ID"
            className="w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <select
          value={departmentId}
          onChange={(e) => changeDepartment(e.target.value)}
          className="rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {loading && employees.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-500 text-sm">
          <Loader2 size={18} className="animate-spin mr-2" />
          Loading people...
        </div>
      ) : !loading && employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersIcon size={32} className="text-neutral-300 dark:text-neutral-600 mb-2" />
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">No people found</p>
          <p className="text-xs text-neutral-400">Try a different name or department.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {employees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onView={setSelected}
              onMessage={handleMessage}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-xs text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      <EmployeeProfileDrawer
        employee={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onMessage={handleMessage}
      />
    </div>
  );
}
