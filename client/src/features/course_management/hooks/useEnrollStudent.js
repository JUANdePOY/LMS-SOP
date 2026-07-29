import { useState, useCallback, useRef } from "react";

export function useEnrollStudent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const enroll = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { enrollStudent } = await import("../api/enrollment.api");
      return await enrollStudent(payload);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { enroll, loading, error, setError };
}
