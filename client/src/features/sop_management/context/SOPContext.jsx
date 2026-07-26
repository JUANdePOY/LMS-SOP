import { createContext, useContext, useMemo, useState } from 'react';

const SOPContext = createContext(null);

export function SOPProvider({ children }) {
  const [selectedSopId, setSelectedSopId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const value = useMemo(
    () => ({
      selectedSopId,
      setSelectedSopId,
      refreshKey,
      refreshSops: () => setRefreshKey((prev) => prev + 1),
    }),
    [selectedSopId, refreshKey]
  );

  return <SOPContext.Provider value={value}>{children}</SOPContext.Provider>;
}

export function useSOPContext() {
  const context = useContext(SOPContext);
  if (!context) {
    throw new Error('useSOPContext must be used within SOPProvider');
  }
  return context;
}

export default SOPContext;
