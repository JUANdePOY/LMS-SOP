import { createContext, useContext, useState, useCallback } from "react";

const HierarchyContext = createContext(null);

/**
 * HierarchyProvider
 * Centralized state for the Area → ARCEN → Group → Squadron drill-down.
 * Wrap any component with this provider.
 */
export function HierarchyProvider({ children }) {
  const [expandedAreaId,   setExpandedAreaId]   = useState(null);
  const [expandedArcenId,  setExpandedArcenId]  = useState(null);
  const [expandedGroupId,  setExpandedGroupId]  = useState(null);
  const [selectedSquadron, setSelectedSquadron] = useState(null);

  /** Toggle an Area. Collapses ARCEN/Group/Squadron when switching. */
  const toggleArea = useCallback((id) => {
    setExpandedAreaId((prev) => {
      if (prev === id) {
        // Collapsing — reset children
        setExpandedArcenId(null);
        setExpandedGroupId(null);
        setSelectedSquadron(null);
        return null;
      }
      // Switching to a new area — reset children
      setExpandedArcenId(null);
      setExpandedGroupId(null);
      setSelectedSquadron(null);
      return id;
    });
  }, []);

  /** Toggle an ARCEN. Collapses Group/Squadron when switching. */
  const toggleArcen = useCallback((id) => {
    setExpandedArcenId((prev) => {
      if (prev === id) {
        setExpandedGroupId(null);
        setSelectedSquadron(null);
        return null;
      }
      setExpandedGroupId(null);
      setSelectedSquadron(null);
      return id;
    });
  }, []);

  /** Toggle a Group. Clears selected Squadron when switching. */
  const toggleGroup = useCallback((id) => {
    setExpandedGroupId((prev) => {
      if (prev === id) {
        setSelectedSquadron(null);
        return null;
      }
      setSelectedSquadron(null);
      return id;
    });
  }, []);

  /** Select a Squadron (leaf node). */
  const selectSquadron = useCallback((squadron) => {
    setSelectedSquadron((prev) =>
      prev?.id === squadron.id ? null : squadron
    );
  }, []);

  /** Reset entire hierarchy. */
  const resetAll = useCallback(() => {
    setExpandedAreaId(null);
    setExpandedArcenId(null);
    setExpandedGroupId(null);
    setSelectedSquadron(null);
  }, []);

  return (
    <HierarchyContext.Provider value={{
      expandedAreaId,
      expandedArcenId,
      expandedGroupId,
      selectedSquadron,
      toggleArea,
      toggleArcen,
      toggleGroup,
      selectSquadron,
      resetAll,
    }}>
      {children}
    </HierarchyContext.Provider>
  );
}

/** Hook — use inside any hierarchy component */
export function useHierarchy() {
  const ctx = useContext(HierarchyContext);
  if (!ctx) throw new Error("useHierarchy must be used inside <HierarchyProvider>");
  return ctx;
}
