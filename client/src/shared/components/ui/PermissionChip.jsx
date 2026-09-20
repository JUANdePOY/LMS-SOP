
function PermissionChip({ label, granted, size = 'sm' }) {
  const base = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${base} ${
      granted
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
        : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-700 dark:text-neutral-400 dark:border-neutral-600'
    }`}>
      {label}
    </span>
  );
}

export { PermissionChip };
