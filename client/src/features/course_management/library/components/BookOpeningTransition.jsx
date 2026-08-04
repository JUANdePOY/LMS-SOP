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
                    scale: 0.95,
                    y: cardRect.top - (cardRect.height * 0.1),
                    x: cardRect.left - (cardRect.width * 0.1),
                    width: cardRect.width,
                    height: cardRect.height,
                  }
                : { opacity: 0, y: 20 }
            }
            animate={{ opacity: 1, scale: 1, y: 0, x: 0, width: "100%", height: "auto" }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
              layout: { duration: 0.4 },
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
