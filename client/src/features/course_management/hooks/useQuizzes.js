import { useState, useEffect, useCallback, useRef } from "react";

export function useQuizzes(courseId, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const courseIdRef = useRef(courseId);
  const filtersRef = useRef(filters);
  courseIdRef.current = courseId;
  filtersRef.current = filters;

  const fetchQuizzes = useCallback(async () => {
    if (!courseIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getQuizzes } = await import("../api/quiz.api");
      const result = await getQuizzes(courseIdRef.current, filtersRef.current);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
    return () => { cancelRef.current = true; };
  }, [fetchQuizzes]);

  return { data, loading, error, refetch: fetchQuizzes, setData };
}
