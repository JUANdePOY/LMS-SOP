import { createContext, useContext } from "react";

const GradingContext = createContext(null);

export function GradingProvider({ children, value }) {
  return <GradingContext.Provider value={value}>{children}</GradingContext.Provider>;
}

export function useGradingContext() {
  const ctx = useContext(GradingContext);
  if (!ctx) throw new Error("useGradingContext must be used within a GradingProvider");
  return ctx;
}
