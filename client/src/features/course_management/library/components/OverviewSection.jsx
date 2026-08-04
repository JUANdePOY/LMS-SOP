import { cn } from "@/lib/utils";

export default function OverviewSection({ title, icon: Icon, children, className }) {
  return (
    <section className={cn("rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 sm:p-6", className)}>
      {title && (
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
          {Icon && <Icon size={16} className="text-blue-600 dark:text-blue-400" />}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
