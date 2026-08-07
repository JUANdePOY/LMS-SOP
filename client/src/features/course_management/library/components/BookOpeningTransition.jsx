import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function BookOpeningTransition({ children, courseId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cardRect, setCardRect] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`course-card-${courseId}`);
    if (stored) {
      try {
        setCardRect(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
    setIsOpen(true);
  }, [courseId]);

  const handleBack = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      window.history.back();
    }, 300);
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-none">
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="course-details"
            initial={
              cardRect
                ? {
                    opacity: 0,
                    scale: 0.96,
                    y: cardRect.top - (cardRect.height * 0.1),
                    x: cardRect.left - (cardRect.width * 0.1),
                    width: cardRect.width,
                    height: cardRect.height,
                  }
                : { opacity: 0, y: 16 }
            }
            animate={{ opacity: 1, scale: 1, y: 0, x: 0, width: "100%", height: "auto" }}
            exit={{ opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.25, ease: "easeInOut" } }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
              layout: { duration: 0.45 },
            }}
            className="overflow-hidden"
          >
            {typeof children === "function" ? children({ onBack: handleBack }) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function useBookOpening(courseId) {
  const captureCardPosition = useCallback((element) => {
    if (!element || !courseId) return;
    const rect = element.getBoundingClientRect();
    sessionStorage.setItem(
      `course-card-${courseId}`,
      JSON.stringify({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    );
  }, [courseId]);

  return { captureCardPosition };
}
