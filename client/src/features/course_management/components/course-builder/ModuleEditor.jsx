import { useState, useEffect } from "react";
import { Trash2, Settings, Save, Loader2, CheckCircle2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";

const TABS = [
  { id: "content", label: "Content", icon: null },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function ModuleEditor({
  module,
  onSave,
  onDelete,
  saving,
  onNavigatePrev,
  onNavigateNext,
  canNavigatePrev,
  canNavigateNext,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) {
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

  const saveStatus = saving ? (
    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-blue-600">
      <Loader2 size={12} className="animate-spin" />
      Saving
    </span>
  ) : lastSavedAt ? (
    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-400">
      <CheckCircle2 size={12} />
      Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  ) : null;

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex flex-1 min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        {/* Header (inside the unified card) */}
        <div className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center rounded px-1.5 py-1 text-[10px] font-medium text-blue-500 bg-blue-50">
                    Module
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Course section
                  </span>
                </div>
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    emitPatch({ title: e.target.value });
                  }}
                  placeholder="Module title"
                  aria-label="Module title"
                  className="w-full text-lg font-semibold text-neutral-900 placeholder:text-neutral-400 bg-transparent border-0 border-b border-transparent hover:border-neutral-300 focus:border-blue-600 focus:ring-0 p-0 pb-1 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {saveStatus}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span className="hidden sm:inline">{saving ? "Saving" : "Save"}</span>
                </button>
              </div>
            </div>

            {/* Tabs (semantic) */}
            <div className="mt-3">
              <nav role="tablist" aria-label="Module sections" className="-mb-px flex gap-6">
                {TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      id={`module-tab-${tab.id}`}
                      aria-selected={active}
                      aria-controls={`module-panel-${tab.id}`}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setActiveTab(tab.id)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                          e.preventDefault();
                          const dir = e.key === "ArrowRight" ? 1 : -1;
                          const idx = TABS.findIndex((t) => t.id === activeTab);
                          const next = TABS[(idx + dir + TABS.length) % TABS.length];
                          setActiveTab(next.id);
                        }
                      }}
                      className={`
                        inline-flex items-center gap-2 px-1 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-t
                        ${active
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-neutral-500 hover:text-neutral-700"}
                      `}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="max-w-4xl mx-auto">
            <div className="px-4 py-5" role="tabpanel" id="module-panel-content" aria-labelledby="module-tab-content" hidden={activeTab !== "content"}>
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
            </div>

            <div
              className="px-4 py-5"
              role="tabpanel"
              id="module-panel-settings"
              aria-labelledby="module-tab-settings"
              hidden={activeTab !== "settings"}
            >
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
                      className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                    />
                    <p className="text-xs text-neutral-500 mt-1.5">Position in course sequence</p>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(e) => {
                          setIsVisible(e.target.checked);
                          emitPatch({ is_visible: e.target.checked });
                        }}
                        className="w-4 h-4 border-neutral-300 text-blue-600 focus:ring-blue-600 rounded"
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
        </div>

        {/* Footer with navigation + delete */}
        <footer className="border-t border-neutral-200 bg-white px-5 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onNavigatePrev}
                disabled={!canNavigatePrev}
                title="Previous module"
                aria-label="Previous module"
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                title="Move module up"
                aria-label="Move module up"
                className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                title="Move module down"
                aria-label="Move module down"
                className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={onNavigateNext}
                disabled={!canNavigateNext}
                title="Next module"
                aria-label="Next module"
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
