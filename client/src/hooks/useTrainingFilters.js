import { useState, useEffect, useCallback } from 'react';

export const INITIAL_TRAINING_FILTERS = {
  search: '',
  status: 'all',
  activityType: 'all',
  source: 'all',
};

const useTrainingFilters = () => {
  const [filters, setFilters] = useState(INITIAL_TRAINING_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_TRAINING_FILTERS);
    setDebouncedSearch('');
  }, []);

  return {
    filters,
    setFilters,
    resetFilters,
    debouncedSearch,
  };
};

export default useTrainingFilters;
