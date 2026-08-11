import { Megaphone, Calendar, User, Tag } from "lucide-react";

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-100 border-slate-200 dark:border-slate-500/30",
  medium: "bg-[rgba(242,92,5,0.08)] text-[var(--color-primary-hover)] dark:bg-[rgba(242,92,5,0.08)]0/15 dark:text-[var(--color-primary)] border-[rgba(242,92,5,0.25)] dark:border-[rgba(242,92,5,0.30)]",
  high: "bg-warning-soft text-[var(--color-warning)] dark:bg-warning-soft dark:text-[var(--color-warning)] border-[rgba(217,163,0,0.25)] dark:border-[rgba(217,163,0,0.30)]",
  critical: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-100 border-red-200 dark:border-red-500/30",
};

export default function AnnouncementDetail({ item }) {
  if (!item) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(242,92,5,0.08)] dark:bg-[rgba(242,92,5,0.08)]0/15 text-[var(--color-primary)] dark:text-[var(--color-primary)]">
          <Megaphone size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 break-words">
            {item.title}
          </h3>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
            {item.priority}
          </span>
        </div>
      </div>

      <div className="prose dark:prose-invert prose-sm max-w-none">
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap break-words">
          {item.body}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-700">
        <span className="inline-flex items-center gap-1">
          <Tag size={12} />
          {item.type || "General"}
        </span>
        <span className="inline-flex items-center gap-1">
          <User size={12} />
          {item.author || "System"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar size={12} />
          {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
        </span>
      </div>
    </div>
  );
}
