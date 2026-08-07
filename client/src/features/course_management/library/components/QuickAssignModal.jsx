import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, Check, UserPlus, Users, Loader2, AlertCircle, BadgeCheck } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { getUsers } from "@/features/organization-management/api/users.api";
import { getDepartments } from "@/features/organization-management/api/department.api";
import { getEnrollments, unenrollStudent } from "@/features/course_management/api/enrollment.api";
import { assignEmployees } from "@/features/course_management/library/services/library.api";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  department_head: "Dept Head",
  employee: "Employee",
};

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

function UserRow({ user, checked, enrolled, onToggle }) {
  const name = user.full_name || user.name || "Unnamed";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
        checked
          ? "border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-900/20"
          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
          checked
            ? "border-blue-500 bg-blue-500 text-white"
            : "border-neutral-300 dark:border-neutral-600"
        }`}
        aria-hidden="true"
      >
        {checked && <Check size={12} />}
      </span>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      >
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{name}</span>
          {enrolled && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <BadgeCheck size={11} /> Enrolled
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="truncate">{user.email}</span>
          {user.department_name && <span className="shrink-0">· {user.department_name}</span>}
          {user.role && (
            <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] dark:bg-neutral-800">
              {ROLE_LABELS[user.role] || user.role}
            </span>
          )}
        </div>
      </div>
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
  const debounceRef = useRef(null);

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
    setSelected([]);
    setEnrolledMap({});

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
          const rows = res.data || [];
          const map = {};
          const ids = [];
          rows.forEach((e) => {
            if (!e.user_id) return;
            map[e.user_id] = e.id;
            ids.push(e.user_id);
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
      loadUsers(value, departmentId, role);
    }, 300);
  };

  const onFilterChange = (nextDept, nextRole) => {
    setDepartmentId(nextDept);
    setRole(nextRole);
    loadUsers(query, nextDept, nextRole);
  };

  const displayUsers = useMemo(() => {
    const map = new Map();
    users.forEach((u) => map.set(u.id, u));
    Object.keys(enrolledMap).forEach((uid) => {
      if (!map.has(Number(uid)) && !map.has(uid)) {
        map.set(uid, {
          id: uid,
          full_name: undefined,
          email: "",
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
        added = res?.data?.imported ?? toEnroll.length;
      }
      if (toUnenroll.length > 0) {
        await Promise.all(
          toUnenroll.map((uid) => {
            const enrollmentId = enrolledMap[uid];
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

  const footer = success ? null : (
    <div className="flex w-full items-center justify-between gap-3">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        {toEnroll.length > 0 && `${toEnroll.length} to assign`}
        {toEnroll.length > 0 && toUnenroll.length > 0 && " · "}
        {toUnenroll.length > 0 && `${toUnenroll.length} to unenroll`}
        {toEnroll.length === 0 && toUnenroll.length === 0 && "No changes"}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleAssign} disabled={submitting || (toEnroll.length === 0 && toUnenroll.length === 0)}>
          {submitting ? (
            <>
              <Loader2 size={14} className="mr-1.5 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <UserPlus size={14} className="mr-1.5" /> Save Changes
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
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            <BadgeCheck size={28} />
          </div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Enrollments updated</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {successInfo.added > 0 && `${successInfo.added} employee${successInfo.added === 1 ? "" : "s"} assigned`}
            {successInfo.added > 0 && successInfo.removed > 0 && " · "}
            {successInfo.removed > 0 && `${successInfo.removed} unenrolled`}
            {successInfo.added === 0 && successInfo.removed === 0 && "No changes made"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Managing enrollments for{" "}
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{course?.title}</span>
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">
              Checked employees are enrolled. Uncheck an enrolled employee to remove them.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name or email…"
                aria-label="Search employees"
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <select
              value={departmentId}
              onChange={(e) => onFilterChange(e.target.value, role)}
              aria-label="Filter by department"
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:border-blue-500 outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={role}
              onChange={(e) => onFilterChange(departmentId, e.target.value)}
              aria-label="Filter by role"
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:border-blue-500 outline-none"
            >
              <option value="">All Roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {displayUsers.length > 0 && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {allSelected ? "Deselect all" : "Select all (visible)"}
              </button>
              <span className="text-xs text-neutral-400">
                {enrolledIds.length > 0 && `${enrolledIds.length} currently enrolled`}
              </span>
            </div>
          )}

          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {loading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 animate-pulse">
                    <div className="h-5 w-5 rounded border-neutral-200 dark:border-neutral-700" />
                    <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-2.5 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                  </div>
                ))}
              </>
            )}

            {!loading && displayUsers.length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 py-8 text-center">
                <Users size={22} className="mx-auto mb-2 text-neutral-400" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {error ? error : "No employees found"}
                </p>
              </div>
            )}

            {displayUsers.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                checked={selected.map(String).includes(String(u.id))}
                enrolled={enrolledIds.includes(String(u.id))}
                onToggle={() => toggle(u.id)}
              />
            ))}
          </div>

          {error && !loading && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
