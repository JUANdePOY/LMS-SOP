import { useState, useEffect, useCallback, useRef } from "react";

export function useDiscussions(courseId, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const courseIdRef = useRef(courseId);
  const filtersRef = useRef(filters);
  courseIdRef.current = courseId;
  filtersRef.current = filters;

  const fetchDiscussions = useCallback(async () => {
    if (!courseIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getDiscussions } = await import("../api/discussion.api");
      const result = await getDiscussions(courseIdRef.current, filtersRef.current);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscussions();
    return () => { cancelRef.current = true; };
  }, [fetchDiscussions]);

  return { data, loading, error, refetch: fetchDiscussions, setData };
}
