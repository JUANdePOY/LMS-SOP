import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const HierarchyContext = createContext(null);

export function HierarchyProvider({ children }) {
  const [expandedBusinessIds, setExpandedBusinessIds] = useState(() => new Set());
  const [expandedDeptIds, setExpandedDeptIds] = useState(() => new Set());
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(() => new Set());
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sopModalOpen, setSopModalOpen] = useState(false);
  const [createSopContext, setCreateSopContext] = useState(null);

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

  const openSopModal = useCallback(() => setSopModalOpen(true), []);
  const closeSopModal = useCallback(() => setSopModalOpen(false), []);

  const openCreateSop = useCallback((departmentId, categoryId = null) => {
    setCreateSopContext({ departmentId, categoryId });
    setSopModalOpen(true);
  }, []);

  const closeCreateSop = useCallback(() => {
    setCreateSopContext(null);
    setSopModalOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      expandedBusinessIds,
      expandedDeptIds,
      expandedCategoryIds,
      selectedDepartment,
      selectedCategory,
      sopModalOpen,
      createSopContext,
      toggleBusiness,
      toggleDepartment,
      toggleCategory,
      selectDepartment,
      selectCategory,
      openSopModal,
      closeSopModal,
      openCreateSop,
      closeCreateSop,
    }),
    [
      expandedBusinessIds,
      expandedDeptIds,
      expandedCategoryIds,
      selectedDepartment,
      selectedCategory,
      sopModalOpen,
      createSopContext,
      toggleBusiness,
      toggleDepartment,
      toggleCategory,
      selectDepartment,
      selectCategory,
      openSopModal,
      closeSopModal,
      openCreateSop,
      closeCreateSop,
    ]
  );

  return <HierarchyContext.Provider value={value}>{children}</HierarchyContext.Provider>;
}

export function useHierarchyContext() {
  const ctx = useContext(HierarchyContext);
  if (!ctx) {
    throw new Error('useHierarchyContext must be used within a HierarchyProvider');
  }
  return ctx;
}

export default HierarchyContext;
