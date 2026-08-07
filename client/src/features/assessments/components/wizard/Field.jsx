export const fieldClass =
  "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none";

export function Field({ label, error, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
