import { useState, useCallback, useRef } from "react";

export function useUnenrollStudent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const unenroll = useCallback(async (enrollmentId) => {
    setLoading(true);
    setError(null);
    try {
      const { unenrollStudent } = await import("../api/enrollment.api");
      return await unenrollStudent(enrollmentId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { unenroll, loading, error, setError };
}
