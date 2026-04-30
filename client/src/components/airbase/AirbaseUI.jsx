import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StatusBadge — active / inactive / standby
 */
export function StatusBadge({ status }) {
  const map = {
    active:   { icon: CheckCircle2, label: "Active",   classes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
    inactive: { icon: XCircle,      label: "Inactive", classes: "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700" },
    standby:  { icon: AlertCircle,  label: "Standby",  classes: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  };
  const { icon: Icon, label, classes } = map[status] ?? map.inactive;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
      classes
    )}>
      <Icon size={9} className="shrink-0" />
      {label}
    </span>
  );
}

/**
 * TypeBadge — group / unit type label
 */
export function TypeBadge({ type }) {
  const colors = {
    "Combat Support": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    "Logistics":      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
    "Air Defense":    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
    "Intelligence":   "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
    "Medical":        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
      colors[type] ?? "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700"
    )}>
      {type}
    </span>
  );
}

/**
 * ActionButton — icon button for table row actions
 */
export function ActionButton({ icon: Icon, label, onClick, variant = "default" }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150",
        "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
        variant === "danger"
          ? "text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          : "text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
      )}
    >
      <Icon size={14} strokeWidth={1.8} />
    </button>
  );
}

/**
 * MonoCode — inline monospaced code label (for codes/IDs)
 */
export function MonoCode({ children }) {
  return (
    <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:text-neutral-500">
      {children}
    </span>
  );
}

/**
 * PrimaryButton — main CTA button
 */
export function PrimaryButton({ children, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
        "bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30",
        "hover:bg-indigo-700 active:bg-indigo-800",
        "transition-all duration-150",
        "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
      )}
    >
      {Icon && <Icon size={14} strokeWidth={2} />}
      {children}
    </button>
  );
}

/**
 * FilterSelect — small inline select dropdown
 */
export function FilterSelect({ value, onChange, options, placeholder = "Filter…" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border py-2 pl-3 pr-7 text-sm",
        "border-neutral-200 dark:border-neutral-700",
        "bg-white dark:bg-neutral-900",
        "text-neutral-700 dark:text-neutral-300",
        "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
        "transition-all duration-150 cursor-pointer"
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value ?? opt} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  );
}
