import { useState, useMemo, useCallback } from "react";

export function useCourseFilters(initial = {}) {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    difficulty: "",
    instructor: "",
    ...initial,
  });

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ search: "", category: "", status: "", difficulty: "", instructor: "" });
  }, []);

  const activeCount = useMemo(() => {
    return Object.values(filters).filter((v) => v && v !== "").length;
  }, [filters]);

  return { filters, updateFilter, resetFilters, activeCount, setFilters };
}
