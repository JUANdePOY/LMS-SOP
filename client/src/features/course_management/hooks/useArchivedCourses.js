import { useState, useEffect, useCallback, useRef } from "react";

export function useArchivedCourses(params = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getCourseList } = await import("../api/course.api");
      const result = await getCourseList({ ...paramsRef.current, status: "archived" });
      if (!cancelRef.current) setData(result.data || result || []);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  return { data, loading, error, refetch: fetchArchived, setData };
}
