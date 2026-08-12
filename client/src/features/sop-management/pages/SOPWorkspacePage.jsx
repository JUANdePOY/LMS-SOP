import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { X, Plus, ArrowLeft, PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose } from 'lucide-react';
import ModuleList from '@/features/sop-management/components/SOPEditor/ModuleList';
import ModuleEditor from '@/features/sop-management/components/SOPEditor/ModuleEditor';
import CreateModuleModal from '@/features/sop-management/components/SOPEditor/CreateModuleModal';
import AttachmentUploader from '@/features/sop-management/components/SOPEditor/AttachmentUploader';
import SOPActionBar from '@/features/sop-management/components/SOPActionBar';
import SOPSidebar from '@/features/sop-management/components/SOPSidebar';
import { useToast } from '@/shared/components/ui/Toast';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import { useModules } from '@/features/sop-management/hooks/useModules';
import { useAttachments } from '@/features/sop-management/hooks/useAttachments';
import { useVersions } from '@/features/sop-management/hooks/useVersions';
import { getSop, getWorkflow, getAuditLogs, submitSop, approveSop, rejectSop, publishSop, transitionSop } from '@/features/sop-management/services/sopService';

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
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingModule, setCreatingModule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [sop, setSop] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Derive the current version ID: prefer SOP's own current_version_id,
  // fall back to workflow's sop_version if SOP's is not yet set
  const currentVersionId = sop?.current_version_id || workflow?.sop_version_id || null;

  const { modules, loading: modulesLoading, error: modulesError, addModule, editModule, removeModule, reorderModules, submitModuleForReview } = useModules(sopId, currentVersionId);
  const { attachments, loading: attachmentsLoading, error: attachmentsError, upload, addLink, remove: removeAttachment } = useAttachments(selectedModule?.id, currentVersionId);
  const { versions, loading: versionsLoading, error: versionsError, restore, refetch: refetchVersions } = useVersions(sopId);

  const fetchSop = async () => {
    if (!sopId) return;
    try {
      const { data } = await getSop(sopId);
      setSop(data?.data || null);
    } catch { /* ignore */ }
  };

  const fetchWorkflow = async () => {
    if (!sopId) return;
    setWorkflowLoading(true);
    try {
      const { data } = await getWorkflow(sopId);
      setWorkflow(data?.data || null);
    } catch { /* ignore */ }
    finally {
      setWorkflowLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!sopId) return;
    setAuditLogsLoading(true);
    try {
      const { data } = await getAuditLogs(sopId);
      setAuditLogs(data?.data || []);
    } catch { /* ignore */ }
    finally {
      setAuditLogsLoading(false);
    }
  };


  useEffect(() => {
    if (!sopId) return;
    Promise.all([
      fetchAuditLogs(),
      fetchWorkflow(),
      fetchSop(),
    ]);
  }, [sopId]);

  const handleSopAction = async (action) => {
    setActionLoading((prev) => ({ ...prev, [action]: true }));
    try {
      const actionLabels = {
        submit: 'submitted for review',
        approve: 'approved',
        reject: 'rejected',
        publish: 'published',
        archive: 'archived',
      };
      const actionMap = {
        submit: () => submitSop(sopId),
        approve: () => approveSop(sopId),
        reject: () => rejectSop(sopId),
        publish: () => publishSop(sopId),
        archive: () => transitionSop(sopId, { status: 'Archived' }),
      };
      await actionMap[action]();
      await fetchSop();
      await fetchWorkflow();
      await fetchAuditLogs();
      toast.success(`SOP ${actionLabels[action] || 'updated'} successfully`);
    } catch (err) {
      const message = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || `${action} failed`;
      console.error(`${action} failed:`, err);
      toast.error(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [action]: false }));
    }
  };

  const handleModuleEdit = (module) => {
    setSelectedModule(module);
    setShowLeftSidebar(false);
    setShowRightSidebar(false);
  };

  const handleAddModule = () => {
    setShowCreateModal(true);
  };

  const handleCreateModule = async (title) => {
    setCreatingModule(true);
    try {
      const newModule = await addModule({ title, content: '' });
      setSelectedModule(newModule);
      setShowCreateModal(false);
    } catch {
      // Error is handled by toast in addModule hook
    } finally {
      setCreatingModule(false);
    }
  };

  const handleModuleSave = async (data) => {
    setSaving(true);
    try {
      if (selectedModule) {
        await editModule(selectedModule.id, data);
        setSelectedModule(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleModuleCancel = () => {
    setSelectedModule(null);
  };

  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const result = await upload(formData);
    return result.view_url;
  };

  // Same PATCH as a manual save, but never touches selectedModule —
  // a manual save intentionally closes the editor (see handleModuleSave
  // above); auto-save must not, or it'd boot the user out mid-typing.
  const handleModuleAutoSave = async (data) => {
    if (!selectedModule) return;
    await editModule(selectedModule.id, data);
  };

  const handleVersionRestore = async (versionId) => {
    setRestoring(true);
    try {
      await restore(versionId);
      await Promise.all([refetchVersions(), fetchSop()]);
    } catch (err) {
      console.error('Restore failed:', err);
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

  // Editing a module takes over the entire page — no card, no
  // module-list/details asides, no SOP action bar. Just a slim header (back
  // arrow + title) and the editor content, full-bleed. Fixed + full-viewport
  // so it also covers whatever nav shell wraps this route.
  if (selectedModule) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-white dark:bg-neutral-900 flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleModuleCancel}
              title="Back to Workspace"
              className="p-2 -ml-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <nav className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <a href="/sops" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">SOPs</a>
                <span className="text-neutral-300 dark:text-neutral-600">/</span>
                <span>Workspace</span>
              </nav>
              <h1 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                Edit Module
              </h1>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
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

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            <aside
              className={`
                fixed inset-0 z-50 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:dark:bg-transparent
                transition-all duration-200 ease-in-out
                ${showLeftSidebar ? 'block' : 'hidden'}
                lg:block
                ${showLeftSidebar ? 'lg:w-80 lg:opacity-100' : 'lg:w-0 lg:overflow-hidden lg:opacity-0'}
              `}
            >
              {showLeftSidebar && (
                <div className="fixed inset-0 z-50 lg:hidden">
                  <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowLeftSidebar(false)} />
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
              <div className="px-4 sm:px-6 py-8">
                <ModuleEditor
                  module={selectedModule}
                  onSave={handleModuleSave}
                  onCancel={handleModuleCancel}
                  saving={saving}
                  onImageUpload={handleImageUpload}
                  onAutoSave={handleModuleAutoSave}
                />
                <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
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
                    <AttachmentUploader
                      attachments={attachments}
                      onUpload={upload}
                      onAddLink={addLink}
                      onDelete={handleAttachmentDelete}
                    />
                  )}
                </div>
              </div>
            </main>

            <aside
              className={`
                fixed inset-0 z-50 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:dark:bg-transparent
                transition-all duration-200 ease-in-out
                ${showRightSidebar ? 'block' : 'hidden'}
                lg:block
                ${showRightSidebar ? 'lg:w-80 lg:opacity-100' : 'lg:w-0 lg:overflow-hidden lg:opacity-0'}
              `}
            >
              {showRightSidebar && (
                <div className="fixed inset-0 z-50 lg:hidden">
                  <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowRightSidebar(false)} />
                  <div className="absolute right-0 top-0 h-full w-3/4 max-w-sm bg-white dark:bg-neutral-900 shadow-xl border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                      <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Details</h2>
                      <button onClick={() => setShowRightSidebar(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={20} className="text-neutral-500 dark:text-neutral-400" /></button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1"><SOPSidebar sopId={sopId} sop={sop} workflow={workflow} setWorkflow={setWorkflow} auditLogs={auditLogs} versions={versions} versionsLoading={versionsLoading} versionsError={versionsError} workflowLoading={workflowLoading} auditLogsLoading={auditLogsLoading} onVersionRestore={handleVersionRestore} onAuditRefresh={fetchAuditLogs} onSopRefresh={fetchSop} refetchVersions={refetchVersions} /></div>
                  </div>
                </div>
              )}
              <div className="hidden lg:flex lg:flex-col gap-4 max-h-[calc(100vh-140px)] overflow-y-auto">
                <SOPSidebar sopId={sopId} sop={sop} workflow={workflow} setWorkflow={setWorkflow} auditLogs={auditLogs} versions={versions} versionsLoading={versionsLoading} versionsError={versionsError} workflowLoading={workflowLoading} auditLogsLoading={auditLogsLoading} onVersionRestore={handleVersionRestore} onAuditRefresh={fetchAuditLogs} onSopRefresh={fetchSop} refetchVersions={refetchVersions} />
              </div>
            </aside>
          </div>
        </div>

        <ConfirmationDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
          title={confirmConfig?.title || 'Confirm'}
          message={confirmConfig?.message || 'Are you sure?'}
          variant={confirmConfig?.variant || 'default'}
        />
        <CreateModuleModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateModule}
          loading={creatingModule}
        />
      </div>
    );
  }

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
            fixed inset-0 z-50 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:dark:bg-transparent
            transition-all duration-200 ease-in-out
            ${showLeftSidebar ? 'block' : 'hidden'}
            lg:block
            ${showLeftSidebar ? 'lg:w-80 lg:opacity-100' : 'lg:w-0 lg:overflow-hidden lg:opacity-0'}
          `}
        >
          {showLeftSidebar && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowLeftSidebar(false)} />
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
          {modulesLoading ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div><div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div><div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div><div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6"></div></div></div>
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
            fixed inset-0 z-50 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:dark:bg-transparent
            transition-all duration-200 ease-in-out
            ${showRightSidebar ? 'block' : 'hidden'}
            lg:block
            ${showRightSidebar ? 'lg:w-80 lg:opacity-100' : 'lg:w-0 lg:overflow-hidden lg:opacity-0'}
          `}
        >
          {showRightSidebar && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowRightSidebar(false)} />
              <div className="absolute right-0 top-0 h-full w-3/4 max-w-sm bg-white dark:bg-neutral-900 shadow-xl border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Details</h2>
                  <button onClick={() => setShowRightSidebar(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={20} className="text-neutral-500 dark:text-neutral-400" /></button>
                </div>
                  <div className="p-4 overflow-y-auto flex-1">            <SOPSidebar sopId={sopId} sop={sop} workflow={workflow} setWorkflow={setWorkflow} auditLogs={auditLogs} versions={versions} versionsLoading={versionsLoading} versionsError={versionsError} workflowLoading={workflowLoading} auditLogsLoading={auditLogsLoading} onVersionRestore={handleVersionRestore} onAuditRefresh={fetchAuditLogs} onSopRefresh={fetchSop} refetchVersions={refetchVersions} /></div>
              </div>
            </div>
          )}
          <div className="hidden lg:flex lg:flex-col gap-4 max-h-[calc(100vh-140px)] overflow-y-auto">
            <SOPSidebar sopId={sopId} sop={sop} workflow={workflow} setWorkflow={setWorkflow} auditLogs={auditLogs} versions={versions} versionsLoading={versionsLoading} versionsError={versionsError} workflowLoading={workflowLoading} auditLogsLoading={auditLogsLoading} onVersionRestore={handleVersionRestore} onAuditRefresh={fetchAuditLogs} onSopRefresh={fetchSop} refetchVersions={refetchVersions} />
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

      <CreateModuleModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateModule}
        loading={creatingModule}
      />
    </div>
  );
}

export default SOPWorkspacePage;