import { useState, useEffect, useRef, useCallback } from "react";
import { fetchEmployees } from "../services/directoryService";

export function useEmployeeDirectory({ limit = 24 } = {}) {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reqId = useRef(0);

  const load = useCallback(
    async (query, dept, pageNum) => {
      const id = ++reqId.current;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchEmployees({
          search: query,
          department_id: dept,
          page: pageNum,
          limit,
        });
        if (id !== reqId.current) return;
        setEmployees(result.employees);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (err) {
        if (id !== reqId.current) return;
        setError(err?.response?.data?.message || err.message || "Failed to load employees");
        setEmployees([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [limit]
  );

  // Debounced fetch on search/filter/page change.
  useEffect(() => {
    const timer = setTimeout(() => {
      load(search, departmentId, page);
    }, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [search, departmentId, page, load]);

  const resetToFirstPage = useCallback(() => setPage(1), []);

  const changeSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  const changeDepartment = useCallback((value) => {
    setDepartmentId(value);
    setPage(1);
  }, []);

  return {
    employees,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error,
    search,
    changeSearch,
    departmentId,
    changeDepartment,
    resetToFirstPage,
  };
}
