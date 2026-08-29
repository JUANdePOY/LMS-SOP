import { useEffect } from "react";

export default function Drawer({ open, onClose, children, title, size = "sm", showBackdrop = true }) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === "lg"
      ? "w-[42vw] min-w-[480px] max-w-[720px]"
      : size === "md"
        ? "w-[320px] max-w-md"
        : "max-w-sm";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {showBackdrop && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      )}
      <div className={`relative z-10 h-full ${sizeClass} border-l border-[var(--border)] bg-[var(--bg-surface)] shadow-xl flex flex-col`}>
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
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
