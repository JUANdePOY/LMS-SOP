import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANT_CONFIG = {
  default: { icon: AlertTriangle, iconColor: 'text-amber-500', btnColor: 'bg-amber-600 hover:bg-amber-700' },
  destructive: { icon: AlertTriangle, iconColor: 'text-red-500', btnColor: 'bg-red-600 hover:bg-red-700' },
};

const DEFAULT_CONFIRM_TEXT = 'Confirm';
const DEFAULT_CANCEL_TEXT = 'Cancel';
const DEFAULT_PROCESSING_TEXT = 'Processing...';
const DEFAULT_ERROR_MESSAGE = 'An error occurred. Please try again.';

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = DEFAULT_CONFIRM_TEXT,
  cancelText = DEFAULT_CANCEL_TEXT,
  processingText = DEFAULT_PROCESSING_TEXT,
  variant = 'default',
  children,
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const { icon: Icon, iconColor, btnColor } = VARIANT_CONFIG[variant] || VARIANT_CONFIG.default;

  const handleConfirm = async () => {
    setError(null);
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err?.message || DEFAULT_ERROR_MESSAGE);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isConfirming) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleBackdropClick}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 transition-all duration-200 transform scale-100 opacity-100">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
              variant === 'destructive' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
            )}
          >
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {title}
            </h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBackdropClick}
            disabled={isConfirming}
            className="p-1 -mt-1 -mr-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-500/30 px-3 py-2.5">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleBackdropClick}
            disabled={isConfirming}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || error !== null}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              btnColor
            )}
          >
            {isConfirming ? processingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
