import { useState, useCallback } from "react";
import {
  createQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestions,
} from "../api/quiz.api";

function safeParse(value) {
  if (value == null) return value;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

const DEFAULT_SETTINGS = {
  courseId: "",
  title: "",
  description: "",
  quiz_type: "practice",
  time_limit: "",
  passing_score: "",
  max_score: 100,
  attempts_allowed: 1,
  feedback_policy: "immediate",
  grading_method: "auto",
  randomize_questions: false,
  shuffle_options: false,
};

export function useQuizWizard({ toast, onComplete, onCancel, courseId } = {}) {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    courseId: courseId || "",
  }));
  const [quizId, setQuizId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [savingStep, setSavingStep] = useState(null);

  const setField = useCallback((field, value) => {
    setSettings((s) => ({ ...s, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }, []);

  const validateStep1 = useCallback(() => {
    const e = {};
    if (!settings.courseId) e.courseId = "Select a course";
    if (!settings.title.trim()) e.title = "Title is required";
    if (settings.time_limit !== "" && Number(settings.time_limit) < 0)
      e.time_limit = "Must be 0 or more";
    if (
      settings.passing_score !== "" &&
      (Number(settings.passing_score) < 0 || Number(settings.passing_score) > 100)
    )
      e.passing_score = "Must be between 0 and 100";
    if (settings.max_score !== "" && Number(settings.max_score) < 1)
      e.max_score = "Must be at least 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [settings]);

  const submitStep1 = useCallback(async () => {
    if (!validateStep1()) return;
    setSavingStep(1);
    try {
      const res = await createQuiz(Number(settings.courseId), {
        title: settings.title.trim(),
        description: settings.description.trim() || undefined,
        quiz_type: settings.quiz_type,
        status: "published",
        time_limit: settings.time_limit ? Number(settings.time_limit) : null,
        passing_score: settings.passing_score ? Number(settings.passing_score) : null,
        max_score: settings.max_score ? Number(settings.max_score) : null,
        attempts_allowed:
          settings.quiz_type === "final" ? Number(settings.attempts_allowed) || 3 : 1,
        feedback_policy: settings.feedback_policy,
        grading_method: settings.grading_method,
        randomize_questions: settings.randomize_questions,
        shuffle_options: settings.shuffle_options,
      });
      setQuizId(res?.data?.id ?? null);
      setStep(2);
    } catch (err) {
      toast?.error?.(err.message || "Failed to create quiz");
    } finally {
      setSavingStep(null);
    }
  }, [settings, validateStep1, toast]);

  const addQuestion = useCallback(
    async (payload) => {
      if (!quizId) return;
      const res = await createQuestion(quizId, payload);
      // The server only echoes back { id }, so merge the full payload so the
      // question list can render options and the correct answer immediately.
      const serverId = res?.data?.id;
      const item = {
        ...payload,
        id: serverId || `tmp-${Date.now()}`,
      };
      setQuestions((qs) => [...qs, item]);
      toast?.success?.("Question added");
    },
    [quizId, toast]
  );

  const updateQuestionById = useCallback(
    async (editing, payload) => {
      if (!quizId || !editing?.id) return;
      await updateQuestion(quizId, editing.id, payload);
      // Merge payload over the existing question; the server doesn't echo fields.
      setQuestions((qs) =>
        qs.map((q) => (q.id === editing.id ? { ...q, ...payload, id: editing.id } : q))
      );
      toast?.success?.("Question updated");
    },
    [quizId, toast]
  );

  const removeQuestion = useCallback(
    async (q) => {
      if (!quizId || !q?.id) return;
      try {
        await deleteQuestion(quizId, q.id);
      } catch {
        /* ignore */
      }
      setQuestions((qs) => qs.filter((x) => x.id !== q.id));
      toast?.success?.("Question deleted");
    },
    [quizId, toast]
  );

  const reorderQuestions = useCallback((type, orderedIdsInType) => {
    setQuestions((qs) => {
      const typeQs = qs.filter((q) => (q.type || "multiple_choice") === type);
      const otherQs = qs.filter((q) => (q.type || "multiple_choice") !== type);
      const orderedByType = orderedIdsInType
        .map((id) => typeQs.find((q) => q.id === id))
        .filter(Boolean);
      const reordered = [];
      let ti = 0;
      let oi = 0;
      for (const q of qs) {
        const qt = q.type || "multiple_choice";
        if (qt === type) {
          if (ti < orderedByType.length) {
            reordered.push(orderedByType[ti]);
            ti += 1;
          }
        } else if (oi < otherQs.length) {
          reordered.push(otherQs[oi]);
          oi += 1;
        }
      }
      return reordered;
    });
  }, []);

  const loadQuestions = useCallback(async () => {
    if (!quizId) return;
    try {
      const res = await getQuestions(quizId);
      const list = res?.data?.questions || res?.data || [];
      setQuestions(
        Array.isArray(list)
          ? list.map((q) => ({
              ...q,
              id: q.id,
              // Server returns options/correct_answer as JSON strings; parse so
              // the question list can render options and the correct answer.
              options: safeParse(q.options),
              correct_answer: safeParse(q.correct_answer),
            }))
          : []
      );
    } catch {
      /* ignore */
    }
  }, [quizId]);

  const reset = useCallback(() => {
    setStep(1);
    setSettings({ ...DEFAULT_SETTINGS });
    setQuizId(null);
    setQuestions([]);
    setErrors({});
    setSavingStep(null);
  }, []);

  const finish = useCallback(
    (openBuilder = false) => {
      onComplete?.({ quizId, questionCount: questions.length, openBuilder });
      reset();
    },
    [onComplete, quizId, questions.length, reset]
  );

  const cancel = useCallback(() => {
    reset();
    onCancel?.();
  }, [onCancel, reset]);

  return {
    step,
    setStep,
    settings,
    setField,
    errors,
    quizId,
    questions,
    savingStep,
    submitStep1,
    addQuestion,
    updateQuestion: updateQuestionById,
    removeQuestion,
    reorderQuestions,
    loadQuestions,
    finish,
    cancel,
  };
}
