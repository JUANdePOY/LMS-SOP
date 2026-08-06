import { useState, useEffect } from "react";
import { Plus, Trash2, X, Loader2, FileText } from "lucide-react";
import { getSops } from "@/features/sop-management/services/sopService";

export default function ModuleSOPsTab({ moduleId, courseId, sops = [], onLinkSop, onUnlinkSop, saving }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableSops, setAvailableSops] = useState([]);
  const [loadingSops, setLoadingSops] = useState(false);
  const [selectedSopId, setSelectedSopId] = useState("");

  useEffect(() => {
    if (!showAddModal) return;
    setLoadingSops(true);
    setSelectedSopId("");
    getSops({ exclude_status: "ARCHIVED" })
      .then((res) => {
        const items = res.data?.data?.rows || res.data?.data || [];
        const approved = items.filter((sop) => ['Published'].includes(sop.status));
        setAvailableSops(approved);
      })
      .catch(() => setAvailableSops([]))
      .finally(() => setLoadingSops(false));
  }, [showAddModal]);

  const handleAdd = () => {
    if (!selectedSopId || !onLinkSop) return;
    onLinkSop(moduleId, parseInt(selectedSopId, 10));
    setShowAddModal(false);
    setSelectedSopId("");
  };

  const handleRemove = (sopId) => {
    if (!onUnlinkSop || saving) return;
    onUnlinkSop(moduleId, sopId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {sops.length} SOP{sops.length === 1 ? '' : 's'} linked to this module
        </p>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          <Plus size={14} />
          Link SOP
        </button>
      </div>

      {sops.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600">
          <p className="text-sm text-neutral-500">No SOPs linked yet</p>
          <p className="text-xs text-neutral-400 mt-1">Link SOPs to supplement this module</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sops.map((sop) => (
            <div key={sop.id} className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{sop.sop_title || sop.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {sop.sop_code && <span className="text-[10px] font-mono text-neutral-500">{sop.sop_code}</span>}
                    {sop.link_type && <span className="text-[10px] uppercase tracking-wide text-neutral-400">{sop.link_type}</span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(sop.sop_id)}
                disabled={saving}
                className="shrink-0 rounded p-1.5 text-neutral-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                title="Unlink SOP"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Link SOP to Module</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded p-1 text-neutral-400 hover:text-neutral-700">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {loadingSops ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-neutral-400" />
                </div>
              ) : (
                <select
                  value={selectedSopId}
                  onChange={(e) => setSelectedSopId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                >
                  <option value="">Select an SOP...</option>
                  {availableSops.map((sop) => (
                    <option key={sop.id} value={sop.id}>
                      {sop.title} {sop.code ? `(${sop.code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-200 dark:border-neutral-700">
              <button onClick={() => setShowAddModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!selectedSopId || loadingSops}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                Link SOP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
