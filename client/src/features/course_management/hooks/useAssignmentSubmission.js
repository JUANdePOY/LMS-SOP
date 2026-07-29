import { useState, useCallback, useRef } from "react";

export function useAssignmentSubmission() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async (assignmentId, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { submitAssignment } = await import("../api/assignment.api");
      return await submitAssignment(assignmentId, payload);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading, error, setError };
}
