import { cn } from "@/lib/utils";

export default function PanelCard({ title, action, children, className, bodyClassName }) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-neutral-800/50" />
      
      <div className="relative">
        {(title || action) && (
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
            {action}
          </div>
        )}
        <div className={bodyClassName}>{children}</div>
      </div>
    </section>
  );
}
