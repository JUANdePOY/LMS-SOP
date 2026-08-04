import { useState, useEffect } from "react";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS } from "../constants/questionTypes";
import { Button } from "@/shared/components/ui/button";
import { Trash2, Plus, Save, X } from "lucide-react";
import { getHierarchy } from "../api/quiz.api";

const TYPE_OPTIONS = Object.entries(QUESTION_TYPES).map(([, value]) => ({ value, label: QUESTION_TYPE_LABELS[value] }));

function safeParse(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toOptions(raw) {
  if (!raw) return [];
  return raw.map((o, i) => {
    if (typeof o === "string") return { id: i, text: o };
    return { id: i, text: o.text || o.label || o.value || "" };
  });
}

export default function QuestionEditor({ question, onSave, onCancel, quizId }) {
  const isEdit = Boolean(question);
  const [text, setText] = useState(question?.question_text || question?.text || "");
  const [type, setType] = useState(question?.type || QUESTION_TYPES.MULTIPLE_CHOICE);
  const [options, setOptions] = useState(() => toOptions(question?.options));
  const [correctIdx, setCorrectIdx] = useState(null);
  const [correctIdxs, setCorrectIdxs] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [points, setPoints] = useState(question?.points || 1);
  const [explanation, setExplanation] = useState(question?.explanation || "");
  const [hierarchyId, setHierarchyId] = useState(question?.hierarchy_id || "");
  const [hierarchy, setHierarchy] = useState([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  useEffect(() => {
    if (!quizId) return;
    setLoadingHierarchy(true);
    getHierarchy(quizId)
      .then((res) => setHierarchy(res.data || []))
      .catch(() => setHierarchy([]))
      .finally(() => setLoadingHierarchy(false));
  }, [quizId]);

  useEffect(() => {
    if (!isEdit || !question) return;
    const opt = toOptions(question.options);
    setOptions(opt);
    const ca = safeParse(question.correct_answer);
    if (Array.isArray(ca)) {
      setCorrectIdxs(opt.map((o, i) => (ca.includes(o.text) ? i : -1)).filter((i) => i >= 0));
      setCorrectIdx(null);
    } else if (ca != null) {
      const idx = opt.findIndex((o) => String(o.text) === String(ca));
      setCorrectIdx(idx >= 0 ? idx : null);
      setCorrectIdxs([]);
    }
    setAnswerText(typeof ca === "string" ? ca : "");
    setHierarchyId(question?.hierarchy_id || "");
  }, [question, isEdit]);

  const handleTypeChange = (value) => {
    setType(value);
    if (value === QUESTION_TYPES.TRUE_FALSE) {
      setOptions([
        { id: Date.now(), text: "True" },
        { id: Date.now() + 1, text: "False" },
      ]);
      setCorrectIdx(0);
    } else if (value === QUESTION_TYPES.SHORT_ANSWER) {
      setOptions([]);
    }
  };

  const toggleCorrect = (idx) => {
    if (type === QUESTION_TYPES.MULTI_SELECT) {
      setCorrectIdxs((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
    } else {
      setCorrectIdx(idx);
    }
  };

  const addOption = () => setOptions([...options, { id: Date.now(), text: "" }]);
  const updateOption = (id, text) =>
    setOptions(options.map((o) => (o.id === id ? { ...o, text } : o)));
  const removeOption = (id) =>
    setOptions(options.filter((o) => o.id !== id));

  const handleSave = () => {
    if (!text.trim()) return;
    const payload = {
      type,
      question_text: text,
      points: Number(points) || 1,
      explanation: explanation || undefined,
      hierarchy_id: hierarchyId || null,
      options:
        type === QUESTION_TYPES.SHORT_ANSWER
          ? []
          : options.filter((o) => o.text.trim()).map((o) => ({ label: o.text, value: o.text })),
      correct_answer:
        type === QUESTION_TYPES.SHORT_ANSWER
          ? answerText
          : type === QUESTION_TYPES.MULTI_SELECT
          ? correctIdxs.map((i) => options[i].text)
          : options[correctIdx]?.text,
    };
    onSave(payload);
  };

  const isShortAnswer = type === QUESTION_TYPES.SHORT_ANSWER;
  const isMulti = type === QUESTION_TYPES.MULTI_SELECT;
  const showHierarchy = type === QUESTION_TYPES.MULTIPLE_CHOICE || type === QUESTION_TYPES.TRUE_FALSE;

  return (
    <div className="rounded-xl border border-blue-200/80 dark:border-blue-500/40 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-md">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Question Type</label>
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {showHierarchy && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Hierarchy</label>
            <select
              value={hierarchyId}
              onChange={(e) => setHierarchyId(e.target.value)}
              disabled={loadingHierarchy}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
            >
              <option value="">— None —</option>
              {hierarchy.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="w-20">
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Points</label>
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Question Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter question text..."
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none resize-y"
          rows={2}
        />
      </div>

      {!isShortAnswer && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Options</label>
          {options.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-2">
              <input
                type={isMulti ? "checkbox" : "radio"}
                name={isMulti ? `opt-${opt.id}` : "correct"}
                checked={isMulti ? correctIdxs.includes(idx) : correctIdx === idx}
                onChange={() => toggleCorrect(idx)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
              />
              <input
                type="text"
                value={opt.text}
                onChange={(e) => updateOption(opt.id, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
              />
              <Button size="sm" variant="ghost" onClick={() => removeOption(opt.id)} className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addOption} className="mt-1">
            <Plus className="h-4 w-4 mr-1" /> Add Option
          </Button>
        </div>
      )}

      {isShortAnswer && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Expected Answer</label>
          <input
            type="text"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Enter the correct answer text..."
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
          />
        </div>
      )}

      <div className="mt-3">
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Explanation (shown after grading)</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Optional explanation..."
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none resize-y"
          rows={2}
        />
      </div>
    </div>
  );
}