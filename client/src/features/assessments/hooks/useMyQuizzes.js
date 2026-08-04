import { useState, useEffect, useCallback } from "react";
import { getMyQuizzes } from "../api/quiz.api";

export function useMyQuizzes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyQuizzes();
      console.log('[useMyQuizzes] response:', res);
      setData(res.data || []);
    } catch (err) {
      console.error('[useMyQuizzes] error:', err);
      setError(err.message || "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
