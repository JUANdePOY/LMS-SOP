import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

function ToastItem({ id, message, type = 'info', duration, onClose }) {
  if (duration) {
    setTimeout(() => onClose(id), duration);
  }

  const Icon = icons[type] || icons.info;

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 pr-10 rounded-lg shadow-lg border bg-white dark:bg-neutral-900',
      'border-neutral-200 dark:border-neutral-800 pointer-events-auto min-w-[280px] max-w-sm',
      type === 'error' && 'border-red-200 dark:border-red-800',
      type === 'success' && 'border-emerald-200 dark:border-emerald-800',
    )}>
      <Icon className={cn('w-5 h-5 mt-0.5', colors[type] || colors.info)} />
      <p className="text-sm text-neutral-800 dark:text-neutral-200 flex-1">{message}</p>
      <button onClick={() => onClose(id)} className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}