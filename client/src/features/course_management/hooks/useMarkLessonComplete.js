import { useState, useCallback, useRef } from "react";
import { markLessonComplete } from "../services/lesson-progress.service";

export function useMarkLessonComplete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const complete = useCallback(async (lessonId) => {
    setLoading(true);
    setError(null);
    try {
      return await markLessonComplete(lessonId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { complete, loading, error };
}
