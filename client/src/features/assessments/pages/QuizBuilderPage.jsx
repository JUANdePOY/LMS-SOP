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
  importQuestions,
} from "../api/quiz.api";
import { useToast } from "@/shared/components/ui/Toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import QuestionEditor from "../components/QuestionEditor";
import { Plus, Save, Send, GripVertical, Edit, Trash2, CalendarClock, ChevronUp, ChevronDown, Upload, Search, CheckSquare, Square } from "lucide-react";
import { QUESTION_TYPE_LABELS } from "../constants/questionTypes";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function QuizBuilderPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { quiz, questions, loading, refetch } = useQuiz(quizId);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkFormat, setBulkFormat] = useState("json");
  const [bulkLoading, setBulkLoading] = useState(false);
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

  const moveQuestion = async (fromIndex, toIndex) => {
    const order = [...questions];
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    await reorderQuestions(quizId, order.map((q) => q.id));
    refetch();
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: undefined })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(questions, oldIndex, newIndex);
    try {
      await reorderQuestions(quizId, reordered.map((q) => q.id));
      toast.success("Questions reordered");
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

  function SortableQuestionItem({ q, idx, isSelected, onToggleSelect, onEdit, onDelete, onMoveUp, onMoveDown }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: q.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <div className="group relative flex items-center gap-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-3 shadow-sm hover:shadow-md hover:border-blue-300/80 dark:hover:border-blue-500/40 transition-all duration-200">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <GripVertical className="h-4 w-4 text-neutral-400 cursor-grab flex-shrink-0" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleSelect(q.id); }}
              className="flex-shrink-0"
            >
              {isSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-neutral-400" />}
            </button>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 whitespace-nowrap">
              {QUESTION_TYPE_LABELS[q.type] || q.type}
            </span>
          </div>
          <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100 truncate min-w-0">{q.question_text || q.text || ""}</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">{q.points || 1}pt</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => onEdit(q)} className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onMoveUp(idx)} title="Move up" className="h-8 w-8 p-0" disabled={idx === 0}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onMoveDown(idx)} title="Move down" className="h-8 w-8 p-0" disabled={idx === filteredQuestions.length - 1}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(q)} title="Delete" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const typeIdx = headers.indexOf("type");
    const textIdx = headers.indexOf("question_text");
    const optionsIdx = headers.indexOf("options");
    const correctIdx = headers.indexOf("correct_answer");
    const pointsIdx = headers.indexOf("points");
    const questions = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const type = cols[typeIdx]?.trim();
      const question_text = cols[textIdx]?.trim().replace(/^"|"$/g, "").replace(/""/g, '"');
      if (!type || !question_text) continue;
      let options = [];
      let correct_answer = null;
      const optionsRaw = cols[optionsIdx]?.trim().replace(/^"|"$/g, "").replace(/""/g, '"');
      const correctRaw = cols[correctIdx]?.trim().replace(/^"|"$/g, "").replace(/""/g, '"');
      if (optionsRaw) {
        try {
          options = JSON.parse(optionsRaw);
        } catch {
          options = optionsRaw.split("|").map((s) => s.trim()).filter(Boolean);
        }
      }
      if (correctRaw) {
        try {
          correct_answer = JSON.parse(correctRaw);
        } catch {
          correct_answer = correctRaw;
        }
      }
      questions.push({
        type,
        question_text,
        options: options.length ? options : null,
        correct_answer,
        points: pointsIdx >= 0 ? Number(cols[pointsIdx]) || 1 : 1,
      });
    }
    return questions;
  };

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return;
    setBulkLoading(true);
    try {
      let questions = [];
      if (bulkFormat === "json") {
        try {
          questions = JSON.parse(bulkInput);
        } catch {
          toast.error("Invalid JSON format");
          setBulkLoading(false);
          return;
        }
      } else {
        questions = parseCsv(bulkInput);
      }
      if (!Array.isArray(questions) || questions.length === 0) {
        toast.error("No valid questions found");
        setBulkLoading(false);
        return;
      }
      const res = await importQuestions(quizId, questions);
      toast.success(`Imported ${res.data?.imported || questions.length} questions`);
      setShowBulkImport(false);
      setBulkInput("");
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to import questions");
    } finally {
      setBulkLoading(false);
    }
  };

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredQuestions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {filteredQuestions.map((q, idx) => (
              <SortableQuestionItem
                key={q.id}
                q={q}
                idx={idx}
                isSelected={selectedIds.has(q.id)}
                onToggleSelect={toggleSelect}
                onEdit={(question) => setEditing(question)}
                onDelete={handleDeleteQuestion}
                onMoveUp={(i) => { if (i > 0) moveQuestion(i, i - 1); }}
                onMoveDown={(i) => { if (i < filteredQuestions.length - 1) moveQuestion(i, i + 1); }}
              />
            ))}
            {filteredQuestions.length === 0 && (
              <Card className="border border-dashed border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900">
                <CardContent className="py-8 text-center text-neutral-500">
                  {searchQuery ? "No questions match your search." : "No questions yet. Add one to get started."}
                </CardContent>
              </Card>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(`/assessments/quiz/${quizId}/take`)}>
          <CalendarClock className="h-4 w-4 mr-1" /> Preview / Take
        </Button>
      </div>

      {showBulkImport && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Bulk Import Questions</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="bulkFormat"
                  value="json"
                  checked={bulkFormat === "json"}
                  onChange={() => setBulkFormat("json")}
                />
                JSON
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="bulkFormat"
                  value="csv"
                  checked={bulkFormat === "csv"}
                  onChange={() => setBulkFormat("csv")}
                />
                CSV
              </label>
            </div>
            {bulkFormat === "json" ? (
              <textarea
                className="w-full h-64 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-mono"
                placeholder={`[
  {
    "type": "multiple_choice",
    "question_text": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correct_answer": "4",
    "points": 1
  }
]`}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
              />
            ) : (
              <textarea
                className="w-full h-64 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-mono"
                placeholder={`type,question_text,options,correct_answer,points
multiple_choice,"What is 2+2?","[\\"3\\",\\"4\\",\\"5\\",\\"6\\"]","4",1
true_false,"The sky is blue","[]","true",1`}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkImport(false)}>Cancel</Button>
              <Button onClick={handleBulkImport} disabled={bulkLoading}>
                {bulkLoading ? "Importing..." : "Import Questions"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}