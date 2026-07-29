import { useState, useEffect, useCallback, useRef } from "react";

export function useCourseDetails(courseId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const courseIdRef = useRef(courseId);
  courseIdRef.current = courseId;

  const fetchDetails = useCallback(async () => {
    if (!courseIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getCourseById } = await import("../api/course.api");
      const result = await getCourseById(courseIdRef.current);
      if (!cancelRef.current) setData(result.data || result);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetails();
    return () => { cancelRef.current = true; };
  }, [fetchDetails]);

  return { data, loading, error, refetch: fetchDetails, setData };
}
