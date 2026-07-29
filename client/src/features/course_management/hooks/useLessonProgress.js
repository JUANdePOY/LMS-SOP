import { useState, useEffect, useCallback, useRef } from "react";
import { getCourseProgress } from "../services/lesson-progress.service";

export function useLessonProgress(courseId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  const fetchProgress = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const result = await getCourseProgress(courseId);
      if (!cancelRef.current) setData(result.data || result);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchProgress();
    return () => { cancelRef.current = true; };
  }, [fetchProgress]);

  return { data, loading, error, refetch: fetchProgress };
}
