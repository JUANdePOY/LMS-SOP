import { createContext, useContext, useState } from 'react';

const SOPContext = createContext(null);

export function SOPProvider({ children }) {
  const [selectedSopId, setSelectedSopId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <SOPContext.Provider value={{ selectedSopId, setSelectedSopId, refreshKey, setRefreshKey }}>
      {children}
    </SOPContext.Provider>
  );
}

export function useSOP() {
  const context = useContext(SOPContext);
  if (!context) throw new Error('useSOP must be used within a SOPProvider');
  return context;
}

export default SOPContext;