import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuiz } from "../hooks/useQuiz";
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  publishQuiz,
  updateQuiz,
} from "../api/quiz.api";
import { useToast } from "@/shared/components/ui/Toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import QuestionEditor from "../components/QuestionEditor";
import BulkImportModal from "../components/BulkImportModal";
import { Plus, Save, Send, CalendarClock, Upload, Search, HelpCircle, Trash2 } from "lucide-react";
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_CONFIG } from "../constants/questionTypes";
import QuestionTypeTabs from "../components/QuestionTypeTabs";

const TYPE_COLORS = {
  multiple_choice: { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", icon: "text-blue-600" },
  multi_select: { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300", icon: "text-purple-600" },
  true_false: { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", icon: "text-emerald-600" },
  short_answer: { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", icon: "text-amber-600" },
  essay: { bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", icon: "text-rose-600" },
};

export default function QuizBuilderPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { quiz, questions, loading, refetch } = useQuiz(quizId);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const autoSaveTimerRef = useRef(null);

  const loadSettings = useCallback((q) => {
    if (!q) return;
    setSettings({
      title: q.title || "",
      description: q.description || "",
      quiz_type: q.quiz_type || "practice",
      time_limit: q.time_limit ?? "",
      passing_score: q.passing_score ?? "",
      max_score: q.max_score ?? 100,
      feedback_policy: q.feedback_policy || "immediate",
      attempts_allowed: q.attempts_allowed ?? (q.quiz_type === "final" ? 3 : 1),
      randomize_questions: !!q.randomize_questions,
      shuffle_options: !!q.shuffle_options,
      grading_method: q.grading_method || "auto",
    });
    setSettingsDirty(false);
  }, []);

  useEffect(() => {
    if (quiz && !settingsDirty) {
      loadSettings(quiz);
    }
  }, [quiz, settingsDirty, loadSettings]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (settingsDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [settingsDirty]);

  const handleSetting = (field, value) => {
    setSettings((s) => ({ ...s, [field]: value }));
    setSettingsDirty(true);
  };

  const saveSettings = useCallback(async () => {
    if (!settings || !quizId) return;
    setSaving(true);
    try {
      await updateQuiz(quizId, {
        title: settings.title,
        description: settings.description,
        quiz_type: settings.quiz_type,
        time_limit: settings.time_limit ? Number(settings.time_limit) : null,
        passing_score: settings.passing_score ? Number(settings.passing_score) : null,
        max_score: settings.max_score ? Number(settings.max_score) : null,
        feedback_policy: settings.feedback_policy,
        attempts_allowed: Number(settings.attempts_allowed) || 1,
        randomize_questions: settings.randomize_questions,
        shuffle_options: settings.shuffle_options,
        grading_method: settings.grading_method,
      });
      setSettingsDirty(false);
      toast.success("Quiz settings saved");
      await refetch();
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [settings, quizId, refetch, toast]);

  useEffect(() => {
    if (settingsDirty && !autoSaveTimerRef.current) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveSettings();
        autoSaveTimerRef.current = null;
      }, 2000);
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [settingsDirty, saveSettings]);

  const handleSaveQuestion = async (payload) => {
    try {
      if (editing && editing.id) {
        await updateQuestion(quizId, editing.id, payload);
        toast.success("Question updated");
      } else {
        await createQuestion(quizId, payload);
        toast.success("Question added");
      }
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to save question");
    }
  };

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteQuestion(quizId, q.id);
      toast.success("Question deleted");
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to delete question");
    }
  };

  const handleReorder = async (type, orderedIdsInType) => {
    const typeQuestions = questions.filter((q) => (q.type || "multiple_choice") === type);
    const otherQuestions = questions.filter((q) => (q.type || "multiple_choice") !== type);

    const orderedByType = orderedIdsInType.map((id) => typeQuestions.find((q) => q.id === id)).filter(Boolean);
    const reordered = [];

    let typeIdx = 0;
    let otherIdx = 0;
    for (const q of questions) {
      const qt = q.type || "multiple_choice";
      if (qt === type) {
        if (typeIdx < orderedByType.length) {
          reordered.push(orderedByType[typeIdx]);
          typeIdx += 1;
        }
      } else {
        if (otherIdx < otherQuestions.length) {
          reordered.push(otherQuestions[otherIdx]);
          otherIdx += 1;
        }
      }
    }

    try {
      await reorderQuestions(quizId, reordered.map((q) => q.id));
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to reorder questions");
    }
  };

  const handlePublish = async () => {
    if (!window.confirm("Publish this quiz? Students will be able to take it.")) return;
    try {
      await publishQuiz(quizId);
      toast.success("Quiz published");
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to publish");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected questions?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteQuestion(quizId, id)));
      toast.success(`${selectedIds.size} questions deleted`);
      setSelectedIds(new Set());
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to delete questions");
    }
  };

  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter((item) => {
      const text = (item.question_text || item.text || "").toLowerCase();
      const type = (item.type || "").toLowerCase();
      return text.includes(q) || type.includes(q);
    });
  }, [questions, searchQuery]);

  const [showBulkImport, setShowBulkImport] = useState(false);
  if (loading) return <div className="p-6">Loading quiz...</div>;
  if (!quiz) return <div className="p-6 text-neutral-500">Quiz not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Quiz Builder</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Build and manage your quiz questions</p>
          </div>
          <div className="flex items-center gap-2">
            {settingsDirty && (
              <Button size="sm" onClick={saveSettings} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> Save Settings
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handlePublish}>
              <Send className="h-4 w-4 mr-1" /> Publish
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </div>

      <Card className="border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Quiz Settings</CardTitle>
          <CardDescription className="text-xs text-neutral-500 dark:text-neutral-400">Configure quiz type, timing, scoring, and behavior</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Title</label>
            <input
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
              value={settings?.title || ""}
              onChange={(e) => handleSetting("title", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Description</label>
            <input
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
              value={settings?.description || ""}
              onChange={(e) => handleSetting("description", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Quiz Type</label>
            <select
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
              value={settings?.quiz_type || "practice"}
              onChange={(e) => handleSetting("quiz_type", e.target.value)}
            >
              <option value="practice">Practice (unlimited attempts)</option>
              <option value="final">Final (3 attempts)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Time Limit (seconds)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
              value={settings?.time_limit ?? ""}
              onChange={(e) => handleSetting("time_limit", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Passing Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
              value={settings?.passing_score ?? ""}
              onChange={(e) => handleSetting("passing_score", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Max Score</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
              value={settings?.max_score ?? 100}
              onChange={(e) => handleSetting("max_score", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Feedback Policy</label>
            <select
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
              value={settings?.feedback_policy || "immediate"}
              onChange={(e) => handleSetting("feedback_policy", e.target.value)}
            >
              <option value="immediate">Immediate</option>
              <option value="on_completion">On Completion</option>
              <option value="manual">Manual Review</option>
            </select>
          </div>
          {settings?.quiz_type === "final" && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Max Attempts (default 3)</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
                value={settings?.attempts_allowed ?? 3}
                onChange={(e) => handleSetting("attempts_allowed", Number(e.target.value) || 3)}
              />
            </div>
          )}
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={!!settings?.randomize_questions}
                onChange={(e) => handleSetting("randomize_questions", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              Shuffle question order
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={!!settings?.shuffle_options}
                onChange={(e) => handleSetting("shuffle_options", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              Shuffle answer options
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Grading Method</label>
            <select
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
              value={settings?.grading_method || "auto"}
              onChange={(e) => handleSetting("grading_method", e.target.value)}
            >
              <option value="auto">Auto (highest score)</option>
              <option value="manual">Manual (highest score)</option>
              <option value="highest">Highest score across attempts</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Questions ({questions.length})</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowBulkImport(true)}>
            <Upload className="h-4 w-4 mr-1" /> Bulk Import
          </Button>
          <Button size="sm" onClick={() => setEditing({ new: true })}>
            <Plus className="h-4 w-4 mr-1" /> Add Question
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button size="sm" variant="outline" onClick={toggleSelectAll}>
          {selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0 ? "Deselect All" : "Select All"}
        </Button>
        {selectedIds.size > 0 && (
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      {editing && (
        <QuestionEditor
          question={editing.new ? null : editing}
          onSave={handleSaveQuestion}
          onCancel={() => setEditing(null)}
          quizId={quizId}
        />
      )}

      <QuestionTypeTabs
        questions={filteredQuestions}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onEdit={(question) => setEditing(question)}
        onDelete={handleDeleteQuestion}
        onReorder={handleReorder}
        searchQuery={searchQuery}
      />

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(`/assessments/quiz/${quizId}/take`)}>
          <CalendarClock className="h-4 w-4 mr-1" /> Preview / Take
        </Button>
      </div>

      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        quizId={quizId}
        toast={toast}
        refetch={refetch}
      />
    </div>
  );
}