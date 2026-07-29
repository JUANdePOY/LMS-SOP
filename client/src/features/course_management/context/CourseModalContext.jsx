import { createContext, useContext } from "react";

const CourseModalContext = createContext(null);

export function CourseModalProvider({ children, value }) {
  return <CourseModalContext.Provider value={value}>{children}</CourseModalContext.Provider>;
}

export function useCourseModalContext() {
  const ctx = useContext(CourseModalContext);
  if (!ctx) throw new Error("useCourseModalContext must be used within a CourseModalProvider");
  return ctx;
}
