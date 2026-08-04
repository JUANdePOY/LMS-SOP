import { useState, useEffect, useCallback } from "react";
import { getLeaderboard, getCourseLeaderboard } from "../api/quiz.api";

export function useLeaderboard(params) {
  const { quizId, courseId, limit } = params || {};
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!quizId && !courseId) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = quizId
        ? await getLeaderboard(quizId, limit)
        : await getCourseLeaderboard(courseId, limit);
      setData(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [quizId, courseId, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
