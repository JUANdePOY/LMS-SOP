import { useState, useEffect, useCallback, useRef } from "react";

export function useProgressTracking(courseId, userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  const fetchProgress = useCallback(async () => {
    if (!courseId || Number.isNaN(Number(courseId)) || !userId) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getCourseProgress } = await import("../api/progress.api");
      const result = await getCourseProgress(courseId, userId);
      if (!cancelRef.current) setData(result.data || result);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, [courseId, userId]);

  const markComplete = useCallback(async (moduleId, contentId) => {
    if (!courseId) return;
    try {
      const { markContentComplete } = await import("../api/progress.api");
      return await markContentComplete(courseId, moduleId, contentId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [courseId]);

  useEffect(() => {
    fetchProgress();
    return () => { cancelRef.current = true; };
  }, [fetchProgress]);

  return { data, loading, error, refetch: fetchProgress, markComplete, setData };
}
