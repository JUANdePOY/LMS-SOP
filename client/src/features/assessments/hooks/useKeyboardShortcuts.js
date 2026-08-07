import { useEffect, useCallback } from "react";

export function useKeyboardShortcuts({
  enabled = true,
  questionCount = 0,
  isLast = false,
  isSubmitting = false,
  questionType = "multiple_choice",
  onNext,
  onBack,
  onSubmit,
  onFlag,
  onSelectOption,
}) {
  const handleKey = useCallback(
    (e) => {
      if (!enabled) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
      if (isTyping) return;

      const key = e.key.toLowerCase();
      if (key === "arrowright" || key === "enter" || key === " ") {
        if (isLast && onSubmit && !isSubmitting) {
          e.preventDefault();
          onSubmit();
          return;
        }
        if (!isLast && onNext) {
          e.preventDefault();
          onNext();
          return;
        }
      }
      if (key === "arrowleft" && onBack) {
        e.preventDefault();
        onBack();
        return;
      }
      if (key === "escape" && onBack) {
        e.preventDefault();
        onBack();
        return;
      }
      if (key === "f" && onFlag) {
        e.preventDefault();
        onFlag();
        return;
      }
      if (questionType !== "short_answer") {
        const num = Number(key);
        if (Number.isInteger(num) && num >= 1 && num <= questionCount) {
          e.preventDefault();
          onSelectOption?.(num - 1);
          return;
        }
      }
    },
    [enabled, questionCount, isLast, isSubmitting, questionType, onNext, onBack, onSubmit, onFlag, onSelectOption]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);
}
