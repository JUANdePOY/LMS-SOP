import { createContext, useContext } from "react";

const CourseContext = createContext(null);

export function CourseProvider({ children, value }) {
  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourseContext() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourseContext must be used within a CourseProvider");
  return ctx;
}
