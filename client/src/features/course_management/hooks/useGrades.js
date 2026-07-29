import { useState, useEffect, useCallback, useRef } from "react";

export function useGrades(params = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getGrades } = await import("../api/grade.api");
      const result = await getGrades(paramsRef.current);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
    return () => { cancelRef.current = true; };
  }, [fetchGrades]);

  return { data, loading, error, refetch: fetchGrades, setData };
}
