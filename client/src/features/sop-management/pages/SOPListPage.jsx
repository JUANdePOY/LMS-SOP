import { useState, useEffect } from 'react';
import { Search, LayoutGrid, LayoutList, Plus, X, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { useSOPList } from '@/features/sop-management/hooks/useSOPList';
import { SOP_STATUSES, VIEW_MODES } from '@/features/sop-management/constants/sopConstants';
import { ActionButton, ActionIcons } from '@/shared/components/ui/actionIcons';
import SOPCreateForm from '@/features/sop-management/components/SOPCreateForm';
import SOPEditForm from '@/features/sop-management/components/SOPEditForm';
import TrashPanel from '@/features/sop-management/components/TrashPanel';
import { StaggerList, MotionItem } from '@/shared/motion';
import { useAuth } from '@/contexts/AuthContext';

function StatusBadge({ status }) {
  const styles = {
    [SOP_STATUSES.DRAFT]: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
    [SOP_STATUSES.FOR_REVIEW]: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200',
    [SOP_STATUSES.APPROVED]: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200',
    [SOP_STATUSES.PUBLISHED]: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200',
    [SOP_STATUSES.ARCHIVED]: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  };

  return (
    <span className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles[SOP_STATUSES.DRAFT]}`}>
      {status}
    </span>
  );
}

function RestrictionBadge({ restrictionType }) {
  const styles = {
    public: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200',
    department: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200',
    assigned: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200',
    private: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200',
  };
  const labels = {
    public: 'Public',
    department: 'Department',
    assigned: 'Assigned',
    private: 'Private',
  };

  return (
    <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-[10px] font-medium ${styles[restrictionType] || styles.department}`}>
      {labels[restrictionType] || restrictionType}
    </span>
  );
}

function SOPCard({ sop, viewMode, onEditStart, onDeleteSop, onArchiveSop, canManage }) {

  if (viewMode === VIEW_MODES.GRID) {
    return (
      <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
        <div className="flex-1">
          <Link to={`/sops/${sop.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline break-words leading-snug">{sop.title}</Link>
          {sop.description && <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-3">{sop.description}</p>}
           <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--text-muted)] font-mono">{sop.sop_code}</span>
            <StatusBadge status={sop.status} />
            {sop.restriction_type && <RestrictionBadge restrictionType={sop.restriction_type} />}
            {!!sop.is_default_onboarding && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                <GraduationCap size={10} />
                Onboarding
              </span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border)]">
            <button onClick={() => onEditStart(sop)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
              <ActionIcons.Edit className="h-3.5 w-3.5" />
              Edit
            </button>
            <button onClick={() => onArchiveSop(sop)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
              {sop.status === SOP_STATUSES.ARCHIVED ? <ActionIcons.Unarchive className="h-3.5 w-3.5" /> : <ActionIcons.Archive className="h-3.5 w-3.5" />}
              {sop.status === SOP_STATUSES.ARCHIVED ? 'Unarchive' : 'Archive'}
            </button>
            <button onClick={() => onDeleteSop(sop.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
              <ActionIcons.Delete className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
         <Link to={`/sops/${sop.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate">{sop.title}</Link>
          <span className="text-xs text-[var(--text-muted)] shrink-0">{sop.sop_code}</span>
          <StatusBadge status={sop.status} />
          {sop.restriction_type && <RestrictionBadge restrictionType={sop.restriction_type} />}
          {!!sop.is_default_onboarding && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shrink-0">
              <GraduationCap size={10} />
              Onboarding
            </span>
          )}
        </div>
        {canManage && (
          <div className="flex gap-1 shrink-0">
            <ActionButton action="Edit" label="Edit SOP" onClick={() => onEditStart(sop)} />
            <ActionButton
              action={sop.status === SOP_STATUSES.ARCHIVED ? 'Unarchive' : 'Archive'}
              label={sop.status === SOP_STATUSES.ARCHIVED ? 'Unarchive SOP' : 'Archive SOP'}
              onClick={() => onArchiveSop(sop)}
            />
            <ActionButton action="Delete" label="Delete SOP" onClick={() => onDeleteSop(sop.id)} />
          </div>
        )}
      </div>
    </div>
  );
}

function SOPListPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage_sops');

  const {
    sops, loading, search, setSearch, status, setStatus,
    archivedTab, setArchivedTab, showCreate, setShowCreate,
    newTitle, setNewTitle, newDescription, setNewDescription, newLink, setNewLink,
    newCategoryId, setNewCategoryId, loadingCategories, filteredCategories,
    newIsDefaultOnboarding, setNewIsDefaultOnboarding,
    editIsDefaultOnboarding, setEditIsDefaultOnboarding,
    editingSopId, editTitle, setEditTitle, editDescription, setEditDescription,
    editStatus, setEditStatus, editCategoryId, setEditCategoryId, handleCreate, fetchSops,
    resetForm,
    handleEditStart, handleEditCancel, handleEditSave, handleDeleteSop, handleArchiveSop,
    cascade,
  } = useSOPList();

  const [activeTab, setActiveTab] = useState('sops');
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const debouncedSearch = useDebounce(search, 400);
  const debouncedStatus = useDebounce(status, 400);

  useEffect(() => {
    setStatus('');
    setSearch('');
    if (activeTab === 'sops') {
      fetchSops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, archivedTab]);

  useEffect(() => {
    if (activeTab !== 'sops') return;
    fetchSops(debouncedSearch, debouncedStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedStatus, activeTab]);


  useEffect(() => {
    if (!editingSopId) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleEditCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingSopId, handleEditCancel]);
  const editingSop = sops.find(s => s.id === editingSopId);

  const renderSops = () => {
    if (loading) {
      return (
        <div className={viewMode === VIEW_MODES.GRID ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-2'}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 animate-pulse">
              <div className="h-4 w-3/4 rounded bg-[var(--bg-hover)]" />
              <div className="mt-3 h-3 w-1/2 rounded bg-[var(--bg-hover)]" />
              <div className="mt-4 h-8 w-full rounded bg-[var(--bg-hover)]" />
            </div>
          ))}
        </div>
      );
    }

    if (sops.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
          <p className="text-[var(--text-muted)]">{archivedTab ? 'No archived SOPs.' : 'No SOPs found.'}</p>
          {!archivedTab && (
            <p className="text-xs text-[var(--text-muted)] mt-1">Create your first SOP to get started.</p>
          )}
        </div>
      );
    }

    return (
      <StaggerList className={viewMode === VIEW_MODES.GRID ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-2'}>
        {sops.map((sop) => (
          <MotionItem key={sop.id}>
            <SOPCard sop={sop} viewMode={viewMode} onEditStart={handleEditStart} onDeleteSop={handleDeleteSop} onArchiveSop={handleArchiveSop} canManage={canManage} />
          </MotionItem>
        ))}
      </StaggerList>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Files</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Manage your standard operating procedures</p>
        </div>
        {activeTab === 'sops' && !archivedTab && canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            <Plus size={16} />
            Create SOP
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => { setActiveTab('sops'); setArchivedTab(false); }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sops' && !archivedTab
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-neutral-300'
          }`}
        >
          SOPs
        </button>
        <button
          onClick={() => { setActiveTab('sops'); setArchivedTab(true); }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sops' && archivedTab
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-neutral-300'
          }`}
        >
          Archived
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'trash'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-neutral-300'
          }`}
        >
          Trash
        </button>
      </div>

      {activeTab === 'sops' && (
        <>
          <SOPCreateForm
            showCreate={showCreate} setShowCreate={setShowCreate}
            newTitle={newTitle} setNewTitle={setNewTitle}
            newDescription={newDescription} setNewDescription={setNewDescription}
            newLink={newLink} setNewLink={setNewLink}
            newCategoryId={newCategoryId} setNewCategoryId={setNewCategoryId}
            filteredCategories={filteredCategories} loadingCategories={loadingCategories}
            loading={loading}
            cascade={cascade}
            onCancel={resetForm}
            onCreate={handleCreate}
            newIsDefaultOnboarding={newIsDefaultOnboarding}
            setNewIsDefaultOnboarding={setNewIsDefaultOnboarding}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                placeholder={archivedTab ? 'Search archived SOPs...' : 'Search SOPs...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="">All Statuses</option>
              <option value={SOP_STATUSES.DRAFT}>Draft</option>
              <option value={SOP_STATUSES.FOR_REVIEW}>For Review</option>
              <option value={SOP_STATUSES.APPROVED}>Approved</option>
              <option value={SOP_STATUSES.PUBLISHED}>Published</option>
              {!archivedTab && <option value={SOP_STATUSES.ARCHIVED}>Archived</option>}
            </select>
            <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-page)]">
              <button
                onClick={() => setViewMode(VIEW_MODES.GRID)}
                className={`p-2.5 transition-colors ${viewMode === VIEW_MODES.GRID ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="Grid View"
                aria-label="Grid view"
                aria-pressed={viewMode === VIEW_MODES.GRID}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode(VIEW_MODES.LIST)}
                className={`p-2.5 transition-colors ${viewMode === VIEW_MODES.LIST ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="List View"
                aria-label="List view"
                aria-pressed={viewMode === VIEW_MODES.LIST}
              >
                <LayoutList size={16} />
              </button>
            </div>
          </div>

          <div>
            {renderSops()}
          </div>
        </>
      )}

      {activeTab === 'trash' && <TrashPanel />}

      {editingSopId && editingSop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={handleEditCancel} />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Edit SOP</h3>
              <button onClick={handleEditCancel} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X size={20} className="text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>
            <SOPEditForm
              sop={editingSop}
              editTitle={editTitle} setEditTitle={setEditTitle}
              editDescription={editDescription} setEditDescription={setEditDescription}
              editStatus={editStatus} setEditStatus={setEditStatus}
              editCategoryId={editCategoryId} setEditCategoryId={setEditCategoryId}
              filteredCategories={filteredCategories} loadingCategories={loadingCategories}
              cascade={cascade}
              onCancel={handleEditCancel}
              onSave={handleEditSave}
              editIsDefaultOnboarding={editIsDefaultOnboarding}
              setEditIsDefaultOnboarding={setEditIsDefaultOnboarding}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SOPListPage;