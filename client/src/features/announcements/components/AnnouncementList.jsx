import { useState } from "react";
import { Megaphone, Edit, Trash2, Plus, Eye } from "lucide-react";
import ConfirmationDialog from "@/shared/components/ui/ConfirmationDialog";

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-100 border-slate-200 dark:border-slate-500/30",
  medium: "bg-[rgba(242,92,5,0.08)] text-[var(--color-primary-hover)] dark:bg-[rgba(242,92,5,0.08)]0/15 dark:text-[var(--color-primary)] border-[rgba(242,92,5,0.25)] dark:border-[rgba(242,92,5,0.30)]",
  high: "bg-warning-soft text-[var(--color-warning)] dark:bg-warning-soft dark:text-[var(--color-warning)] border-[rgba(217,163,0,0.25)] dark:border-[rgba(217,163,0,0.30)]",
  critical: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-100 ",
};

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").trim();
}

export default function AnnouncementList({ items, onEdit, onDelete, onCreate, canManage, onView }) {
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      await onDelete(deleteItem.id);
      setDeleteItem(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Announcements</h2>
        {canManage && (
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover-brand"
          >
            <Plus size={14} />
            New Announcement
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 text-neutral-500 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
          No announcements yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => { if (onView) onView(item); }}
              className={`group relative flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md transition-all ${onView ? 'cursor-pointer' : ''}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(242,92,5,0.08)] dark:bg-[rgba(242,92,5,0.08)]0/15 text-[var(--color-primary)] dark:text-[var(--color-primary)]">
                <Megaphone size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{item.title}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
                    {item.priority}
                  </span>
                  <span className="text-[10px] text-neutral-500">{item.type}</span>
                </div>
                 <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{stripHtml(item.body)}</p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {item.author} &middot; {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!canManage && onView && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onView(item); }}
                    className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  >
                    <Eye size={14} />
                  </button>
                )}
                {canManage && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                      className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteItem}
        variant="destructive"
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmText={deleteLoading ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => !deleteLoading && setDeleteItem(null)}
      />
    </div>
  );
}
