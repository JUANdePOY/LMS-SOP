import { useState, useMemo } from "react";
import { useViolations } from "../hooks/useViolations";
import { getFlaggedAttempts, getViolations } from "../api/attempt.api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Download, Filter, AlertTriangle, Search, ShieldAlert, ChevronRight } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

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
  const headers = ["id", "timestamp", "student", "quiz", "attempt", "type"];
  const rows = data.map((v) => [
    csvEscape(v.id),
    csvEscape(v.timestamp),
    csvEscape(v.user_name || v.user_email),
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
  const { data: violations, loading, error, refetch } = useViolations(filters);
  const [flagged, setFlagged] = useState([]);
  const [flaggedLoading, setFlaggedLoading] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailViolations, setDetailViolations] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");

  if (!isSuperAdmin) return <Navigate to="/assessments" replace />;

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

  const openDetailModal = async (attempt) => {
    setSelectedAttempt(attempt);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await getViolations({ attemptId: attempt.id });
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

  const apply = () => refetch();
  const clear = () => setFilters({});

  const filteredViolations = useMemo(() => {
    if (!logSearch.trim()) return violations;
    const q = logSearch.toLowerCase();
    return violations.filter((v) =>
      [v.user_name, v.user_email, v.user_id, v.quiz_title, v.quiz_id, v.type, formatMetadata(v.metadata)]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [violations, logSearch]);

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
                    onClick={() => openDetailModal(f)}
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
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Violation Log ({violations.length})</CardTitle>
            <CardDescription>{error && <span className="text-red-500">{error}</span>}</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search log…"
              className="w-full rounded-lg border border-neutral-300 py-1.5 pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-800/80 backdrop-blur">
                <tr className="text-left text-xs text-neutral-500 border-b">
                  <th className="p-3 font-medium">Timestamp</th>
                  <th className="p-3 font-medium">Student</th>
                  <th className="p-3 font-medium">Quiz</th>
                  <th className="p-3 font-medium">Attempt #</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                     <tr key={i} className="border-b animate-pulse">
                       <td className="p-3" colSpan="6">
                         <div className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800" />
                       </td>
                     </tr>
                  ))
                ) : filteredViolations.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="p-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-neutral-400">
                        <ShieldAlert size={28} />
                        <p className="text-sm">{logSearch ? "No matching violations." : "No violations found."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredViolations.map((v) => {
                    const isFlagged = v.violation_count !== undefined && v.violation_count >= 3;
                    const severity = TYPE_SEVERITY[v.type] || "low";
                    const attemptRef = v.attempt_id || v.attempt_number;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => {
                          if (attemptRef) openDetailModal({ id: v.attempt_id, attempt_number: v.attempt_number });
                        }}
                        className={
                          "border-b transition-colors group " +
                          (isFlagged
                            ? "bg-amber-50/60 hover:bg-amber-100/70 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50") +
                          (attemptRef ? " cursor-pointer" : "")
                        }
                      >
                        <td className="p-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                          {v.timestamp ? new Date(v.timestamp).toLocaleString() : "—"}
                        </td>
                        <td className="p-3">{v.user_name || v.user_email || v.user_id}</td>
                        <td className="p-3">{v.quiz_title || v.quiz_id}</td>
                        <td className="p-3">{v.attempt_number ?? v.attempt_id}</td>
                        <td className="p-3">
                          <span className={"inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " + SEVERITY_STYLES[severity]}>
                            {typeLabel(v.type)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {isFlagged && (
                            <Badge variant="warning" className="mr-1">
                              <AlertTriangle size={11} className="mr-1" /> Flagged
                            </Badge>
                          )}
                          {attemptRef && (
                            <ChevronRight size={16} className="inline text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                          )}
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

      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        size="2xl"
        title={selectedAttempt ? `Violations for Attempt #${selectedAttempt.attempt_number}` : "Violation Details"}
        footer={
          <Button variant="outline" size="sm" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        }
      >
        {detailLoading ? (
          <div className="py-8 text-center text-neutral-500">Loading violations…</div>
        ) : detailViolations.length === 0 ? (
          <div className="py-8 text-center text-neutral-500">No violations found for this attempt.</div>
        ) : (
          <div className="space-y-3">
            {detailViolations.map((v) => {
              const severity = TYPE_SEVERITY[v.type] || "low";
              return (
                <div key={v.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className={"inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " + SEVERITY_STYLES[severity]}>
                      {typeLabel(v.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {v.timestamp ? new Date(v.timestamp).toLocaleString() : "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatMetadata(v.metadata)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
