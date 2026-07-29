import { useState, useEffect, useCallback, useRef } from "react";

export function useProgressTracking(courseId, userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const courseIdRef = useRef(courseId);
  const userIdRef = useRef(userId);
  courseIdRef.current = courseId;
  userIdRef.current = userId;

  const fetchProgress = useCallback(async () => {
    if (!courseIdRef.current || !userIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getCourseProgress } = await import("../api/progress.api");
      const result = await getCourseProgress(courseIdRef.current, userIdRef.current);
      if (!cancelRef.current) setData(result.data || result);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  const markComplete = useCallback(async (moduleId, contentId) => {
    try {
      const { markContentComplete } = await import("../api/progress.api");
      return await markContentComplete(courseIdRef.current, moduleId, contentId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchProgress();
    return () => { cancelRef.current = true; };
  }, [fetchProgress]);

  return { data, loading, error, refetch: fetchProgress, markComplete, setData };
}
