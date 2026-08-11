import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate, useLocation } from 'react-router-dom';
import { globalSearch } from '@/services/api';

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 350);

  const reset = useCallback(() => {
    setQuery('');
    setResults({});
    setTotal(0);
    setError(null);
  }, []);

  const fetchResults = useCallback(async (searchTerm) => {
    if (!searchTerm) {
      setResults({});
      setTotal(0);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await globalSearch({ q: searchTerm });
      const payload = response?.data?.data || {};
      // The search API returns category results at the top level of `data`
      // (e.g. { users, courses, total, query }); fall back to a nested
      // `results` key for backwards compatibility.
      const resultsMap = payload.results && typeof payload.results === 'object' ? payload.results : payload;
      setResults(resultsMap || {});
      setTotal(payload.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Search failed');
      setResults({});
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(debouncedQuery);
  }, [debouncedQuery, fetchResults]);

  const navigateToResult = useCallback((category, item) => {
    const userId = item?.id ?? item?.user_id ?? item?.userId;
    const paths = {
      users: userId ? `/profile/${userId}` : undefined,
      courses: `/courses/${item.id}`,
      sops: `/sops/${item.id}`,
      departments: '/admin/organization/departments',
      announcements: '/announcements',
      events: '/events',
      quizzes: `/assessments/quiz/${item.id}`,
      tasks: `/tasks/${item.id}`,
      certificates: '/certificates',
      businesses: '/admin/organization/businesses',
      categories: '/admin/organization/categories',
    };
    const target = paths[category];
    if (!target) return;
    navigate(target);
    reset();
  }, [navigate, reset]);

  return {
    query,
    setQuery,
    results,
    total,
    isLoading,
    error,
    navigateToResult,
    reset,
  };
}
