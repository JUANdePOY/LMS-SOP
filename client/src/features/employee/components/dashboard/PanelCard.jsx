import { cn } from "@/lib/utils";

export default function PanelCard({ title, action, children, className, bodyClassName }) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
