import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

export default function ModuleEditor({ module, onSave, onDelete, saving }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderIndex, setOrderIndex] = useState("");

  useEffect(() => {
    if (!module) return;
    setTitle(module.title || "");
    setDescription(module.description || "");
    setOrderIndex(module.order_index ? String(module.order_index) : "");
  }, [module?.id]);

  if (!module) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Select a module to edit
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{title || "Untitled module"}</h3>
        <p className="text-[10px] uppercase tracking-wide text-neutral-500">Module settings</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Title <span className="text-red-500">*</span></label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Module title"
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will learners learn in this module?"
            rows={4}
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Order</label>
          <input
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            placeholder="1"
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
        <button
          type="button"
          onClick={() => onDelete?.()}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} /> Delete module
        </button>
        <button
          type="button"
          onClick={() =>
            onSave?.({
              title: title.trim(),
              description,
              order_index: orderIndex ? parseInt(orderIndex, 10) : undefined,
            })
          }
          disabled={saving}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save module"}
        </button>
      </div>
    </div>
  );
}
