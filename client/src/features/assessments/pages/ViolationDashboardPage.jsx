import { useState } from "react";
import { useViolations } from "../hooks/useViolations";
import { getFlaggedAttempts, getViolations } from "../api/attempt.api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Download, Filter, AlertTriangle } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";

const VIOLATION_TYPES = ["tab_switch", "copy_attempt", "screenshot_attempt", "right_click", "fullscreen_exit", "devtools_opened"];

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
  const headers = ["id", "timestamp", "student", "quiz", "attempt", "type", "metadata"];
  const rows = data.map((v) => [
    csvEscape(v.id),
    csvEscape(v.timestamp),
    csvEscape(v.user_name || v.user_email),
    csvEscape(v.quiz_title || v.quiz_id),
    csvEscape(v.attempt_number),
    csvEscape(v.type),
    csvEscape(formatMetadata(v.metadata)),
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

export default function ViolationDashboardPage() {
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const { data: violations, loading, error, refetch } = useViolations(filters);
  const [flagged, setFlagged] = useState([]);
  const [flaggedLoading, setFlaggedLoading] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailViolations, setDetailViolations] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const typeLabel = (t) => t && t.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Integrity Violations</h1>
        <div className="flex gap-2">
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
        <CardHeader>
          <CardTitle>Violation Log ({violations.length})</CardTitle>
          <CardDescription>{error && <span className="text-red-500">{error}</span>}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500 border-b">
                <th className="p-3">Timestamp</th><th className="p-3">Student</th><th className="p-3">Quiz</th>
                <th className="p-3">Attempt #</th><th className="p-3">Type</th><th className="p-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="p-3 text-center text-neutral-500">Loading…</td></tr>
              ) : violations.length === 0 ? (
                <tr><td colSpan="6" className="p-3 text-center text-neutral-500">No violations found.</td></tr>
              ) : (
                violations.map((v) => {
                  const isFlagged = v.violation_count !== undefined && v.violation_count >= 3;
                  return (
                    <tr key={v.id} className={isFlagged ? "bg-amber-50/50" : ""}>
                      <td className="p-3">{v.timestamp ? new Date(v.timestamp).toLocaleString() : "—"}</td>
                      <td className="p-3">{v.user_name || v.user_email || v.user_id}</td>
                      <td className="p-3">{v.quiz_title || v.quiz_id}</td>
                      <td className="p-3">{v.attempt_number ?? v.attempt_id}</td>
                      <td className="p-3">{typeLabel(v.type)}</td>
                      <td className="p-3 text-neutral-500">{formatMetadata(v.metadata)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
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
            {detailViolations.map((v) => (
              <div key={v.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{typeLabel(v.type)}</span>
                  <span className="text-xs text-gray-500">
                    {v.timestamp ? new Date(v.timestamp).toLocaleString() : "—"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {formatMetadata(v.metadata)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
