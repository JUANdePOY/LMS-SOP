import { Search, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessengerHeader({ filters, filter, onFilterChange, search, onSearchChange, onNew }) {
  return (
    <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Chats</h2>
        <button
          onClick={onNew}
          title="New message"
          className="inline-flex items-center gap-1 rounded-full btn-primary px-3 py-1.5 text-xs font-medium text-white hover-brand"
        >
          <PenSquare size={14} />
          New
        </button>
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search chats"
          className="w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div className="inline-flex w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 p-0.5 text-xs">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={cn(
              "flex-1 rounded-md px-2.5 py-1 font-medium transition-colors",
              filter === f.key
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
