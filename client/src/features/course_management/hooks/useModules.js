import { useState, useEffect, useCallback, useRef } from "react";

export function useModules(courseId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const courseIdRef = useRef(courseId);
  courseIdRef.current = courseId;

  const fetchModules = useCallback(async () => {
    if (!courseIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getModules } = await import("../api/module.api");
      const result = await getModules(courseIdRef.current);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  const createModule = useCallback(async (payload) => {
    try {
      const { createModule } = await import("../api/module.api");
      return await createModule(courseIdRef.current, payload);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchModules();
    return () => { cancelRef.current = true; };
  }, [fetchModules]);

  return { data, loading, error, refetch: fetchModules, createModule, setData };
}
