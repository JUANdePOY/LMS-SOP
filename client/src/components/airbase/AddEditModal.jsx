import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AddEditModal
 * Generic modal shell. Pass title, onClose, onSubmit, and form fields as children.
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   onClose: () => void,
 *   onSubmit: () => void,
 *   submitLabel?: string,
 *   children: React.ReactNode,
 * }} props
 */
export default function AddEditModal({ open, title, onClose, onSubmit, submitLabel = "Save", children, maxWidth }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const widthClass = maxWidth || "max-w-lg";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className={cn(
        "relative z-10 w-full rounded-2xl shadow-2xl",
        widthClass,
        "bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        "animate-in fade-in zoom-in-95 duration-150"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex flex-col gap-2 max-h-[65vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
          <button
            onClick={onClose}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium",
              "border-neutral-200 dark:border-neutral-700",
              "bg-white dark:bg-neutral-900",
              "text-neutral-600 dark:text-neutral-400",
              "hover:bg-neutral-50 dark:hover:bg-neutral-800",
              "transition-colors duration-150"
            )}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold",
              "bg-indigo-600 text-white",
              "hover:bg-indigo-700 active:bg-indigo-800",
              "shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30",
              "transition-all duration-150"
            )}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * FormField — labeled input wrapper
 */
export function FormField({ label, required, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * FormInput — styled text input
 */
export function FormInput({ value, onChange, placeholder, type = "text", className, ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "rounded-lg border px-2.5 py-1.5 text-sm",
        "border-neutral-200 dark:border-neutral-700",
        "bg-white dark:bg-neutral-800",
        "text-neutral-800 dark:text-neutral-200",
        "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
        "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
        "transition-all duration-150",
        className
      )}
      {...props}
    />
  );
}

/**
 * FormSelect — styled select
 */
export function FormSelect({ value, onChange, children, ...props }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border px-2.5 py-1.5 text-sm",
        "border-neutral-200 dark:border-neutral-700",
        "bg-white dark:bg-neutral-800",
        "text-neutral-800 dark:text-neutral-200",
        "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
        "transition-all duration-150 cursor-pointer"
      )}
      {...props}
    >
      {children}
    </select>
  );
}
