import { useState, useEffect, useCallback } from "react";
import { getQuizzes } from "../api/quiz.api";

export function useQuizzes(courseId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuizzes = useCallback(async () => {
    if (!courseId) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getQuizzes(courseId);
      setData(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  return { data, loading, error, refetch: fetchQuizzes };
}
