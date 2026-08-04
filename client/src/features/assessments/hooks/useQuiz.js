import { useState, useEffect, useCallback } from "react";
import { getQuizById, getQuestions } from "../api/quiz.api";

function safeParse(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function useQuiz(quizId) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const [qRes, qsRes] = await Promise.all([getQuizById(quizId), getQuestions(quizId)]);
      setQuiz(qRes?.data || null);
      const list = Array.isArray(qsRes?.data) ? qsRes.data : Array.isArray(qsRes?.data?.data) ? qsRes.data.data : [];
      setQuestions(
        list.map((q) => ({
          ...q,
          options: safeParse(q.options),
          correct_answer: safeParse(q.correct_answer),
        }))
      );
    } catch (err) {
      setError(err.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  return { quiz, questions, loading, error, refetch: fetchQuiz };
}