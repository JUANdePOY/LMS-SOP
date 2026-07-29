import { useState, useEffect, useCallback, useRef } from "react";

export function useAssignments(courseId, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const courseIdRef = useRef(courseId);
  const filtersRef = useRef(filters);
  courseIdRef.current = courseId;
  filtersRef.current = filters;

  const fetchAssignments = useCallback(async () => {
    if (!courseIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getAssignments } = await import("../api/assignment.api");
      const result = await getAssignments(courseIdRef.current, filtersRef.current);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    return () => { cancelRef.current = true; };
  }, [fetchAssignments]);

  return { data, loading, error, refetch: fetchAssignments, setData };
}
