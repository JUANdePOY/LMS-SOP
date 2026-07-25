import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default' }) {
  if (!isOpen) return null;

  const variantConfig = {
    default: { icon: AlertTriangle, iconColor: 'text-amber-500', btnColor: 'bg-amber-600 hover:bg-amber-700' },
    destructive: { icon: AlertTriangle, iconColor: 'text-red-500', btnColor: 'bg-red-600 hover:bg-red-700' },
  };
  const { icon: Icon, iconColor, btnColor } = variantConfig[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-start gap-4">
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
            variant === 'destructive' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
          )}>
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
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn('px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors', btnColor)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}