import { useState, useEffect, useCallback } from "react";
import { getAllQuizzes } from "../api/quiz.api";

export function useQuizzesCatalog(filters = {}) {
  const [quizzes, setQuizzes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCatalog = useCallback(
    async (override = {}) => {
      const f = { ...filters, ...override };
      setLoading(true);
      setError(null);
      try {
        const res = await getAllQuizzes(f);
        setQuizzes(res.data || []);
        setPagination({
          page: Number(res.pagination?.page) || 1,
          limit: Number(res.pagination?.limit) || 20,
          total: Number(res.pagination?.total) || 0,
          totalPages: Number(res.pagination?.totalPages) || 1,
        });
      } catch (err) {
        setError(err.message || "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { quizzes, pagination, loading, error, refetch: fetchCatalog };
}
