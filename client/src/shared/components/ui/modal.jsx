import React, { useEffect } from 'react';

const sizeMap = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

function Modal({ open, onClose, title, children, footer, size = 'lg' }) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const sizeClass = sizeMap[size] || sizeMap.lg;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div
            className={`relative z-10 w-full ${sizeClass} max-h-[calc(100vh-48px)] sm:max-h-[calc(100vh-64px)] flex flex-col rounded-lg bg-[var(--bg-surface)] shadow-xl`}
          >
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
      )}
    </>
  );
}

export { Modal };
