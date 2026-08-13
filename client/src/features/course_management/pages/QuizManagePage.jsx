import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuizzes } from "../hooks/useQuizzes";
import QuizTable from "../components/tables/QuizTable";
import QuizCard from "../components/cards/QuizCard";
import CreateQuizModal from "../components/modals/CreateQuizModal";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Plus, RefreshCw, AlertCircle, LayoutList, Grid as GridIcon } from "lucide-react";

export default function QuizManagePage() {
  const { courseId } = useParams();
  const { isSuperAdmin, isAdmin } = useAuth();
  const { data: quizzes, loading, error, refetch, createQuiz, updateQuizStatus, showAll } = useQuizzes(courseId, {}, { isSuperAdmin, isAdmin });
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [busy, setBusy] = useState(null);

  const handleCreateQuiz = async (formData) => {
    try {
      await createQuiz(formData);
      setOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (quiz) => {
    const id = quiz.id || quiz;
    if (window.confirm(`Delete quiz "${quiz.title || id}"?`)) {
      // Delete logic would go here
    }
  };

  const handleEdit = (quiz) => {
    // Edit logic would go here
    console.log("Edit:", quiz);
  };

  const handleView = (quiz) => {
    // View logic would go here
    console.log("View:", quiz);
  };

  const handleTogglePublish = async (q) => {
    setBusy(q.id);
    try {
      const action = q.status === "published" ? "archive" : "publish";
      await updateQuizStatus(q.id, action);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Quizzes</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {showAll ? "Manage all quizzes across courses" : "Manage quizzes for this course"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Create Quiz
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-[rgba(204,31,31,0.25)] bg-danger-soft dark:bg-danger-soft">
          <div className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--color-danger)]" />
            <p className="text-sm text-[var(--color-danger)] dark:text-[var(--color-danger)]">{error}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        </Card>
      )}

      {quizzes?.length > 0 && (
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">View:</span>
            <div className="flex rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                <LayoutList className="h-3 w-3 mr-1 inline" />
                Table
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                <GridIcon className="h-3 w-3 mr-1 inline" />
                Grid
              </button>
            </div>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{quizzes?.length ?? 0} result{(quizzes?.length ?? 0) !== 1 ? 's' : ''}</span>
        </div>
      )}

      {viewMode === "table" ? (
        <QuizTable quizzes={quizzes} loading={loading} onEdit={handleEdit} onDelete={handleDelete} onView={handleView} onTogglePublish={handleTogglePublish} busy={busy} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <>
              {[...6].map((_, i) => (
                <div key={i} className="h-44 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
              ))}
            </>
          ) : (
            quizzes?.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} onEdit={handleEdit} onDelete={handleDelete} onView={handleView} onTogglePublish={handleTogglePublish} busy={busy} />
            ))
          )}
        </div>
      )}

      <CreateQuizModal open={open} onClose={() => setOpen(false)} onSubmit={handleCreateQuiz} />
    </div>
  );
}