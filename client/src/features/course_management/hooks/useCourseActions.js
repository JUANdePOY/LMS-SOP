import { useState, useCallback } from "react";

/**
 * Archive / publish actions for courses. Mirrors useDeleteCourse so course
 * management pages can toggle a course's published/archived state from the
 * same SOP-style action row used everywhere else.
 */
export function useCourseActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (fn, id) => {
    setLoading(true);
    setError(null);
    try {
      const mod = await import("../api/course.api");
      return await fn(mod, id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const archive = useCallback((id) => run((m, i) => m.archiveCourse(i), id), [run]);
  const publish = useCallback((id) => run((m, i) => m.publishCourse(i), id), [run]);
  const unarchive = publish;

  return { archive, publish, unarchive, loading, error, setError };
}
