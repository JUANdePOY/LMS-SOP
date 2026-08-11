import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const HierarchyContext = createContext(null);

/**
 * HierarchyContext
 *
 * Holds transient UI state for the organization hierarchy tree. Only "mode"
 * state that multiple tree nodes need to read/toggle lives here (expansion,
 * inline-create mode, selection). The actual create/refresh side-effects stay
 * in the page that owns the data hooks, keeping this context free of
 * duplicated API calls.
 */
export function HierarchyProvider({ children }) {
  const [expandedBusinessIds, setExpandedBusinessIds] = useState(() => new Set());
  const [expandedDeptIds, setExpandedDeptIds] = useState(() => new Set());
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(() => new Set());
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Inline (folder/file-style) creation mode. Each holds the parent id of the
  // node currently in "create" mode, or null when idle. Only one inline editor
  // is active at a time.
  const [creatingDepartmentFor, setCreatingDepartmentFor] = useState(null);
  const [creatingCategoryFor, setCreatingCategoryFor] = useState(null);
  // SOP inline mode: { departmentId, categoryId | null } | null
  const [creatingSopFor, setCreatingSopFor] = useState(null);

  const toggleBusiness = useCallback((id) => {
    setExpandedBusinessIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleDepartment = useCallback((id) => {
    setExpandedDeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((id) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectDepartment = useCallback((dept) => {
    setSelectedDepartment(dept);
    setSelectedCategory(null);
  }, []);

  const selectCategory = useCallback((category) => {
    setSelectedCategory(category);
    setSelectedDepartment(null);
  }, []);

  // Inline (folder-style) creation mode: Department under a Business.
  const startCreateDepartment = useCallback((businessId) => {
    setCreatingDepartmentFor(businessId);
  }, []);

  const cancelCreateDepartment = useCallback(() => {
    setCreatingDepartmentFor(null);
  }, []);

  // Inline (folder-style) creation mode: Category under a Department.
  const startCreateCategory = useCallback((departmentId) => {
    setCreatingCategoryFor(departmentId);
  }, []);

  const cancelCreateCategory = useCallback(() => {
    setCreatingCategoryFor(null);
  }, []);

  // Inline (file-style) creation mode: SOP under a Department (+ optional Category).
  const startCreateSop = useCallback((departmentId, categoryId = null) => {
    setCreatingSopFor({ departmentId, categoryId });
  }, []);

  const cancelCreateSop = useCallback(() => {
    setCreatingSopFor(null);
  }, []);

  const value = useMemo(
    () => ({
      expandedBusinessIds,
      expandedDeptIds,
      expandedCategoryIds,
      selectedDepartment,
      selectedCategory,
      toggleBusiness,
      toggleDepartment,
      toggleCategory,
      selectDepartment,
      selectCategory,
      creatingDepartmentFor,
      startCreateDepartment,
      cancelCreateDepartment,
      creatingCategoryFor,
      startCreateCategory,
      cancelCreateCategory,
      creatingSopFor,
      startCreateSop,
      cancelCreateSop,
    }),
    [
      expandedBusinessIds,
      expandedDeptIds,
      expandedCategoryIds,
      selectedDepartment,
      selectedCategory,
      toggleBusiness,
      toggleDepartment,
      toggleCategory,
      selectDepartment,
      selectCategory,
      creatingDepartmentFor,
      startCreateDepartment,
      cancelCreateDepartment,
      creatingCategoryFor,
      startCreateCategory,
      cancelCreateCategory,
      creatingSopFor,
      startCreateSop,
      cancelCreateSop,
    ]
  );

  return <HierarchyContext.Provider value={value}>{children}</HierarchyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHierarchyContext() {
  const ctx = useContext(HierarchyContext);
  if (!ctx) {
    throw new Error('useHierarchyContext must be used within a HierarchyProvider');
  }
  return ctx;
}
export default HierarchyContext;
