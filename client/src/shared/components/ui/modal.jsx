import React, { useEffect } from 'react';

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[calc(100vh-48px)] sm:max-h-[calc(100vh-64px)] flex flex-col rounded-lg bg-[var(--bg-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 sm:px-6 py-4 shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[var(--border)] px-4 sm:px-6 py-4 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export { Modal };
