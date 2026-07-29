import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const HierarchyContext = createContext(null);

export function HierarchyProvider({ children }) {
  const [expandedBusinessIds, setExpandedBusinessIds] = useState(() => new Set());
  const [expandedDeptIds, setExpandedDeptIds] = useState(() => new Set());
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [sopModalOpen, setSopModalOpen] = useState(false);

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

  const selectDepartment = useCallback((dept) => {
    setSelectedDepartment(dept);
  }, []);

  const openSopModal = useCallback(() => setSopModalOpen(true), []);
  const closeSopModal = useCallback(() => setSopModalOpen(false), []);

  const value = useMemo(
    () => ({
      expandedBusinessIds,
      expandedDeptIds,
      selectedDepartment,
      sopModalOpen,
      toggleBusiness,
      toggleDepartment,
      selectDepartment,
      openSopModal,
      closeSopModal,
    }),
    [
      expandedBusinessIds,
      expandedDeptIds,
      selectedDepartment,
      sopModalOpen,
      toggleBusiness,
      toggleDepartment,
      selectDepartment,
      openSopModal,
      closeSopModal,
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
