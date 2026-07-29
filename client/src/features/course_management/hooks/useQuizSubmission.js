import { useState, useCallback, useRef } from "react";

export function useQuizSubmission() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async (quizId, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { submitQuiz } = await import("../api/quiz.api");
      return await submitQuiz(quizId, payload);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading, error, setError };
}
