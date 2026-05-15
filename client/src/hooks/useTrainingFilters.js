import { useState, useEffect } from 'react';

const useTrainingFilters = () => {
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: '',
    dateRange: null
  });

  // Optionally, persist filters to localStorage or update URL parameters
  useEffect(() => {
    // Example: Save filters to localStorage
    // localStorage.setItem('trainingFilters', JSON.stringify(filters));
  }, [filters]);

  return {
    filters,
    setFilters
  };
};

export default useTrainingFilters;