import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, Check, UserPlus, Users, Loader2, AlertCircle, BadgeCheck, X, ChevronDown, UserMinus, ArrowRight } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { getUsers } from "@/features/organization-management/api/users.api";
import { getDepartments } from "@/features/organization-management/api/department.api";
import { getEnrollments, unenrollStudent } from "@/features/course_management/api/enrollment.api";
import { assignEmployees, assignDepartment } from "@/features/course_management/library/services/library.api";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  department_head: "Dept Head",
  employee: "Employee",
};

const ROLE_COLORS = {
  super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  admin: "bg-danger-soft text-rose-700 dark:bg-rose-900/30 dark:text-[var(--color-danger)]",
  department_head: "bg-warning-soft text-warning dark:bg-warning-soft dark:text-[var(--color-warning)]",
  employee: "bg-blue-100 text-[var(--color-primary-hover)] dark:bg-blue-900/30 dark:text-[var(--color-primary)]",
};

const AVATAR_COLORS = [
  "bg-blue-100 text-[var(--color-primary-hover)] dark:bg-blue-900/40 dark:text-[var(--color-primary)]",
  "bg-success-soft text-[var(--color-success)] dark:bg-emerald-900/40 dark:text-[var(--color-success)]",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-warning-soft text-[var(--color-warning)] dark:bg-amber-900/40 dark:text-[var(--color-warning)]",
  "bg-danger-soft text-rose-700 dark:bg-rose-900/40 dark:text-[var(--color-danger)]",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-[var(--color-secondary)]",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
];

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < (name || "?").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function UserRow({ user, checked, enrolled, onToggle, index }) {
  const name = user.full_name || user.name || "Unnamed";
  const avatarColor = getAvatarColor(name);
  const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.employee;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`
        group relative flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200
        hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40
        ${checked
          ? "border-[var(--color-primary)] bg-[rgba(242,92,5,0.08)]/70 dark:border-[var(--color-primary)] dark:bg-blue-900/20 shadow-sm"
          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
        }
      `}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <span
        className={`
          flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200
          ${checked
            ? "border-[var(--color-primary)] bg-[rgba(242,92,5,0.08)]0 text-white scale-100"
            : "border-neutral-300 dark:border-neutral-600 group-hover:border-neutral-400 dark:group-hover:border-neutral-500 scale-100"
          }
        `}
        aria-hidden="true"
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${avatarColor}`}
      >
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{name}</span>
          {enrolled && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-success-soft px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-success)] dark:border-emerald-700 dark:bg-success-soft dark:text-[var(--color-success)]">
              <BadgeCheck size={10} /> Enrolled
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="truncate">{user.email}</span>
          {user.department_name && <span className="shrink-0 text-neutral-400 dark:text-neutral-500">·</span>}
          {user.department_name && <span className="shrink-0 truncate max-w-[120px]">{user.department_name}</span>}
          {user.role && (
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${roleColor}`}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
          )}
        </div>
      </div>
      {checked && (
        <div className="shrink-0 rounded-full bg-blue-100 p-1 text-[var(--color-primary)] dark:bg-blue-900/40 dark:text-[var(--color-primary)]">
          <Check size={14} strokeWidth={2.5} />
        </div>
      )}
    </button>
  );
}

export default function QuickAssignModal({ open, course, onClose, onAssigned, toast }) {
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState("");
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [enrolledMap, setEnrolledMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ added: 0, removed: 0 });
  const [error, setError] = useState(null);
  const [departmentAssigning, setDepartmentAssigning] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [isFilterFocused, setIsFilterFocused] = useState(false);
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);

  const loadUsers = useCallback(async (q, dept, r) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsers({
        query: q || undefined,
        department_id: dept || undefined,
        role: r || undefined,
        limit: 100,
        page: 1,
      });
      const rows = res.data?.data?.rows || res.data?.data || res.data?.rows || [];
      setUsers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setUsers([]);
      setError(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSuccess(false);
    setError(null);
    setQuery("");
    setDepartmentId("");
    setRole("");
    setSelectedDepartments([]);
    setSelected([]);
    setEnrolledMap({});
    setIsFilterFocused(false);

    let cancel = false;
    getDepartments({ limit: 200 })
      .then((res) => {
        if (cancel) return;
        const rows = res.data?.data?.rows || res.data?.data || res.data?.rows || [];
        setDepartments(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {});

    if (course?.id) {
      getEnrollments({ course_id: course.id, limit: 500 })
        .then((res) => {
          if (cancel) return;
          const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
          const map = {};
          const ids = [];
          rows.forEach((e) => {
            if (!e.user_id) return;
            map[String(e.user_id)] = {
              enrollmentId: e.id,
              full_name: e.user_name,
              email: e.user_email,
              department_name: e.department_name,
              role: e.role,
            };
            ids.push(String(e.user_id));
          });
          setEnrolledMap(map);
          setSelected(ids);
        })
        .catch(() => {});
    }

    loadUsers("", "", "");
    return () => {
      cancel = true;
    };
  }, [open, course?.id, loadUsers]);

  const onSearchChange = (value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelected((prev) => prev.filter((id) => enrolledIds.includes(String(id))));
      loadUsers(value, departmentId, role);
    }, 300);
  };

  const onFilterChange = (nextDept, nextRole) => {
    setDepartmentId(nextDept);
    setRole(nextRole);
    setSelected((prev) => prev.filter((id) => enrolledIds.includes(String(id))));
    loadUsers(query, nextDept, nextRole);
  };

  const clearFilters = () => {
    setQuery("");
    setDepartmentId("");
    setRole("");
    setSelected((prev) => prev.filter((id) => enrolledIds.includes(String(id))));
    loadUsers("", "", "");
    searchInputRef.current?.focus();
  };

  const hasActiveFilters = query || departmentId || role;

  const displayUsers = useMemo(() => {
    const map = new Map();
    users.forEach((u) => map.set(u.id, u));
    Object.keys(enrolledMap).forEach((uid) => {
      if (!map.has(Number(uid)) && !map.has(uid)) {
        const enrolledUser = enrolledMap[uid];
        map.set(uid, {
          id: uid,
          full_name: enrolledUser?.full_name,
          email: enrolledUser?.email || "",
          department_name: enrolledUser?.department_name,
          role: enrolledUser?.role,
        });
      }
    });
    return Array.from(map.values());
  }, [users, enrolledMap]);

  const enrolledIds = useMemo(() => Object.keys(enrolledMap).map((k) => String(k)), [enrolledMap]);

  const toggle = (id) => {
    const sid = String(id);
    setSelected((prev) =>
      prev.map(String).includes(sid) ? prev.filter((x) => String(x) !== sid) : [...prev, sid]
    );
  };

  const toEnroll = useMemo(
    () => selected.map(String).filter((id) => !enrolledIds.includes(id)),
    [selected, enrolledIds]
  );
  const toUnenroll = useMemo(
    () => enrolledIds.filter((id) => !selected.map(String).includes(id)),
    [enrolledIds, selected]
  );

  const allSelected = displayUsers.length > 0 && displayUsers.every((u) => selected.map(String).includes(String(u.id)));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !displayUsers.some((u) => String(u.id) === String(id))));
    } else {
      setSelected((prev) => Array.from(new Set([...prev.map(String), ...displayUsers.map((u) => String(u.id))])));
    }
  };

  const handleAssign = async () => {
    if (!course) return;
    setSubmitting(true);
    setError(null);
    try {
      let added = 0;
      let removed = 0;

      if (toEnroll.length > 0) {
        const res = await assignEmployees(course.id, toEnroll);
        added = res?.data?.ids?.length ?? res?.data?.imported ?? toEnroll.length;
      }
      if (toUnenroll.length > 0) {
        await Promise.all(
          toUnenroll.map((uid) => {
            const enrollmentData = enrolledMap[uid];
            const enrollmentId = enrollmentData?.enrollmentId;
            return enrollmentId ? unenrollStudent(enrollmentId) : Promise.resolve();
          })
        );
        removed = toUnenroll.length;
      }

      setSuccessInfo({ added, removed });
      setSuccess(true);
      const parts = [];
      if (added > 0) parts.push(`${added} assigned`);
      if (removed > 0) parts.push(`${removed} unenrolled`);
      const msg = parts.length ? parts.join(", ") : "No changes";
      if (toast) toast.success(msg);
      setTimeout(() => {
        onAssigned?.(added);
        onClose();
      }, 800);
    } catch (err) {
      setError(err.message || "Failed to update enrollments");
      if (toast) toast.error(err.message || "Failed to update enrollments");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignDepartment = async () => {
    if (!course || selectedDepartments.length === 0) return;
    setDepartmentAssigning(true);
    setError(null);
    try {
      const results = await Promise.all(
        selectedDepartments.map((deptId) => assignDepartment(course.id, deptId))
      );
      const totalImported = results.reduce((sum, res) => sum + (res?.data?.imported ?? 0), 0);
      const deptNames = selectedDepartments.map((id) => {
        const dept = departments.find((d) => String(d.id) === String(id));
        return dept?.name || id;
      }).join(", ");

      if (toast) toast.success(`${totalImported} employee(s) assigned from ${deptNames}`);
      setSuccessInfo({ added: totalImported, removed: 0 });
      setSuccess(true);
      setTimeout(() => {
        onAssigned?.(totalImported);
        onClose();
      }, 800);
    } catch (err) {
      setError(err.message || "Failed to assign department(s)");
      if (toast) toast.error(err.message || "Failed to assign department(s)");
    } finally {
      setDepartmentAssigning(false);
    }
  };

  const footer = success ? null : (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {toEnroll.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[var(--color-primary)] dark:text-[var(--color-primary)] font-medium">
              <ArrowRight size={12} />
              {toEnroll.length} to assign
            </span>
          )}
          {toEnroll.length > 0 && toUnenroll.length > 0 && (
            <span className="text-neutral-300 dark:text-neutral-600 mx-1">·</span>
          )}
          {toUnenroll.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[var(--color-warning)] dark:text-[var(--color-warning)] font-medium">
              <UserMinus size={12} />
              {toUnenroll.length} to unenroll
            </span>
          )}
          {toEnroll.length === 0 && toUnenroll.length === 0 && (
            <span className="text-neutral-400">No changes</span>
          )}
        </span>
        {(toEnroll.length > 0 || toUnenroll.length > 0) && (
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
            {selected.length} selected
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={submitting}
          className="h-8 px-3 text-xs"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleAssign}
          disabled={submitting || (toEnroll.length === 0 && toUnenroll.length === 0)}
          className="h-8 px-4 text-xs font-medium shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="mr-1.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <UserPlus size={14} className="mr-1.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={submitting ? () => {} : onClose} title="Manage Enrollments" size="lg" footer={footer}>
      {success ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-[var(--color-success)] dark:bg-success-soft dark:text-[var(--color-success)] animate-in fade-in zoom-in duration-300">
            <BadgeCheck size={32} />
          </div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Enrollments updated</p>
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {successInfo.added > 0 && `${successInfo.added} employee${successInfo.added === 1 ? "" : "s"} assigned`}
            {successInfo.added > 0 && successInfo.removed > 0 && " · "}
            {successInfo.removed > 0 && `${successInfo.removed} unenrolled`}
            {successInfo.added === 0 && successInfo.removed === 0 && "No changes made"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Managing enrollments for <span className="text-neutral-900 dark:text-neutral-100">{course?.title}</span>
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">
                Checked employees are enrolled. Uncheck to remove.
              </p>
            </div>
            {enrolledIds.length > 0 && (
              <span className="shrink-0 rounded-full border border-emerald-200 bg-success-soft px-2.5 py-1 text-xs font-medium text-[var(--color-success)] dark:border-emerald-700 dark:bg-success-soft dark:text-[var(--color-success)]">
                {enrolledIds.length} enrolled
              </span>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-neutral-50/80 to-neutral-100/50 dark:from-neutral-800/50 dark:to-neutral-800/30 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[var(--color-primary)] dark:bg-blue-900/30 dark:text-[var(--color-primary)]">
                  <Users size={16} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Assign entire departments</span>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Select one or more departments to enroll all active employees</p>
                </div>
              </div>

              {departments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {departments.map((dept) => {
                    const isSelected = selectedDepartments.some((id) => String(id) === String(dept.id));
                    return (
                      <label
                        key={dept.id}
                        className={`
                          flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-all
                          ${isSelected
                            ? "border-[var(--color-primary)] bg-[rgba(242,92,5,0.08)]/70 dark:border-[var(--color-primary)] dark:bg-blue-900/20"
                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments((prev) => [...prev, dept.id]);
                            } else {
                              setSelectedDepartments((prev) => prev.filter((id) => String(id) !== String(dept.id)));
                            }
                          }}
                          className="h-4 w-4 rounded border-neutral-300 text-[var(--color-primary)] focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate">{dept.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedDepartments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">Selected:</span>
                  {selectedDepartments.map((deptId) => {
                    const dept = departments.find((d) => String(d.id) === String(deptId));
                    if (!dept) return null;
                    return (
                      <span
                        key={deptId}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary-hover)] dark:bg-blue-900/30 dark:text-[var(--color-primary)]"
                      >
                        {dept.name}
                        <button
                          type="button"
                          onClick={() => setSelectedDepartments((prev) => prev.filter((id) => String(id) !== String(deptId)))}
                          className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-[var(--color-primary-active)]"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAssignDepartment}
                  disabled={departmentAssigning || selectedDepartments.length === 0}
                  className="h-9 px-4 text-xs font-medium"
                >
                  {departmentAssigning ? (
                    <>
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                      Assigning…
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} className="mr-1.5" />
                      Assign {selectedDepartments.length > 0 ? `(${selectedDepartments.length})` : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Filter Employees
              </label>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                >
                  <X size={12} />
                  Clear filters
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search by name or email…"
                  aria-label="Search employees"
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] outline-none transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="relative">
                <select
                  value={departmentId}
                  onChange={(e) => onFilterChange(e.target.value, role)}
                  aria-label="Filter by department"
                  className="appearance-none rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-3 pr-9 py-2 text-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] outline-none transition-all min-w-[150px]"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => onFilterChange(departmentId, e.target.value)}
                  aria-label="Filter by role"
                  className="appearance-none rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-3 pr-9 py-2 text-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] outline-none transition-all min-w-[140px]"
                >
                  <option value="">All Roles</option>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {displayUsers.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-neutral-50/80 dark:bg-neutral-800/50 px-3 py-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] dark:text-[var(--color-primary)] dark:hover:text-[var(--color-primary)] transition-colors"
              >
                {allSelected ? "Deselect all" : "Select all (visible)"}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">
                  {enrolledIds.length > 0 && `${enrolledIds.length} currently enrolled`}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {displayUsers.length} shown
                </span>
              </div>
            </div>
          )}

          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {loading && (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 px-3.5 py-3 animate-pulse"
                  >
                    <div className="h-5 w-5 rounded-md border-2 border-neutral-200 dark:border-neutral-700" />
                    <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-2.5 w-48 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && displayUsers.length === 0 && (
              <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                  <Users size={24} />
                </div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {error ? error : "No employees found"}
                </p>
                {!error && (
                  <p className="mt-1 text-xs text-neutral-400">
                    Try adjusting your filters or search query
                  </p>
                )}
              </div>
            )}

            {!loading && displayUsers.length > 0 && (
              <div className="space-y-1.5">
                {displayUsers.map((u, index) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    checked={selected.map(String).includes(String(u.id))}
                    enrolled={enrolledIds.includes(String(u.id))}
                    onToggle={() => toggle(u.id)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>

          {error && !loading && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {!loading && displayUsers.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-[rgba(242,92,5,0.08)]/50 dark:bg-blue-900/10 px-3 py-2 border border-blue-100 dark:border-blue-800/50">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-success-soft0" />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{enrolledIds.length}</span> enrolled
                  </span>
                </div>
                <div className="h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[rgba(242,92,5,0.08)]0" />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{toEnroll.length}</span> to assign
                  </span>
                </div>
                <div className="h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-warning-soft0" />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{toUnenroll.length}</span> to unenroll
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}