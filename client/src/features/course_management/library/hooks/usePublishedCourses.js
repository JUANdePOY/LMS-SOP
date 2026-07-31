import { useState, useEffect, useCallback, useRef } from "react";

function serializeParams(params) {
  if (!params) return "";
  return JSON.stringify(
    Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {})
  );
}

export function usePublishedCourses(params = {}) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const cancelRef = useRef(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchCourses = useCallback(async (p) => {
    const queryParams = p || paramsRef.current;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    let result;
    try {
      const { getPublishedCourses } = await import("../services/library.api");
      result = await getPublishedCourses(queryParams);
      if (!cancelRef.current) {
        const data = result.data?.rows || result.data || [];
        setCourses(Array.isArray(data) ? data : []);
        setPagination({
          page: result.pagination?.page || queryParams.page || 1,
          limit: result.pagination?.limit || queryParams.limit || 12,
          total: result.pagination?.total || data.length,
          totalPages: result.pagination?.totalPages || 1,
        });
      }
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
    return result;
  }, []);

  const paramsKey = serializeParams(params);

  useEffect(() => {
    fetchCourses();
    return () => { cancelRef.current = true; };
  }, [fetchCourses, paramsKey]);

  return { courses, loading, error, pagination, refetch: fetchCourses };
}

export default usePublishedCourses;
