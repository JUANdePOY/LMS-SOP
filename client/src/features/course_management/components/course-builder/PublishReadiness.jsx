import { CheckCircle2, AlertCircle } from "lucide-react";

export default function PublishReadiness({ course, modules }) {
  const checks = [
    {
      label: "Course title",
      pass: Boolean(course?.title?.trim()),
    },
    {
      label: "Course description",
      pass: Boolean(course?.description?.trim()),
    },
    {
      label: "Course category",
      pass: Boolean(course?.category?.trim()),
    },
    {
      label: "At least one module",
      pass: Boolean(modules?.length),
    },
    {
      label: "Every module has at least one lesson",
      pass: Boolean(modules?.length && modules.every((m) => (m.lessons || []).length > 0)),
    },
  ];

  const allPass = checks.every((c) => c.pass);
  const passedCount = checks.filter((c) => c.pass).length;
  const progress = checks.length ? Math.round((passedCount / checks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allPass ? (
            <CheckCircle2 size={16} className="text-[var(--color-success)] dark:text-[var(--color-success)]" />
          ) : (
            <AlertCircle size={16} className="text-[var(--color-warning)] dark:text-[var(--color-warning)]" />
          )}
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {allPass ? "Ready to publish" : "Not ready yet"}
          </span>
        </div>
        <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
          {passedCount}/{checks.length}
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            allPass ? "bg-success-soft0" : "bg-warning-soft0"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {!allPass && (
        <div className="space-y-1.5">
          {checks.filter((c) => !c.pass).map((c) => (
            <div key={c.label} className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
              <span className="h-1 w-1 rounded-full bg-neutral-400" />
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
