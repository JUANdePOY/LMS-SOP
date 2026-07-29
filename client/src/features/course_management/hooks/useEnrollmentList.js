import { useState, useEffect, useCallback, useRef } from "react";

export function useEnrollmentList(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getEnrollments } = await import("../api/enrollment.api");
      const result = await getEnrollments(filtersRef.current);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnrollments();
    return () => { cancelRef.current = true; };
  }, [fetchEnrollments]);

  return { data, loading, error, refetch: fetchEnrollments, setData };
}
