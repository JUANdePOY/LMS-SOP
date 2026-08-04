import { useState } from "react";
import { Calendar, Edit, Trash2, Plus } from "lucide-react";

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-100 border-slate-200 dark:border-slate-500/30",
  medium: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100 border-blue-200 dark:border-blue-500/30",
  high: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30",
  critical: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-100 border-red-200 dark:border-red-500/30",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

export default function EventList({ items, onEdit, onDelete, onCreate, canManage }) {
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Events</h2>
        {canManage && (
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            New Event
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 text-neutral-500 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
          No events yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                <Calendar size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{item.title}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
                    {item.priority}
                  </span>
                  <span className="text-[10px] text-neutral-500">{item.event_type}</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-400">
                  <span>{formatDate(item.event_date)}</span>
                  {item.location && <span>• {item.location}</span>}
                  <span>• {item.organizer}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canManage && (
                  <>
                    <button onClick={() => onEdit(item)} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Delete Event</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Are you sure you want to delete this event? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="rounded-lg px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="rounded-lg px-3 py-1.5 text-xs bg-red-600 text-white disabled:opacity-50">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
