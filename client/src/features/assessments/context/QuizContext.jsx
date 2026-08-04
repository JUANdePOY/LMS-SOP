import { createContext, useContext } from "react";

const QuizContext = createContext(null);

export function QuizProvider({ children, value }) {
  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuizContext() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuizContext must be used within a QuizProvider");
  return ctx;
}
