import { useCallback, useMemo, useState } from 'react';

export function useSOPFilters(sops = []) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredSops = useMemo(() => {
    let result = Array.isArray(sops) ? sops : [];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((sop) => {
        const haystack = `${sop.title || ''} ${sop.code || ''} ${sop.description || ''}`.toLowerCase();
        return haystack.includes(term);
      });
    }

    if (statusFilter) {
      result = result.filter((sop) => sop.status === statusFilter);
    }

    if (departmentFilter) {
      result = result.filter((sop) => String(sop.department_id) === String(departmentFilter));
    }

    if (categoryFilter) {
      result = result.filter((sop) => String(sop.category_id) === String(categoryFilter));
    }

    return result;
  }, [sops, search, statusFilter, departmentFilter, categoryFilter]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setDepartmentFilter('');
    setCategoryFilter('');
  }, []);

  const hasActiveFilters = useMemo(
    () => !!(search || statusFilter || departmentFilter || categoryFilter),
    [search, statusFilter, departmentFilter, categoryFilter],
  );

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    categoryFilter,
    setCategoryFilter,
    filteredSops,
    resetFilters,
    hasActiveFilters,
  };
}

export default useSOPFilters;

