import { useState, useEffect, useCallback, useRef } from "react";

export function useInstructorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getInstructorDashboard } = await import("../api/analytics.api");
      const result = await getInstructorDashboard();
      if (!cancelRef.current) setData(result.data || result);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    return () => { cancelRef.current = true; };
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard, setData };
}
