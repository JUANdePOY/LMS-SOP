import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { X, Plus, PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose } from 'lucide-react';
import ModuleList from '@/features/sop-management/components/SOPEditor/ModuleList';
import ModuleEditor from '@/features/sop-management/components/SOPEditor/ModuleEditor';
import AttachmentUploader from '@/features/sop-management/components/SOPEditor/AttachmentUploader';
import ApprovalPanel from '@/features/sop-management/components/ApprovalPanel';
import SOPActionBar from '@/features/sop-management/components/SOPActionBar';
import SOPSidebar from '@/features/sop-management/components/SOPSidebar';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import { useModules } from '@/features/sop-management/hooks/useModules';
import { useAttachments } from '@/features/sop-management/hooks/useAttachments';
import { useVersions } from '@/features/sop-management/hooks/useVersions';
import { getSop, updateSop } from '@/features/sop-management/services/sopService';
import api from '@/lib/api';

function SidebarCard({ title, children, className }) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm ${className || ''}`}>
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SOPWorkspacePage() {
  const { id } = useParams();
  const sopId = id;
  const [selectedModule, setSelectedModule] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [sop, setSop] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [showLeftSidebar, setShowLeftSidebar] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [showRightSidebar, setShowRightSidebar] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [confirmAction, setConfirmAction] = useState(null);

  const { modules, loading: modulesLoading, error: modulesError, addModule, editModule, removeModule, reorderModules, submitModuleForReview } = useModules(sopId);
  const { attachments, loading: attachmentsLoading, error: attachmentsError, upload, remove: removeAttachment } = useAttachments(selectedModule?.id);
  const { versions, loading: versionsLoading, error: versionsError, restore } = useVersions(sopId);

  const fetchSop = async () => {
    if (!sopId) return;
    try {
      const { data } = await getSop(sopId);
      setSop(data?.data || null);
    } catch { /* ignore */ }
  };

  const fetchApprovals = async () => {
    if (!sopId) return;
    try {
      const { data } = await api.get(`/sops/${sopId}/approvals`);
      setApprovals(data?.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!sopId) return;
    Promise.all([
      api.get(`/sops/${sopId}/audit`).then((r) => setAuditLogs(r.data?.data || [])).catch(() => {}),
      fetchApprovals(),
      fetchSop(),
    ]);
  }, [sopId]);

  const handleSopAction = async (action) => {
    setActionLoading((prev) => ({ ...prev, [action]: true }));
    try {
      const actionMap = {
        submit: () => api.post(`/sops/${sopId}/submit`),
        approve: () => api.post(`/sops/${sopId}/approve`),
        reject: () => api.post(`/sops/${sopId}/reject`),
        publish: () => api.post(`/sops/${sopId}/publish`),
        archive: () => api.post(`/sops/${sopId}/transition`, { status: 'Archived' }),
      };
      await actionMap[action]();
      await fetchSop();
      await fetchApprovals();
    } catch (err) {
      console.error(`${action} failed:`, err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [action]: false }));
    }
  };

  const handleModuleEdit = (module) => {
    setSelectedModule(module);
    setIsAdding(false);
    setShowLeftSidebar(false);
  };

  const handleAddModule = () => {
    setIsAdding(true);
    setSelectedModule(null);
    setShowLeftSidebar(false);
  };

  const handleModuleSave = async (data) => {
    setSaving(true);
    try {
      if (isAdding) {
        const newModule = await addModule(data);
        setIsAdding(false);
        setSelectedModule(newModule);
      } else if (selectedModule) {
        await editModule(selectedModule.id, data);
        setSelectedModule(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleModuleCancel = () => {
    setSelectedModule(null);
    setIsAdding(false);
  };

  const handleVersionRestore = async (versionId) => {
    setRestoring(true);
    try {
      await restore(versionId);
    } finally {
      setRestoring(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'module') {
        await removeModule(confirmAction.id);
      } else if (confirmAction.type === 'attachment') {
        await removeAttachment(confirmAction.id);
      } else if (confirmAction.type === 'sop') {
        await handleSopAction(confirmAction.action);
      }
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setConfirmAction(null);
    }
  };

  const handleModuleDelete = (moduleId) => {
    setConfirmAction({ type: 'module', id: moduleId });
  };

  const handleAttachmentDelete = (attachmentId) => {
    setConfirmAction({ type: 'attachment', id: attachmentId });
  };

  const handleSopActionWithConfirm = (action) => {
    const labels = {
      submit: 'Submit for Review',
      approve: 'Approve SOP',
      reject: 'Reject SOP',
      publish: 'Publish SOP',
      archive: 'Archive SOP',
    };
    const destructive = ['reject', 'archive'].includes(action);
    setConfirmAction({
      type: 'sop',
      action,
      title: labels[action] || 'Confirm Action',
      message: `Are you sure you want to ${labels[action]?.toLowerCase()}? This action may affect the SOP workflow.`,
      variant: destructive ? 'destructive' : 'default',
    });
  };

  const confirmConfig = confirmAction
    ? {
        module: {
          title: 'Delete Module',
          message: 'Are you sure you want to delete this module? It will be moved to the trash and can be restored later.',
          variant: 'destructive',
        },
        attachment: {
          title: 'Delete Attachment',
          message: 'Are you sure you want to delete this attachment? It will be moved to the trash and can be restored later.',
          variant: 'destructive',
        },
        sop: {
          title: confirmAction.title || 'Confirm Action',
          message: confirmAction.message || 'Are you sure?',
          variant: confirmAction.variant || 'default',
        },
      }[confirmAction.type]
    : null;

  return (
    <div className="sop-workspace">
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
            <a href="/sops" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">SOPs</a>
            <span className="text-neutral-300 dark:text-neutral-600">/</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">Workspace</span>
          </nav>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">SOP Workspace</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {showLeftSidebar ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            <span className="hidden sm:inline">{showLeftSidebar ? 'Close Modules' : 'Open Modules'}</span>
          </button>
          <button
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {showRightSidebar ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            <span className="hidden sm:inline">{showRightSidebar ? 'Close Details' : 'Open Details'}</span>
          </button>
        </div>
      </div>

      {sop && (
        <SOPActionBar
          sop={sop}
          onAction={handleSopActionWithConfirm}
          loading={actionLoading}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <aside
          className={`
            fixed inset-0 z-50 lg:static lg:inset-auto lg:z-auto lg:shrink-0 lg:bg-transparent lg:dark:bg-transparent
            transition-all duration-200 ease-in-out
            ${showLeftSidebar ? 'block' : 'hidden'}
            lg:block
            ${showLeftSidebar ? 'lg:w-80 lg:opacity-100' : 'lg:w-0 lg:overflow-hidden lg:opacity-0'}
          `}
        >
          {showLeftSidebar && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowLeftSidebar(false)}>
              <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
              <div className="absolute left-0 top-0 h-full w-3/4 max-w-sm bg-white dark:bg-neutral-900 shadow-xl border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Modules</h2>
                  <button onClick={() => setShowLeftSidebar(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={20} className="text-neutral-500 dark:text-neutral-400" /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1"><ModuleList modules={modules} loading={modulesLoading} error={modulesError} onAdd={handleAddModule} onEdit={handleModuleEdit} onDelete={handleModuleDelete} onReorder={reorderModules} /></div>
              </div>
            </div>
          )}
          <div className="hidden lg:block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">Modules</h2>
            </div>
            <div className="p-2 max-h-[calc(100vh-140px)] overflow-y-auto"><ModuleList modules={modules} loading={modulesLoading} error={modulesError} onAdd={handleAddModule} onEdit={handleModuleEdit} onDelete={handleModuleDelete} onReorder={reorderModules} /></div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {modulesLoading && !selectedModule && !isAdding ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div><div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div><div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div><div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6"></div></div></div>
          ) : selectedModule || isAdding ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between"><h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{isAdding ? 'Add Module' : 'Edit Module'}</h2></div>
              <div className="p-6">
                <ModuleEditor module={selectedModule} onSave={handleModuleSave} onCancel={handleModuleCancel} saving={saving} />
                <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                  {attachmentsLoading && (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4"></div>
                      <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                    </div>
                  )}
                  {attachmentsError && (
                    <p className="text-sm text-red-600 dark:text-red-400">Failed to load attachments</p>
                  )}
                  {!attachmentsLoading && !attachmentsError && selectedModule && (
                    <AttachmentUploader attachments={attachments} onUpload={upload} onDelete={handleAttachmentDelete} />
                  )}
                  {!attachmentsLoading && !attachmentsError && !selectedModule && isAdding && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Save the module first to enable file attachments.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm p-12 text-center">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4"><Plus size={28} className="text-indigo-600 dark:text-indigo-400" /></div>
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No Module Selected</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Select a module from the sidebar to edit, or create a new one to get started.</p>
                <button onClick={handleAddModule} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors">Add Module</button>
              </div>
            </div>
          )}
        </main>

        <aside
          className={`
            fixed inset-0 z-50 bg-black/50 dark:bg-black/60 lg:static lg:inset-auto lg:z-auto lg:shrink-0 lg:bg-transparent lg:dark:bg-transparent
            transition-all duration-200 ease-in-out
            ${showRightSidebar ? 'block' : 'hidden'}
            lg:block
            ${showRightSidebar ? 'lg:w-80 lg:opacity-100' : 'lg:w-0 lg:overflow-hidden lg:opacity-0'}
          `}
        >
          {showRightSidebar && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowRightSidebar(false)}>
              <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
              <div className="absolute right-0 top-0 h-full w-3/4 max-w-sm bg-white dark:bg-neutral-900 shadow-xl border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Details</h2>
                  <button onClick={() => setShowRightSidebar(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={20} className="text-neutral-500 dark:text-neutral-400" /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1"><SOPSidebar sopId={sopId} approvals={approvals} setApprovals={setApprovals} auditLogs={auditLogs} versions={versions} versionsLoading={versionsLoading} versionsError={versionsError} onVersionRestore={handleVersionRestore} /></div>
              </div>
            </div>
          )}
          <div className="hidden lg:flex lg:flex-col gap-4 max-h-[calc(100vh-140px)] overflow-y-auto">
            <SOPSidebar sopId={sopId} approvals={approvals} setApprovals={setApprovals} auditLogs={auditLogs} versions={versions} versionsLoading={versionsLoading} versionsError={versionsError} onVersionRestore={handleVersionRestore} />
          </div>
        </aside>
      </div>

      <ConfirmationDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmConfig?.title || 'Confirm'}
        message={confirmConfig?.message || 'Are you sure?'}
        variant={confirmConfig?.variant || 'default'}
      />
    </div>
  );
}

export default SOPWorkspacePage;
