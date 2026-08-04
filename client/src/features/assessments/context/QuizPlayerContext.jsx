import { createContext, useContext, useState } from "react";

const QuizPlayerContext = createContext(null);

export function QuizPlayerProvider({ children, initialState = {} }) {
  const [state, setState] = useState({
    answers: {},
    timeElapsed: 0,
    isSubmitting: false,
    ...initialState,
  });

  const setAnswer = (questionId, value) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value },
    }));
  };

  const updateTime = (elapsed) => setState((prev) => ({ ...prev, timeElapsed: elapsed }));

  const value = { state, setState, setAnswer, updateTime };

  return <QuizPlayerContext.Provider value={value}>{children}</QuizPlayerContext.Provider>;
}

export function useQuizPlayerContext() {
  const ctx = useContext(QuizPlayerContext);
  if (!ctx) throw new Error("useQuizPlayerContext must be used within a QuizPlayerProvider");
  return ctx;
}
