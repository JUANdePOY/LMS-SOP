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

  return (
    <div className="flex items-center gap-2 text-xs">
      {allPass ? (
        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
      )}
      <span className="text-neutral-700 dark:text-neutral-300">
        {passedCount}/{checks.length} checks passed
      </span>
      {!allPass && (
        <span className="text-neutral-400 dark:text-neutral-500">
          ({checks.filter((c) => !c.pass).map((c) => c.label).join(", ")})
        </span>
      )}
    </div>
  );
}
