import { useState, useCallback, useRef } from "react";

export function useGradeSubmission() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitGrade = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { createGrade } = await import("../api/grade.api");
      return await createGrade(payload);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submitGrade, loading, error, setError };
}
