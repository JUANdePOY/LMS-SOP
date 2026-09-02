import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Drawer({ open, onClose, children, title, size = "sm", showBackdrop = true }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const sizeClass =
    size === "lg"
      ? "w-[42vw] min-w-[480px] max-w-[720px]"
      : size === "md"
        ? "w-[320px] max-w-md"
        : "max-w-sm";

  if (!mounted && !open) return null;

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (!open) setMounted(false);
      }}
    >
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {showBackdrop && (
            <motion.div
              className="fixed inset-0 bg-black/40 dark:bg-black/60"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          )}
          <motion.div
            className={`relative z-10 h-full ${sizeClass} border-l border-[var(--border)] bg-[var(--bg-surface)] shadow-xl flex flex-col`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 shrink-0">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            )}
            <motion.div
              className="flex-1 overflow-y-auto px-4 py-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
