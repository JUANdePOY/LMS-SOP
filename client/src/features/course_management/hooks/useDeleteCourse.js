import { useState, useCallback, useRef } from "react";

export function useDeleteCourse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { deleteCourse } = await import("../api/course.api");
      return await deleteCourse(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error, setError };
}
