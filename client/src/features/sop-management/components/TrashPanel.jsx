import { useState } from 'react';
import { TrashIcon, Undo2 } from 'lucide-react';
import { useTrashSops } from '@/features/sop-management/hooks/useTrashSops';
import { TRASH_TABS } from '@/features/sop-management/constants/sopConstants';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';

function TrashPanel() {
  const sopTrash = useTrashSops();

  const [trashTab, setTrashTab] = useState(TRASH_TABS.SOPS);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'restore',
    entityType: TRASH_TABS.SOPS,
    id: undefined,
    title: '',
    message: '',
    variant: 'default',
  });

  const tabs = [
    { key: TRASH_TABS.SOPS, label: 'SOPs', count: sopTrash.total },
  ];

  const handleRestore = (id) => {
    setConfirmDialog({
      isOpen: true,
      type: 'restore',
      entityType: TRASH_TABS.SOPS,
      id,
      title: 'Restore Item',
      message: 'Are you sure you want to restore this item? It will reappear in its original location.',
      variant: 'default',
    });
  };

  const handlePermanentDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      type: 'permanent',
      entityType: TRASH_TABS.SOPS,
      id,
      title: 'Permanently Delete',
      message: 'This action cannot be undone. The item will be permanently removed from the database.',
      variant: 'destructive',
    });
  };

  const handleEmptyTrash = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'empty',
      entityType: TRASH_TABS.SOPS,
      title: 'Empty Trash',
      message: 'Are you sure you want to permanently delete all trashed SOPs? This action cannot be undone.',
      variant: 'destructive',
    });
  };

  const confirmAction = async () => {
    if (!confirmDialog || !confirmDialog.isOpen) return;
    const { type, id } = confirmDialog;

    try {
      if (type === 'restore') {
        await sopTrash.restore(id);
      } else if (type === 'permanent') {
        await sopTrash.permanentlyDelete(id);
      } else if (type === 'empty') {
        await sopTrash.emptyAll();
      }
    } catch (err) {
      console.error('Action failed:', err);
    }

    setConfirmDialog({ isOpen: false, type: 'restore', entityType: TRASH_TABS.SOPS, id: undefined, title: '', message: '', variant: 'default' });
  };

  const renderSopTrashItems = () => {
    if (sopTrash.loading) return <p className="text-[var(--text-muted)] text-center py-8">Loading trashed SOPs...</p>;
    if (sopTrash.error) return <p className="text-red-600 dark:text-red-400 text-center py-8">Failed to load trashed SOPs</p>;
    if (!sopTrash.loading && !sopTrash.error && sopTrash.sops.length === 0) {
      return <p className="text-[var(--text-muted)] text-center py-8">No trashed SOPs.</p>;
    }
    return sopTrash.sops.map((sop) => (
      <div key={sop.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:shadow-sm transition-shadow">
        <div>
          <span className="font-medium text-[var(--text-primary)]">{sop.title}</span>
          <span className="ml-2 text-xs text-[var(--text-muted)]">{sop.sop_code}</span>
          <span className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300">{sop.status}</span>
          <p className="text-xs text-[var(--text-muted)] mt-1">Deleted: {sop.updated_at ? new Date(sop.updated_at).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleRestore(sop.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
            <Undo2 size={14} className="inline mr-1" /> Restore
          </button>
          <button onClick={() => handlePermanentDelete(sop.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">
            <TrashIcon size={14} className="inline mr-1" /> Delete Permanently
          </button>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      {sopTrash.total > 0 && (
        <div className="mb-2">
          <button onClick={handleEmptyTrash} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            Empty Trash
          </button>
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-neutral-200 dark:border-neutral-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTrashTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              trashTab === tab.key
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {trashTab === TRASH_TABS.SOPS && renderSopTrashItems()}

      <ConfirmationDialog
        isOpen={confirmDialog?.isOpen || false}
        onClose={() => setConfirmDialog(null)}
        onConfirm={confirmAction}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmText={confirmDialog?.type === 'permanent' ? 'Permanently Delete' : confirmDialog?.type === 'empty' ? 'Empty Trash' : 'Restore'}
        variant={confirmDialog?.variant || 'default'}
      />
    </div>
  );
}

export default TrashPanel;
