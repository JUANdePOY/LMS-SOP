import { useState, useMemo, useEffect } from "react";
import { useViolations } from "../hooks/useViolations";
import { getFlaggedAttempts, getViolationsByUser, getViolationsForUser } from "../api/attempt.api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Download, Filter, AlertTriangle, Search, ShieldAlert, ChevronRight } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { StaggerList, MotionItem, FadeIn } from "@/shared/motion";

const VIOLATION_TYPES = ["tab_switch", "copy_attempt", "screenshot_attempt", "right_click", "fullscreen_exit", "devtools_opened"];

const TYPE_SEVERITY = {
  devtools_opened: "high",
  screenshot_attempt: "high",
  copy_attempt: "medium",
  right_click: "low",
  fullscreen_exit: "medium",
  tab_switch: "medium",
};

const SEVERITY_STYLES = {
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  low: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
};

function formatMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return "—";
  const parts = [];
  if (metadata.awayAt) {
    const duration = metadata.backAfterMs ? `${Math.round(metadata.backAfterMs / 1000)}s` : "";
    parts.push(`Tab switch${duration ? ` (${duration})` : ""}`);
  }
  if (metadata.action) {
    const action = String(metadata.action).replace(/_/g, " ");
    parts.push(action.charAt(0).toUpperCase() + action.slice(1));
  }
  if (metadata.timestamp && !metadata.awayAt && !metadata.action) {
    parts.push("Timestamp recorded");
  }
  if (metadata.source) parts.push(`Source: ${metadata.source}`);
  if (metadata.element) parts.push(`Element: ${metadata.element}`);
  return parts.length ? parts.join("; ") : JSON.stringify(metadata);
}

function csvEscape(value) {
  const str = String(value === null || value === undefined ? "" : typeof value === "object" ? formatMetadata(value) : value);
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function downloadCsv(data, filename) {
  const headers = ["id", "timestamp", "student", "course", "quiz", "attempt", "type"];
  const rows = data.map((v) => [
    csvEscape(v.id),
    csvEscape(v.timestamp),
    csvEscape(v.user_name || v.user_email),
    csvEscape(v.course_title || ""),
    csvEscape(v.quiz_title || v.quiz_id),
    csvEscape(v.attempt_number),
    csvEscape(v.type),
  ]);
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function typeLabel(t) {
  if (!t) return "—";
  return t.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}

export default function ViolationDashboardPage() {
  const { isSuperAdmin } = useAuth();
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const { data: violations, error, refetch } = useViolations(filters);
  const [flagged, setFlagged] = useState([]);
  const [flaggedLoading, setFlaggedLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailViolations, setDetailViolations] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");

  const loadFlagged = async () => {
    setFlaggedLoading(true);
    try {
      const res = await getFlaggedAttempts({ min: 3 });
      setFlagged(res.data || []);
    } catch {
      setFlagged([]);
    } finally {
      setFlaggedLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await getViolationsByUser(filters);
      setUsers(res.data || []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const openDetailModal = async (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await getViolationsForUser(user.user_id, filters);
      setDetailViolations(res.data || []);
    } catch {
      setDetailViolations([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const onFilterChange = (field, value) => {
    setFilters((f) => ({ ...f, [field]: value || undefined }));
  };

  const apply = () => {
    refetch();
    loadUsers();
  };
  const clear = () => {
    setFilters({});
    refetch();
    loadUsers();
  };

  const filteredUsers = useMemo(() => {
    if (!logSearch.trim()) return users;
    const q = logSearch.toLowerCase();
    return users.filter((u) =>
      [u.user_name, u.user_email, u.user_id]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [users, logSearch]);

  if (!isSuperAdmin) return <Navigate to="/assessments" replace />;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Integrity Violations</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Monitor quiz integrity events and flagged attempts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-1" /> Filters
          </Button>
          <Button size="sm" variant="outline" onClick={loadFlagged} disabled={flaggedLoading}>
            <AlertTriangle className="h-4 w-4 mr-1" /> Flagged Attempts
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCsv(violations, "violations.csv")} disabled={!violations.length}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" placeholder="Student ID" onChange={(e) => onFilterChange("userId", e.target.value)} />
            <input className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" placeholder="Quiz ID" onChange={(e) => onFilterChange("quizId", e.target.value)} />
            <input className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" placeholder="Course ID" onChange={(e) => onFilterChange("courseId", e.target.value)} />
            <select className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" onChange={(e) => onFilterChange("type", e.target.value)}>
              <option value="">All types</option>
              {VIOLATION_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
            </select>
            <input type="date" className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" onChange={(e) => onFilterChange("dateFrom", e.target.value)} />
            <input type="date" className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" onChange={(e) => onFilterChange("dateTo", e.target.value)} />
            <div className="md:col-span-5 flex gap-2">
              <Button size="sm" onClick={() => { apply(); setShowFilters(false); }}>Apply</Button>
              <Button size="sm" variant="outline" onClick={() => { clear(); apply(); }}>Clear</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {flagged.length > 0 && (
        <FadeIn>
          <Card className="border-amber-200">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" /> Auto-flagged Attempts (≥3 violations)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b">
                  <th className="p-2">Attempt</th><th className="p-2">Student</th><th className="p-2">Quiz</th><th className="p-2">Violations</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b cursor-pointer hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
                    onClick={() => openDetailModal({ user_id: f.user_id, user_name: f.user_name, user_email: f.user_email })}
                  >
                    <td className="p-2">#{f.attempt_number} (id {f.id})</td>
                    <td className="p-2">{f.user_name || f.user_email}</td>
                    <td className="p-2">{f.quiz_title || f.quiz_id}</td>
                    <td className="p-2">{f.violation_count}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <FadeIn>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Violations by User ({filteredUsers.length})</CardTitle>
            <CardDescription>
              {error && <span className="text-red-500">{error}</span>}
              {!error && !logSearch && "One row per user. Click a row to view all integrity violations."}
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search user…"
              className="w-full rounded-lg border border-neutral-300 py-1.5 pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-800/80 backdrop-blur">
                <tr className="text-left text-xs text-neutral-500 border-b">
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 font-medium">Total</th>
                  <th className="p-3 font-medium">High</th>
                  <th className="p-3 font-medium">Medium</th>
                  <th className="p-3 font-medium">Low</th>
                  <th className="p-3 font-medium">Last Violation</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                     <tr key={i} className="border-b animate-pulse">
                       <td className="p-3" colSpan="7">
                         <div className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800" />
                       </td>
                     </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                   <tr>
                     <td colSpan="7" className="p-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-neutral-400">
                        <ShieldAlert size={28} />
                        <p className="text-sm">{logSearch ? "No matching users." : "No users with violations found."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isFlagged = Number(u.violation_count) >= 3;
                    return (
                      <tr
                        key={u.user_id}
                        onClick={() => openDetailModal(u)}
                        className={
                          "border-b transition-colors group cursor-pointer " +
                          (isFlagged
                            ? "bg-amber-50/60 hover:bg-amber-100/70 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50")
                        }
                      >
                        <td className="p-3">
                          <div className="font-medium">{u.user_name || "—"}</div>
                          <div className="text-xs text-neutral-500">{u.user_email}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold">{u.violation_count}</span>
                        </td>
                        <td className="p-3">{u.high_count || 0}</td>
                        <td className="p-3">{u.medium_count || 0}</td>
                        <td className="p-3">{u.low_count || 0}</td>
                        <td className="p-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                          {u.last_violation_at ? new Date(u.last_violation_at).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 text-right">
                          {isFlagged && (
                            <Badge variant="warning" className="mr-1">
                              <AlertTriangle size={11} className="mr-1" /> Flagged
                            </Badge>
                          )}
                          <ChevronRight size={16} className="inline text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        </Card>
      </FadeIn>

      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        size="2xl"
        title={selectedUser ? `Violations for ${selectedUser.user_name || selectedUser.user_email}` : "Violation Details"}
        footer={
          <Button variant="outline" size="sm" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        }
      >
        {detailLoading ? (
          <div className="py-8 text-center text-neutral-500">Loading violations…</div>
        ) : detailViolations.length === 0 ? (
          <div className="py-8 text-center text-neutral-500">No violations found for this user.</div>
        ) : (
          <StaggerList className="space-y-4">
            {detailViolations.map((v) => {
              const severity = TYPE_SEVERITY[v.type] || "low";
              return (
                <MotionItem key={v.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className={"inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " + SEVERITY_STYLES[severity]}>
                      {typeLabel(v.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {v.timestamp ? new Date(v.timestamp).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                    <span><span className="font-medium">Course:</span> {v.course_title || "—"}</span>
                    <span><span className="font-medium">Quiz:</span> {v.quiz_title || v.quiz_id || "—"}</span>
                    <span><span className="font-medium">Attempt #:</span> {v.attempt_number ?? v.attempt_id}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatMetadata(v.metadata)}
                  </p>
                </MotionItem>
              );
            })}
          </StaggerList>
        )}
      </Modal>
    </div>
  );
}
