import { useState, useEffect, useCallback, useRef } from "react";

export function useCourseLibraryDetails(courseId) {
  const [course, setCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);

  const fetchDetails = useCallback(async (id) => {
    const currentId = id || courseId;
    if (!currentId) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getCourseLibraryDetails, getCourseEnrollments, getCourseAnalytics } = await import("../services/library.api");
      const [courseRes, enrollmentsRes, analyticsRes] = await Promise.allSettled([
        getCourseLibraryDetails(currentId),
        getCourseEnrollments(currentId),
        getCourseAnalytics(currentId),
      ]);

      if (!cancelRef.current) {
        if (courseRes.status === "fulfilled") {
          setCourse(courseRes.value.data || courseRes.value);
        }
        if (enrollmentsRes.status === "fulfilled") {
          const data = enrollmentsRes.value.data?.rows || enrollmentsRes.value.data || [];
          setEnrollments(Array.isArray(data) ? data : []);
        }
        if (analyticsRes.status === "fulfilled") {
          setAnalytics(analyticsRes.value.data || analyticsRes.value);
        }
      }
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchDetails();
    return () => { cancelRef.current = true; };
  }, [fetchDetails]);

  return { course, enrollments, analytics, loading, error, refetch: fetchDetails, setEnrollments };
}

export default useCourseLibraryDetails;
