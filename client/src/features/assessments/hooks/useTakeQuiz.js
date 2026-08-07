import { useState, useCallback, useRef, useEffect } from "react";
import {
  startAttempt,
  submitAttempt,
  saveDraftAttempt,
  cancelAttempt,
  logViolation,
} from "../api/attempt.api";
import { useToast } from "@/shared/components/ui/Toast";

export function useTakeQuiz() {
  const { toast } = useToast();
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [violationCount, setViolationCount] = useState(0);
  const [violationAction, setViolationAction] = useState("none");
  const [limitReached, setLimitReached] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);
  const draftRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => clearTimer, []);

  const startTimer = useCallback(
    (seconds) => {
      if (!seconds || seconds <= 0) return;
      clearTimer();
      timerRef.current = setInterval(() => {
        setTimeElapsed((t) => {
          if (t + 1 >= seconds) {
            clearTimer();
            return t + 1;
          }
          return t + 1;
        });
      }, 1000);
    },
    [clearTimer]
  );

  const start = useCallback(
    async (quizId) => {
      setStatus("loading");
      setLimitReached(null);
      setError(null);
      try {
        const res = await startAttempt(quizId);
        setQuiz(res.quiz || null);
        setAttempt(res.data || null);
        setAnswers((res.data && res.data.answers) || {});
        setCurrentIndex(0);
        setTimeElapsed(0);
        setViolationCount(0);
        setViolationAction("none");
        setError(null);
        setStatus("playing");
        if (res.quiz && res.quiz.time_limit) {
          startTimer(Number(res.quiz.time_limit) * 60);
        }
        if (res.resumed) toast.info("Resumed your previous attempt.");
      } catch (err) {
        if (err.status === 403 || err.code === "ATTEMPT_LIMIT_REACHED") {
          setLimitReached(err.data || null);
          setStatus("limit_reached");
        } else {
          setError(err.message || "Failed to start quiz");
          setStatus("error");
          toast.error(err.message || "Failed to start quiz");
        }
      }
    },
    [toast, startTimer]
  );

  const reset = useCallback(() => {
    clearTimer();
    if (draftRef.current) clearTimeout(draftRef.current);
    setStatus("idle");
    setQuiz(null);
    setAttempt(null);
    setAnswers({});
    setCurrentIndex(0);
    setTimeElapsed(0);
    setResult(null);
    setLimitReached(null);
    setError(null);
  }, [clearTimer]);

  const setAnswer = useCallback(
    (questionId, value) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: value };
        if (attempt && attempt.id) {
          if (draftRef.current) clearTimeout(draftRef.current);
          setSaving(true);
          draftRef.current = setTimeout(() => {
            saveDraftAttempt(attempt.id, { answers: next })
              .catch(() => {})
              .finally(() => setSaving(false));
          }, 2000);
        }
        return next;
      });
    },
    [attempt]
  );

  const goTo = useCallback((idx) => setCurrentIndex(idx), []);

  const submit = useCallback(
    async () => {
      if (!attempt || !attempt.id || status !== "playing") return;
      clearTimer();
      setStatus("submitting");
      try {
        const res = await submitAttempt(attempt.id, { answers, timeTakenSec: timeElapsed });
        const payload = res.data || {};
        setResult(payload.result);
        setAttempt((a) => ({ ...a, ...(payload.attempt || {}) }));
        setStatus("submitted");
        toast.success("Quiz submitted");
      } catch (err) {
        setError(err.message || "Failed to submit quiz");
        setStatus("playing");
        toast.error(err.message || "Failed to submit quiz");
      }
    },
    [attempt, answers, timeElapsed, status, clearTimer, toast]
  );

  const cancel = useCallback(
    async () => {
      if (!attempt || !attempt.id) return;
      try {
        await cancelAttempt(attempt.id);
        reset();
        toast.info("Attempt cancelled");
      } catch (err) {
        toast.error(err.message || "Failed to cancel attempt");
      }
    },
    [attempt, reset, toast]
  );

  const reportViolation = useCallback(
    async (type, metadata = {}) => {
      if (!attempt || !attempt.id) return "none";
      setViolationCount((c) => c + 1);
      try {
        const response = await logViolation({
          attemptId: attempt.id,
          quizId: quiz && quiz.id,
          type,
          metadata,
        });
        const action = (response && response.data && response.data.action) || "none";
        setViolationAction(action);
        if (action === "autosubmit") {
          toast.warning("Too many integrity violations. Submitting automatically.");
          await submit();
        } else {
          toast.warning("Integrity warning recorded. Please keep the quiz in focus.");
        }
        return action;
      } catch {
        return "none";
      }
    },
    [attempt, quiz, submit, toast]
  );

  // Auto-submit when the timer runs out (time_limit is stored in minutes)
  useEffect(() => {
    if (status === "playing" && quiz && quiz.time_limit && timeElapsed >= Number(quiz.time_limit) * 60) {
      const t = setTimeout(() => submit(), 300);
      return () => clearTimeout(t);
    }
  }, [status, quiz, timeElapsed, submit]);

  const questions = quiz ? (quiz.questions || []) : [];
  const timeLimit = quiz ? Number(quiz.time_limit) * 60 : 0;

  return {
    quiz,
    attempt,
    answers,
    questions,
    currentIndex,
    timeElapsed,
    timeLimit,
    status,
    result,
    violationCount,
    violationAction,
    limitReached,
    error,
    saving,
    start,
    reset,
    setAnswer,
    goTo,
    submit,
    cancel,
    reportViolation,
    startTimer,
  };
}
