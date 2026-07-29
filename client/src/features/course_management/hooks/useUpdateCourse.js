import { useState, useCallback, useRef } from "react";

export function useUpdateCourse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { updateCourse } = await import("../api/course.api");
      return await updateCourse(id, payload);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error, setError };
}
