import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuiz } from "../hooks/useQuiz";
import { listAttempts, getAttemptResults } from "../api/attempt.api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { formatDuration } from "../utils/formatDuration";
import { CheckCircle, XCircle, Clock, Trophy, Target, BarChart3 } from "lucide-react";

function statusBadge(status) {
  const map = { completed: "text-blue-700 bg-blue-100", graded: "text-purple-700 bg-purple-100", in_progress: "text-amber-700 bg-amber-100" };
  return `text-xs px-2 py-0.5 rounded ${map[status] || "text-neutral-600 bg-neutral-100"}`;
}

function StatCard({ label, value, icon: Icon, accent = "neutral" }) {
  const accentCls = {
    neutral: "text-neutral-600",
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  }[accent] || "text-neutral-600";

  return (
    <Card>
      <CardContent className="py-3 text-center">
        <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 ${accentCls} mb-1`}>
          {Icon && <Icon className="h-4 w-4" />}
        </div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[11px] text-neutral-500">{label}</div>
      </CardContent>
    </Card>
  );
}

export default function QuizResultsPage() {
  const { quizId } = useParams();
  const { quiz, questions } = useQuiz(quizId);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [error, setError] = useState(null);

  const qMap = useMemo(() => new Map((questions || []).map((q) => [q.id, q])), [questions]);

  const load = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listAttempts({ quizId });
      setAttempts(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load attempts");
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    load();
  }, [load]);

  const open = useCallback(
    async (attempt) => {
      setSelected(attempt);
      setSelectedResult(null);
      try {
        const res = await getAttemptResults(attempt.id);
        setSelectedResult((res.data && res.data.result) || null);
      } catch (err) {
        setError(err.message || "Failed to load result");
      }
    },
    []
  );

  const best = useMemo(() => {
    return attempts.reduce((best, a) => (!(best && best.score > (a.score || 0)) ? a : best), null);
  }, [attempts]);

  const stats = useMemo(() => {
    const passedCount = attempts.filter((a) => a.passed).length;
    const withPct = attempts.filter((a) => a.percentage != null);
    const avg = withPct.reduce((s, a) => s + Number(a.percentage), 0) / (withPct.length || 1);
    const bestPct = best?.percentage != null ? Number(best.percentage) : 0;
    return {
      total: attempts.length,
      passed: passedCount,
      passRate: attempts.length ? `${Math.round((passedCount / attempts.length) * 100)}%` : "—",
      avg: Number.isFinite(avg) ? `${Math.round(avg)}%` : "—",
      best: bestPct ? `${bestPct}%` : "—",
    };
  }, [attempts, best]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{quiz?.title || "Quiz Results"}</h1>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {attempts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Attempts" value={stats.total} icon={BarChart3} accent="neutral" />
          <StatCard label="Best" value={stats.best} icon={Trophy} accent="indigo" />
          <StatCard label="Avg Score" value={stats.avg} icon={Target} accent="amber" />
          <StatCard label="Passed" value={stats.passed} icon={CheckCircle} accent="emerald" />
          <StatCard label="Pass Rate" value={stats.passRate} icon={Clock} accent="rose" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-medium text-neutral-500">Your Attempts</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700" />
              ))}
            </div>
          ) : attempts.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-neutral-500">
                No attempts yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {attempts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => open(a)}
                  className={`w-full text-left rounded-lg border p-3 text-sm transition-all hover:shadow-sm ${
                    selected?.id === a.id ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" : "border-neutral-200 hover:border-indigo-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Attempt #{a.attempt_number}</span>
                    <span className={statusBadge(a.status)}>{a.status}</span>
                  </div>
                  <div className="mt-1 text-neutral-600">
                    Score: {a.score}/{a.max_score} · {a.percentage}%
                  </div>
                  {a.time_taken_sec != null && (
                    <div className="text-neutral-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDuration(a.time_taken_sec)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <AttemptDetail attempt={selected} result={selectedResult} qMap={qMap} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-neutral-500">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
                <p className="text-sm">Select an attempt to review your answers.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const TYPE_LABEL = {
  multiple_choice: "Multiple Choice",
  multi_select: "Multiple Select",
  multiple_select: "Multiple Select",
  true_false: "True / False",
  short_answer: "Short Answer",
};

function AttemptDetail({ attempt, result, qMap }) {
  const checked = useMemo(() => {
    const fb = result?.feedback;
    if (Array.isArray(fb)) return fb;
    if (typeof fb === "string") {
      try {
        const parsed = JSON.parse(fb);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [result]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Attempt #{attempt.attempt_number}
          <span className={attempt.passed ? "text-emerald-600" : "text-rose-600"}>
            {attempt.passed ? "— Passed" : "— Review"}
          </span>
        </CardTitle>
        <CardDescription>
          {result ? `${result.score}/${result.max_score} (${result.percentage}%)` : "Loading feedback…"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {checked.length === 0 ? (
          <p className="text-sm text-neutral-500">No feedback available yet.</p>
        ) : (
          checked.map((item) => {
            const q = qMap.get(item.questionId);
            const selected = item.selected;
            const displaySelected = Array.isArray(selected) ? selected.join(", ") : String(selected ?? "—");
            return (
              <div
                key={item.questionId}
                className={`rounded-lg border p-3 transition-colors ${
                  item.isCorrect ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5" : "border-rose-200 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-500/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  {item.isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-medium text-sm text-neutral-800">
                      <span className="truncate">{q?.question_text || q?.text || `Question #${item.questionId}`}</span>
                      {q?.type && (
                        <span className="shrink-0 text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                          {TYPE_LABEL[q.type] || q.type}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600">
                      Your answer: {displaySelected || <span className="italic text-neutral-400">Not answered</span>}
                    </div>
                    <div className="text-xs text-neutral-400">
                      Points: {item.points} {item.isCorrect ? "· Correct" : "· Incorrect"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
