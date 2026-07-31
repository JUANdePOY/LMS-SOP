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

export function useEmployeeDashboard(params = {}) {
  const [enrollments, setEnrollments] = useState([]);
  const [publishedCourses, setPublishedCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getEmployeeEnrollmentsWithCourses, getPublishedCoursesForEmployee } = await import("../api/employee.api");
      const [enrollmentsRes, coursesRes] = await Promise.allSettled([
        getEmployeeEnrollmentsWithCourses(paramsRef.current),
        getPublishedCoursesForEmployee({ limit: 12, page: 1 }),
      ]);

      if (!cancelRef.current) {
        if (enrollmentsRes.status === "fulfilled") {
          setEnrollments(enrollmentsRes.value?.data || []);
        }
        if (coursesRes.status === "fulfilled") {
          const data = coursesRes.value?.data?.rows || coursesRes.value?.data || [];
          setPublishedCourses(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  const paramsKey = serializeParams(params);
  useEffect(() => {
    fetchDashboard();
    return () => { cancelRef.current = true; };
  }, [fetchDashboard, paramsKey]);

  return { enrollments, publishedCourses, loading, error, refetch: fetchDashboard };
}

export function useEmployeeCourseCatalog(params = {}) {
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
    try {
      const { getPublishedCoursesForEmployee } = await import("../api/employee.api");
      const result = await getPublishedCoursesForEmployee(queryParams);
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
  }, []);

  const paramsKey = serializeParams(params);
  useEffect(() => {
    fetchCourses();
    return () => { cancelRef.current = true; };
  }, [fetchCourses, paramsKey]);

  return { courses, loading, error, pagination, refetch: fetchCourses };
}

export default useEmployeeDashboard;
