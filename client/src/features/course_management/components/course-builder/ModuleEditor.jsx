import { useState, useEffect } from "react";
import { Trash2, Settings } from "lucide-react";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";

export default function ModuleEditor({ module, onSave, onDelete, saving }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderIndex, setOrderIndex] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState("content");

  useEffect(() => {
    if (!module) return;
    setTitle(module.title || "");
    setDescription(module.description || "");
    setOrderIndex(module.order_index ? String(module.order_index) : "");
    setIsVisible(module.is_visible ?? true);
  }, [module?.id]);

  if (!module) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Select a module to edit
      </div>
    );
  }

  const emitPatch = (patch) => {
    onSave?.(module.id, patch);
  };

  const handleSave = () => {
    onSave?.(module.id, {
      title: title.trim(),
      description,
      order_index: orderIndex ? parseInt(orderIndex, 10) : undefined,
      is_visible: isVisible,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {title || "Untitled module"}
            </h3>
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">Module settings</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              emitPatch({ title: e.target.value });
            }}
            placeholder="Module title"
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
          />
        </div>

        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="-mb-px flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`border-b-2 px-1 py-2 text-xs font-medium ${
                activeTab === "content"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`border-b-2 px-1 py-2 text-xs font-medium ${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
              }`}
            >
              <Settings size={12} className="inline mr-1" />
              Settings
            </button>
          </nav>
        </div>

        {activeTab === "content" && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
            <RichTextEditor
              value={description}
              onChange={(html) => {
                setDescription(html);
                emitPatch({ description: html });
              }}
              placeholder="What will learners learn in this module?"
            />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Order</label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => {
                  setOrderIndex(e.target.value);
                  emitPatch({ order_index: e.target.value ? parseInt(e.target.value, 10) : undefined });
                }}
                placeholder="1"
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="visible-toggle"
                checked={isVisible}
                onChange={(e) => {
                  setIsVisible(e.target.checked);
                  emitPatch({ is_visible: e.target.checked });
                }}
                className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="visible-toggle" className="text-xs text-neutral-700 dark:text-neutral-300">
                Module is visible to learners
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <button
          type="button"
          onClick={() => onDelete?.()}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} /> Delete module
        </button>
      </div>
    </div>
  );
}
