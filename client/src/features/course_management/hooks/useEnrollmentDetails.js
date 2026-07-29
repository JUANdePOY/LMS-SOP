import { useState, useEffect, useCallback, useRef } from "react";

export function useEnrollmentDetails(enrollmentId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const enrollmentIdRef = useRef(enrollmentId);
  enrollmentIdRef.current = enrollmentId;

  const fetchDetails = useCallback(async () => {
    if (!enrollmentIdRef.current) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const { getEnrollmentDetails } = await import("../api/enrollment.api");
      const result = await getEnrollmentDetails(enrollmentIdRef.current);
      if (!cancelRef.current) setData(result.data || result);
    } catch (err) {
      if (!cancelRef.current) setError(err.message);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetails();
    return () => { cancelRef.current = true; };
  }, [fetchDetails]);

  return { data, loading, error, refetch: fetchDetails, setData };
}
