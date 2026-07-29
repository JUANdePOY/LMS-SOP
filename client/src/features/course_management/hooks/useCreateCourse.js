import { useState, useEffect, useCallback, useRef } from "react";

export function useCreateCourse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { createCourse } = await import("../api/course.api");
      return await createCourse(payload);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error, setError };
}
