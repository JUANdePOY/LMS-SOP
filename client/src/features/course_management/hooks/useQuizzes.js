import { useState, useEffect, useCallback, useRef } from "react";

export function useQuizzes(courseId, filters = {}, options = {}) {
  const { isSuperAdmin = false, isAdmin = false } = options;
  const showAll = isSuperAdmin || isAdmin;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const courseIdRef = useRef(courseId);
  const filtersRef = useRef(filters);
  const showAllRef = useRef(showAll);
  courseIdRef.current = courseId;
  filtersRef.current = filters;
  showAllRef.current = showAll;

  const fetchQuizzes = useCallback(async () => {
    if (!showAllRef.current && !courseIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getQuizzes, getAllQuizzes } = await import("../api/quiz.api");
      const result = showAllRef.current
        ? await getAllQuizzes(filtersRef.current)
        : await getQuizzes(courseIdRef.current, filtersRef.current);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  const createQuiz = useCallback(async (payload) => {
    try {
      const { createQuiz: apiCreateQuiz } = await import("../api/quiz.api");
      const result = await apiCreateQuiz({ ...payload, courseId: courseIdRef.current });
      await fetchQuizzes();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchQuizzes]);

  const updateQuizStatus = useCallback(async (id, action) => {
    try {
      const { publishQuiz: apiPublish, archiveQuiz: apiArchive, updateQuiz: apiUpdate } = await import("../api/quiz.api");
      if (action === "publish") await apiPublish(id);
      else if (action === "archive") await apiArchive(id);
      else if (action) await apiUpdate(id, action);
      setData(prev => prev.map(q => q.id === id ? { ...q, status: action === "publish" ? "published" : "archived" } : q));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
    return () => { cancelRef.current = true; };
  }, [fetchQuizzes]);

  return { data, loading, error, refetch: fetchQuizzes, createQuiz, updateQuizStatus, setData, showAll };
}
