import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

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

  return (
    <div className="rounded-md border border-[var(--border)] bg-white dark:bg-neutral-900 px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        {allPass ? (
          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
        )}
        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Publish readiness</span>
      </div>
      <div className="space-y-1">
        {checks.map((c, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
            {c.pass ? (
              <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle size={12} className="text-red-500" />
            )}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
