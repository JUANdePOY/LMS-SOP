import { useState, useEffect } from "react";
import { Trash2, Settings } from "lucide-react";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";

const TABS = [
  { id: "content", label: "Content", icon: null },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function ModuleEditor({ module, onSave, onDelete, saving }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderIndex, setOrderIndex] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState("content");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    if (!module) return;
    setTitle(module.title || "");
    setDescription(module.description || "");
    setOrderIndex(module.order_index ? String(module.order_index) : "");
    setIsVisible(module.is_visible ?? true);
    setLastSavedAt(null);
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
    setLastSavedAt(new Date());
  };

  const handleDelete = () => {
    onDelete?.();
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-neutral-200 px-5 py-4 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                emitPatch({ title: e.target.value });
              }}
              placeholder="Module title"
              className="w-full text-base font-medium text-neutral-900 placeholder:text-neutral-400 bg-transparent border-0 border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:ring-0 p-0 pb-1 transition-colors"
            />
            <p className="text-xs text-neutral-500 mt-1.5">Module</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {lastSavedAt && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-400">
                Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 active:bg-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <nav className="mt-4 flex items-center gap-6" aria-label="Module sections">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  inline-flex items-center gap-2 px-1 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
                  ${active
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-700"}
                `}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6">
          {activeTab === "content" && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Description
              </label>
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
            <div className="space-y-5">
              <div>
                <label htmlFor="module-order" className="block text-sm font-medium text-neutral-700 mb-2">
                  Order
                </label>
                <input
                  id="module-order"
                  type="number"
                  value={orderIndex}
                  onChange={(e) => {
                    setOrderIndex(e.target.value);
                    emitPatch({ order_index: e.target.value ? parseInt(e.target.value, 10) : undefined });
                  }}
                  placeholder="1"
                  className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                />
                <p className="text-xs text-neutral-500 mt-1.5">Position in course sequence</p>
              </div>
              <div>
                <label className="flex items-center gap-3 p-3 border border-neutral-200 hover:border-neutral-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => {
                      setIsVisible(e.target.checked);
                      emitPatch({ is_visible: e.target.checked });
                    }}
                    className="w-4 h-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <div>
                    <span className="text-sm text-neutral-700">Visible to learners</span>
                    <p className="text-xs text-neutral-500">Module will be accessible</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-neutral-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
          >
            <Trash2 size={16} />
            Delete module
          </button>
        </div>
      </footer>
    </div>
  );
}
