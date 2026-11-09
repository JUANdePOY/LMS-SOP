import { Calendar, MapPin, User, Edit, Trash2, Plus, ChevronRight, Clock } from "lucide-react";

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-100 border-slate-200 dark:border-slate-500/30",
  medium: "bg-[rgba(242,92,5,0.08)] text-[var(--color-primary-hover)] dark:bg-[rgba(242,92,5,0.08)]0/15 dark:text-[var(--color-primary)] border-[rgba(242,92,5,0.25)] dark:border-[rgba(242,92,5,0.30)]",
  high: "bg-warning-soft text-[var(--color-warning)] dark:bg-warning-soft dark:text-[var(--color-warning)] border-[rgba(217,163,0,0.25)] dark:border-[rgba(217,163,0,0.30)]",
  critical: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-100 border-red-200 dark:border-red-500/30",
};

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(dateObj) {
  if (!dateObj) return "";
  return dateObj.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function EventDayDetail({ date, events, onEdit, onDelete, onCreate, canManage, renderSync, onView }) {
  const sorted = [...events].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {formatDate(date)}
          </h3>
        </div>
        {canManage && (
          <button
            onClick={() => onCreate(date)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-2.5 py-1.5 text-xs font-medium text-white hover-brand"
          >
            <Plus size={14} />
            Add
          </button>
        )}
      </div>

      <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-500">
            No events on this day.
          </div>
        ) : (
          sorted.map((evt) => (
            <div
              key={evt.id}
              className="group relative rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3 hover:border-[var(--color-primary)] dark:hover:border-[var(--color-primary)] transition-all"
            >
<div
                  className="cursor-pointer rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800/30 transition-colors"
                  onClick={() => onView && onView(evt)}
                  onKeyDown={(e) => e.key === "Enter" && onView && onView(evt)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${evt.title}`}
                >
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-[var(--color-primary)] dark:text-[var(--color-primary)] truncate hover:underline">
                    {evt.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[evt.priority] || PRIORITY_COLORS.medium}`}>
                    {evt.priority}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-2">
                  {evt.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-500 dark:text-neutral-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} className="shrink-0" />
                    {formatTime(evt.event_date)}
                    {evt.end_date && <> - {formatTime(evt.end_date)}</>}
                  </span>
                  {evt.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={10} />
                      {evt.location}
                    </span>
                  )}
                  {evt.organizer && (
                    <span className="inline-flex items-center gap-1">
                      <User size={10} />
                      {evt.organizer}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <ChevronRight size={12} className="text-neutral-400 group-hover:text-[var(--color-primary)] transition-colors" />
                </div>
              </div>

              {canManage && (
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(evt);
                    }}
                    className="p-1.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shadow-sm"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(evt.id);
                    }}
                    className="p-1.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 shadow-sm"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
              {renderSync && (
                <div className="absolute bottom-2 right-2">
                  {renderSync(evt)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}