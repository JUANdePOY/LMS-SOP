import { createContext, useContext } from "react";

const EnrollmentContext = createContext(null);

export function EnrollmentProvider({ children, value }) {
  return <EnrollmentContext.Provider value={value}>{children}</EnrollmentContext.Provider>;
}

export function useEnrollmentContext() {
  const ctx = useContext(EnrollmentContext);
  if (!ctx) throw new Error("useEnrollmentContext must be used within an EnrollmentProvider");
  return ctx;
}
