import { useState, useEffect, useCallback, useRef } from "react";

export function useContentList(courseId, moduleId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const courseIdRef = useRef(courseId);
  const moduleIdRef = useRef(moduleId);
  courseIdRef.current = courseId;
  moduleIdRef.current = moduleId;

  const fetchContent = useCallback(async () => {
    if (!courseIdRef.current || !moduleIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getContent } = await import("../api/content.api");
      const result = await getContent(courseIdRef.current, moduleIdRef.current);
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  const createItem = useCallback(async (payload) => {
    try {
      const { createContent } = await import("../api/content.api");
      return await createContent(courseIdRef.current, moduleIdRef.current, payload);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return { data, loading, error, refetch: fetchContent, createItem, setData };
}
