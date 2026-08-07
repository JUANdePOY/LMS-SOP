export const DIFFICULTY_META = {
  beginner: { label: "Beginner", variant: "success" },
  intermediate: { label: "Intermediate", variant: "warning" },
  advanced: { label: "Advanced", variant: "destructive" },
  all_levels: { label: "All Levels", variant: "secondary" },
};

export function getDifficultyMeta(difficulty) {
  return DIFFICULTY_META[difficulty] || DIFFICULTY_META.all_levels;
}

export function ProgressBar({ value = 0, className = "" }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700 ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-blue-600 motion-reduce:transition-none dark:bg-blue-400"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
