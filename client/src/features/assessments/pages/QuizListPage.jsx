import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuizzesCatalog } from "../hooks/useQuizzesCatalog";
import { publishQuiz, archiveQuiz, deleteQuiz } from "../api/quiz.api";
import { getCourseList } from "@/features/course_management/api/course.api";
import { useToast } from "@/shared/components/ui/Toast";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import CreateQuizModal from "../components/modals/CreateQuizModal";
import { StaggerList, MotionItem, FadeIn } from "@/shared/motion";
import {
  Grid as GridIcon,
  List,
  Play,
  Clock,
  Search,
  Trophy,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Archive,
  Trash2,
  Pencil,
} from "lucide-react";

const TYPE_LABEL = { practice: "Practice", final: "Final" };
const STATUS_LABEL = { draft: "Draft", published: "Published", archived: "Archived" };
const STATUS_OPTIONS = [{ value: "", label: "All statuses" }, { value: "published", label: "Published" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" }];
const TYPE_OPTIONS = [{ value: "", label: "All types" }, { value: "practice", label: "Practice" }, { value: "final", label: "Final" }];

function statusClasses(status) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "archived") return "bg-neutral-200 text-neutral-600";
  return "bg-amber-100 text-amber-700";
}

function QuizCard({ q, onTogglePublish, onDelete, busy }) {
  const attemptsAllowed = q.attempts_allowed ?? (q.quiz_type === "final" ? 3 : "∞");
  const busyHere = busy === q.id;
  return (
    <Card className="group relative flex flex-col overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-xl hover:border-blue-300/80 dark:hover:border-blue-500/40 transition-all duration-200">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500/40" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100 leading-tight group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-200">{q.title}</CardTitle>
          <span className={`text-[10px] font-medium uppercase px-2.5 py-0.5 rounded-full ${statusClasses(q.status)}`}>
            {STATUS_LABEL[q.status] || q.status}
          </span>
        </div>
        <CardDescription className="line-clamp-2 text-neutral-600 dark:text-neutral-300 mt-1 text-xs">
          {q.course_title ? `${q.course_title} · ` : ""}{TYPE_LABEL[q.quiz_type] || q.quiz_type} quiz · {q.question_count ?? 0} questions
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            {q.time_limit && (
              <span className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                <Clock className="h-3 w-3" />
                {q.time_limit}m
              </span>
            )}
            <span className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              <Play className="h-3 w-3" />
              {attemptsAllowed} attempts
            </span>
            {q.attempt_count != null && (
              <span className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                <Trophy className="h-3 w-3" />
                {q.attempt_count} takes
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" asChild title="Open builder" className="h-8 w-8 p-0">
                <Link to={`/assessments/quiz/${q.id}`}><Pencil className="h-3.5 w-3.5" /></Link>
              </Button>
              <Button size="sm" variant="outline" asChild title="View results" className="h-8 w-8 p-0">
                <Link to={`/assessments/quiz/${q.id}/results`}><Trophy className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => onTogglePublish(q)} disabled={busyHere} title={q.status === "published" ? "Archive" : "Publish"} className="h-8 w-8 p-0">
                {q.status === "published" ? <Archive className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(q)} disabled={busyHere} title="Delete" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:border-rose-300 dark:hover:border-rose-700">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuizTable({ quizzes, onTogglePublish, onDelete, busy }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
      <table className="w-full text-sm">
        <thead className="bg-neutral-50/80 dark:bg-neutral-800/80 sticky top-0 z-10">
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Quiz</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Course</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-20">Type</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-24">Status</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-20">Questions</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-20">Takes</th>
            <th className="text-right px-4 py-3 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-52">Actions</th>
          </tr>
        </thead>
        <tbody>
          {quizzes.length === 0 ? (
            <tr><td colSpan="7" className="px-4 py-12 text-center text-neutral-500 dark:text-neutral-400">No quizzes match your filters.</td></tr>
          ) : quizzes.map((q, idx) => {
            const busyHere = busy === q.id;
            return (
              <tr key={q.id} className={`border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors duration-150 ${idx % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-neutral-50/40 dark:bg-neutral-800/30"}`}>
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{q.title}</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{q.course_title || `Course #${q.course_id}`}</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{TYPE_LABEL[q.quiz_type] || q.quiz_type}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-medium uppercase px-2.5 py-0.5 rounded-full ${statusClasses(q.status)}`}>
                    {STATUS_LABEL[q.status] || q.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{q.question_count ?? 0}</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{q.attempt_count ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="sm" variant="ghost" asChild title="Open builder" className="h-7 px-2 text-neutral-600 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400">
                      <Link to={`/assessments/quiz/${q.id}`} className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /><span className="text-xs">Edit</span></Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild title="View results" className="h-7 px-2 text-neutral-600 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400">
                      <Link to={`/assessments/quiz/${q.id}/results`} className="inline-flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /><span className="text-xs">Results</span></Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onTogglePublish(q)} disabled={busyHere} title={q.status === "published" ? "Archive" : "Publish"} className="h-7 px-2 text-neutral-600 hover:text-amber-600 dark:text-neutral-400 dark:hover:text-amber-400">
                      {q.status === "published" ? <Archive className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(q)} disabled={busyHere} title="Delete" className="h-7 px-2 text-neutral-600 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function QuizListPage() {
  const { isAnyAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [view, setView] = useState("card");
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "", quizType: "", page: 1 });
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [busy, setBusy] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const { quizzes, pagination, loading, error, refetch } = useQuizzesCatalog({ ...filters, limit: 20 });

  useEffect(() => {
    if (isAnyAdmin) {
      (async () => {
        setLoadingCourses(true);
        try {
          const res = await getCourseList({ limit: 50 });
          setCourses(res.data || []);
        } catch {
          setCourses([]);
        } finally {
          setLoadingCourses(false);
        }
      })();
    }
  }, [isAnyAdmin]);

  const applyFilters = useCallback(() => refetch({ ...filters, limit: 20 }), [filters, refetch]);
  const clearFilters = useCallback(() => {
    const empty = { search: "", status: "", quizType: "", page: 1 };
    setFilters(empty);
    refetch({ ...empty, limit: 20 });
  }, [refetch]);
  const goPage = useCallback((page) => {
    const f = { ...filters, page };
    setFilters(f);
    refetch({ ...f, limit: 20 });
  }, [filters, refetch]);

  const handleCreateComplete = ({ quizId, questionCount, openBuilder }) => {
    setShowCreate(false);
    refetch({ ...filters, limit: 20 });
    toast.success(
      questionCount > 0
        ? `Quiz created with ${questionCount} question${questionCount === 1 ? "" : "s"}.`
        : "Quiz created. Add questions in the builder."
    );
    if (openBuilder && quizId) navigate(`/assessments/quiz/${quizId}`);
  };

  const handleTogglePublish = async (q) => {
    setBusy(q.id);
    try {
      if (q.status === "published") {
        await archiveQuiz(q.id);
        toast.success(`Quiz “${q.title}” archived.`);
      } else {
        await publishQuiz(q.id);
        toast.success(`Quiz “${q.title}” published.`);
      }
      refetch({ ...filters, limit: 20 });
    } catch (err) {
      toast.error(err.message || "Failed to update quiz");
    } finally {
      setBusy(null);
    }
  };

  const requestDelete = (q) => setPendingDelete(q);

  const confirmDelete = async () => {
    const q = pendingDelete;
    if (!q) return;
    setBusy(q.id);
    try {
      await deleteQuiz(q.id);
      toast.success(`Quiz “${q.title}” deleted.`);
      refetch({ ...filters, limit: 20 });
    } catch (err) {
      // If the quiz was already soft-deleted (e.g. its parent course was
      // removed), a normal delete 404s. Fall back to a force delete to purge it.
      if (err?.status === 404) {
        try {
          await deleteQuiz(q.id, { force: true });
          toast.success(`Quiz “${q.title}” deleted.`);
          refetch({ ...filters, limit: 20 });
          return;
        } catch (forceErr) {
          toast.error(forceErr.message || "Failed to delete quiz");
          return;
        }
      }
      toast.error(err.message || "Failed to delete quiz");
    } finally {
      setBusy(null);
      setPendingDelete(null);
    }
  };

  const filteredCount = quizzes.length;

  if (!isAnyAdmin) return <Navigate to="/assessments" replace />;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Quizzes</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Manage quizzes across courses</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-1">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`rounded p-1 text-xs ${view === "grid" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"}`}
                title="Grid view"
              >
                <GridIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={`rounded p-1 text-xs ${view === "table" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"}`}
                title="Table view"
              >
                <List size={14} />
              </button>
            </div>
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Create Quiz
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm">
          <p className="font-medium text-red-800 dark:text-red-200 mb-1">Failed to load quizzes</p>
          <p className="text-red-600 dark:text-red-300 mb-2">{error}</p>
          <button onClick={() => refetch()} className="rounded-lg px-3 py-1.5 text-xs bg-red-600 text-white hover:bg-red-700">Retry</button>
        </div>
      )}

      {showCreate && (
        <CreateQuizModal
          open={showCreate}
          courses={courses}
          loadingCourses={loadingCourses}
          onCancel={() => setShowCreate(false)}
          onComplete={handleCreateComplete}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
          <input
            aria-label="Search quizzes"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search quizzes…"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 pl-9 pr-3 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400"
          />
        </div>
        <select value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value, page: 1 })); applyFilters(); }} className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.quizType} onChange={(e) => { setFilters((f) => ({ ...f, quizType: e.target.value, page: 1 })); applyFilters(); }} className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={applyFilters}><Filter className="h-4 w-4 mr-1" />Apply</Button>
          <Button size="sm" variant="outline" onClick={clearFilters}>Clear</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(view === "grid" ? 6 : 4)].map((_, i) => (
            <div key={i} className={`animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700 ${view === "grid" ? "h-28" : "h-10"}`} />
          ))}
        </div>
      ) : filteredCount === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-3">
            <Search size={20} className="text-neutral-400" />
          </div>
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">No quizzes found</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            {filters.search || filters.status || filters.quizType
              ? "Try adjusting your filters or clearing them to see all quizzes"
              : "Create a quiz to get started"}
          </p>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Create Quiz</Button>
        </div>
      ) : view === "grid" ? (
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((q) => (
            <MotionItem key={q.id}>
              <QuizCard q={q} onTogglePublish={handleTogglePublish} onDelete={requestDelete} busy={busy} />
            </MotionItem>
          ))}
        </StaggerList>
      ) : (
        <FadeIn>
          <QuizTable quizzes={quizzes} onTogglePublish={handleTogglePublish} onDelete={requestDelete} busy={busy} />
        </FadeIn>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-neutral-200 dark:border-neutral-600 px-2.5 py-1 text-xs hover:border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-neutral-200 dark:border-neutral-600 px-2.5 py-1 text-xs hover:border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete quiz?"
        description={pendingDelete ? `“${pendingDelete.title}” and all its questions and attempts will be permanently removed. This action cannot be undone.` : ""}
        confirmLabel="Delete quiz"
        cancelLabel="Cancel"
        destructive
        loading={busy === pendingDelete?.id}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}