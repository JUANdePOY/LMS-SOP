import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { useToast } from "@/shared/components/ui/Toast";
import QuestionEditor from "../QuestionEditor";
import QuestionTypeTabs from "../QuestionTypeTabs";
import BulkImportModal from "../BulkImportModal";
import { Plus, Upload, Search, ListChecks } from "lucide-react";

export default function StepQuestions({
  quizId,
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
  onReorder,
  onRefresh,
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);

  const handleSave = (payload) => {
    if (editing && editing.id) {
      onUpdateQuestion(editing, payload);
    } else {
      onAddQuestion(payload);
    }
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {editing ? (
        <QuestionEditor
          question={editing}
          quizId={quizId}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setEditing({ new: true })}>
            <Plus className="h-4 w-4 mr-1" /> Add Question
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Questions ({questions.length})
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 w-44"
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowBulk(true)}>
            <Upload className="h-4 w-4 mr-1" /> Bulk Import
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 py-12 text-center">
          <ListChecks className="h-10 w-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            No questions yet
          </p>
          <p className="text-xs mt-1 text-neutral-500 dark:text-neutral-400">
            Click “Add Question” or use Bulk Import.
          </p>
        </div>
      ) : (
        <QuestionTypeTabs
          questions={questions}
          selectedIds={new Set()}
          onToggleSelect={() => {}}
          onEdit={(q) => setEditing(q)}
          onDelete={(q) =>
            setConfirm({
              title: "Delete this question?",
              description: "This action cannot be undone.",
              destructive: true,
              confirmText: "Delete",
              onConfirm: async () => {
                await onRemoveQuestion(q);
                setConfirm(null);
              },
            })
          }
          onReorder={onReorder}
          searchQuery={search}
        />
      )}

      <BulkImportModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        quizId={quizId}
        toast={toast}
        refetch={onRefresh}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmText || "Confirm"}
        destructive={!!confirm?.destructive}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />
    </div>
  );
}
