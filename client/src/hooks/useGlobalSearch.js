import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate, useLocation } from 'react-router-dom';

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
      const response = await fetchGlobalSearch(searchTerm);
      setResults(response.results || {});
      setTotal(response.total || 0);
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
    const paths = {
      users: `/profile/${item.id}`,
      courses: `/courses/${item.id}`,
      sops: `/sops/${item.id}`,
      departments: '/admin/organization/departments',
      announcements: '/announcements',
      events: '/events',
    };
    const target = paths[category];
    if (!target) return;
    if (location.pathname === target) {
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      navigate(target, { replace: true });
    }
    reset();
  }, [navigate, location.pathname, reset]);

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

function fetchGlobalSearch(searchTerm) {
  const params = new URLSearchParams({ q: searchTerm });
  return fetch(`/api/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${session.getCurrentToken() || ''}`,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.message || 'Search failed');
      err.response = { data };
      throw err;
    }
    return res.json().then((d) => d.data);
  });
}
