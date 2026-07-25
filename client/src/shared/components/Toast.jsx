import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200",
  error: "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200",
  warning: "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200",
  info: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || icons.info;
          return (
            <div
              key={toast.id}
              className={cn(
                "flex items-start gap-3 rounded-lg px-4 py-3 pr-8 text-sm shadow-lg",
                colors[toast.type] || colors.info
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute right-2 top-2 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  const toast = context;

  return {
    success: (message, duration) => toast.addToast(message, "success", duration),
    error: (message, duration) => toast.addToast(message, "error", duration),
    warning: (message, duration) => toast.addToast(message, "warning", duration),
    info: (message, duration) => toast.addToast(message, "info", duration),
  };
}

export default ToastContext;