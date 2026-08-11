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
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import QuestionEditor from "../components/QuestionEditor";
import BulkImportModal from "../components/BulkImportModal";
import {
  Plus,
  Save,
  Send,
  CalendarClock,
  Upload,
  Search,
  HelpCircle,
  Trash2,
  CheckCircle2,
  Loader2,
  Settings2,
  ListChecks,
} from "lucide-react";
import QuestionTypeTabs from "../components/QuestionTypeTabs";
import AnswerKeyList from "../components/AnswerKeyList";

const fieldClass =
  "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none";

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SaveStatusPill({ settingsDirty, saving }) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (settingsDirty) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
        <HelpCircle className="h-3.5 w-3.5" /> Unsaved changes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
    </span>
  );
}

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
  const [activeTab, setActiveTab] = useState("settings");
  const autoSaveTimerRef = useRef(null);

  const [confirm, setConfirm] = useState(null); // { title, description, destructive, onConfirm, confirmText }

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

  const requestDeleteQuestion = (q) => {
    setConfirm({
      title: "Delete this question?",
      description: "This action cannot be undone.",
      destructive: true,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await deleteQuestion(quizId, q.id);
          toast.success("Question deleted");
          refetch();
        } catch (err) {
          toast.error(err.message || "Failed to delete question");
        }
      },
    });
  };

  const requestPublish = () => {
    setConfirm({
      title: "Publish this quiz?",
      description: "Students will be able to take it.",
      destructive: false,
      confirmText: "Publish",
      onConfirm: async () => {
        try {
          await publishQuiz(quizId);
          toast.success("Quiz published");
          refetch();
        } catch (err) {
          toast.error(err.message || "Failed to publish");
        }
      },
    });
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

  const requestBulkDelete = () => {
    if (!selectedIds.size) return;
    setConfirm({
      title: `Delete ${selectedIds.size} selected questions?`,
      description: "This action cannot be undone.",
      destructive: true,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedIds).map((id) => deleteQuestion(quizId, id)));
          toast.success(`${selectedIds.size} questions deleted`);
          setSelectedIds(new Set());
          refetch();
        } catch (err) {
          toast.error(err.message || "Failed to delete questions");
        }
      },
    });
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

  const tabs = [
    { value: "settings", label: "Settings", icon: Settings2, badge: settingsDirty ? "•" : null },
    { value: "questions", label: "Questions", icon: ListChecks, badge: questions.length || null },
  ];

  const confirmLoading = false;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="sticky top-0 z-20 pt-2 pb-3 bg-gradient-to-b from-[var(--bg-page,white)] via-[var(--bg-page,white)]/95 to-transparent dark:from-neutral-950 dark:via-neutral-950/95 backdrop-blur-sm">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Quiz Builder</h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Build and manage your quiz questions</p>
            </div>
            <div className="flex items-center gap-2">
              <SaveStatusPill settingsDirty={settingsDirty} saving={saving} />
              {settingsDirty && (
                <Button size="sm" onClick={saveSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> Save Settings
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={requestPublish} disabled={saving}>
                <Send className="h-4 w-4 mr-1" /> Publish
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
                Back
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-indigo-500 text-indigo-700 dark:text-indigo-300"
                    : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.badge != null && (
                  <span
                      className={`ml-0.5 min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isActive ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                      }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "settings" && (
        <Card className="border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Quiz Settings</CardTitle>
            <CardDescription className="text-xs text-neutral-500 dark:text-neutral-400">Configure quiz type, timing, scoring, and behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Title">
                  <input className={fieldClass} value={settings?.title || ""} onChange={(e) => handleSetting("title", e.target.value)} />
                </Field>
                <Field label="Description">
                  <input className={fieldClass} value={settings?.description || ""} onChange={(e) => handleSetting("description", e.target.value)} />
                </Field>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">Scheduling & Scoring</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Quiz Type">
                  <select className={fieldClass} value={settings?.quiz_type || "practice"} onChange={(e) => handleSetting("quiz_type", e.target.value)}>
                    <option value="practice">Practice (unlimited attempts)</option>
                    <option value="final">Final (3 attempts)</option>
                  </select>
                </Field>
                <Field label="Time Limit (minutes)">
                  <input type="number" className={fieldClass} value={settings?.time_limit ?? ""} onChange={(e) => handleSetting("time_limit", e.target.value ? Number(e.target.value) : null)} />
                </Field>
                <Field label="Passing Score (%)">
                  <input type="number" min={0} max={100} className={fieldClass} value={settings?.passing_score ?? ""} onChange={(e) => handleSetting("passing_score", e.target.value ? Number(e.target.value) : null)} />
                </Field>
                <Field label="Max Score">
                  <input type="number" min={1} className={fieldClass} value={settings?.max_score ?? 100} onChange={(e) => handleSetting("max_score", e.target.value ? Number(e.target.value) : null)} />
                </Field>
                {settings?.quiz_type === "final" && (
                  <Field label="Max Attempts (default 3)">
                    <input type="number" min={1} className={fieldClass} value={settings?.attempts_allowed ?? 3} onChange={(e) => handleSetting("attempts_allowed", Number(e.target.value) || 3)} />
                  </Field>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">Behavior</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Feedback Policy">
                  <select className={fieldClass} value={settings?.feedback_policy || "immediate"} onChange={(e) => handleSetting("feedback_policy", e.target.value)}>
                    <option value="immediate">Immediate</option>
                    <option value="on_completion">On Completion</option>
                    <option value="manual">Manual Review</option>
                  </select>
                </Field>
                <Field label="Grading Method">
                  <select className={fieldClass} value={settings?.grading_method || "auto"} onChange={(e) => handleSetting("grading_method", e.target.value)}>
                    <option value="auto">Auto (highest score)</option>
                    <option value="manual">Manual (highest score)</option>
                    <option value="highest">Highest score across attempts</option>
                  </select>
                </Field>
                <div className="flex items-end gap-4 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                    <input type="checkbox" checked={!!settings?.randomize_questions} onChange={(e) => handleSetting("randomize_questions", e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
                    Shuffle question order
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                    <input type="checkbox" checked={!!settings?.shuffle_options} onChange={(e) => handleSetting("shuffle_options", e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
                    Shuffle answer options
                  </label>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      )}

      {activeTab === "questions" && (
        <div className="space-y-4">
          {editing && (
            <QuestionEditor
              question={editing.new ? null : editing}
              onSave={handleSaveQuestion}
              onCancel={() => setEditing(null)}
              quizId={quizId}
            />
          )}

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
              <Button size="sm" variant="destructive" onClick={requestBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete Selected ({selectedIds.size})
              </Button>
            )}
          </div>

          {filteredQuestions.length === 0 ? (
            <Card className="border border-dashed border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900">
              <CardContent className="py-12 text-center">
                <ListChecks className="h-10 w-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">No questions yet</p>
                <p className="text-xs mt-1 text-neutral-500 dark:text-neutral-400">Click “Add Question” to create your first one.</p>
              </CardContent>
            </Card>
          ) : (
            <QuestionTypeTabs
              questions={filteredQuestions}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onEdit={(question) => setEditing(question)}
              onDelete={requestDeleteQuestion}
              onReorder={handleReorder}
              searchQuery={searchQuery}
            />
          )}

          {questions.length > 0 && (
            <details className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100 select-none flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Answer Key ({questions.length})
                <span className="text-xs font-normal text-neutral-400">— view options &amp; correct answers</span>
              </summary>
              <div className="px-4 pb-4">
                <AnswerKeyList questions={questions} />
              </div>
            </details>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/assessments/quiz/${quizId}/take`)}>
              <CalendarClock className="h-4 w-4 mr-1" /> Preview / Take
            </Button>
          </div>
        </div>
      )}

      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        quizId={quizId}
        toast={toast}
        refetch={refetch}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmText || "Confirm"}
        destructive={!!confirm?.destructive}
        loading={confirmLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const action = confirm?.onConfirm;
          setConfirm(null);
          if (action) await action();
        }}
      />
    </div>
  );
}
