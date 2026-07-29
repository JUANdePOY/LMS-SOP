import { useState, useEffect, useCallback, useRef } from "react";

export function useAnalytics(courseId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const courseIdRef = useRef(courseId);
  courseIdRef.current = courseId;

  const fetchAnalytics = useCallback(async () => {
    if (!courseIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getCourseAnalytics } = await import("../api/analytics.api");
      const result = await getCourseAnalytics(courseIdRef.current);
      if (!cancelRef.current) setData(result.data || result);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    return () => { cancelRef.current = true; };
  }, [fetchAnalytics]);

  return { data, loading, error, refetch: fetchAnalytics, setData };
}
