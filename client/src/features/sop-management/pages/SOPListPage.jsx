import { useState, useEffect } from 'react';
import { Search, LayoutGrid, LayoutList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { useSOPList } from '@/features/sop-management/hooks/useSOPList';
import { SOP_STATUSES, TRASH_TABS, VIEW_MODES } from '@/features/sop-management/constants/sopConstants';
import CheckboxList from '@/features/sop-management/components/CheckboxList';
import SOPCreateForm from '@/features/sop-management/components/SOPCreateForm';
import SOPEditForm from '@/features/sop-management/components/SOPEditForm';
import TrashPanel from '@/features/sop-management/components/TrashPanel';

function SOPListPage() {
  const {
    sops, loading, search, setSearch, status, setStatus,
    archivedTab, setArchivedTab, showCreate, setShowCreate,
    newTitle, setNewTitle, newDescription, setNewDescription,
    editingSopId, editTitle, setEditTitle, editDescription, setEditDescription,
    editStatus, setEditStatus, handleCreate, fetchSops,
    resetForm, handleEditStart, handleEditCancel, handleEditSave, handleDeleteSop,
    cascade,
  } = useSOPList();

  const [activeTab, setActiveTab] = useState('sops');
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const debouncedSearch = useDebounce(search, 400);
  const debouncedStatus = useDebounce(status, 400);

  useEffect(() => {
    setStatus('');
    setSearch('');
    fetchSops();
  }, [activeTab, archivedTab, setStatus, setSearch, fetchSops]);

  useEffect(() => {
    if (activeTab !== 'sops') return;
    fetchSops(debouncedSearch, debouncedStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedStatus, activeTab]);

  const handleCreateCancel = () => {
    resetForm();
    setShowCreate(false);
  };

  const SOPCard = ({ sop }) => (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:shadow-sm transition-shadow flex flex-col">
      {editingSopId === sop.id ? (
        <SOPEditForm
          sop={sop}
          editTitle={editTitle} setEditTitle={setEditTitle}
          editDescription={editDescription} setEditDescription={setEditDescription}
          editStatus={editStatus} setEditStatus={setEditStatus}
          cascade={cascade}
          onCancel={handleEditCancel}
          onSave={handleEditSave}
          loading={loading}
        />
      ) : viewMode === VIEW_MODES.GRID ? (
        <>
          <div className="flex-1">
            <Link to={`/sops/${sop.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline break-words">{sop.title}</Link>
            {sop.description && <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-3">{sop.description}</p>}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--text-muted)]">{sop.sop_code}</span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300">{sop.status}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border)]">
            <button onClick={() => handleEditStart(sop)} className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 transition-colors">Edit</button>
            <button onClick={() => handleDeleteSop(sop.id)} className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-sm text-red-600 dark:text-red-400 transition-colors">Delete</button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <Link to={`/sops/${sop.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{sop.title}</Link>
            <span className="ml-2 text-xs text-[var(--text-muted)]">{sop.sop_code}</span>
            <span className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300">{sop.status}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleEditStart(sop)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors" title="Edit SOP">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={() => handleDeleteSop(sop.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors" title="Delete SOP">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">SOP Management</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Manage your standard operating procedures</p>
        </div>
        {activeTab === 'sops' && !archivedTab && (
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors rounded-lg inline-flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create SOP
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        <button onClick={() => { setActiveTab('sops'); setArchivedTab(false); }} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sops' && !archivedTab ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-neutral-300'}`}>
          SOPs
        </button>
        <button onClick={() => { setActiveTab('sops'); setArchivedTab(true); }} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sops' && archivedTab ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-neutral-300'}`}>
          Archived
        </button>
        <button onClick={() => setActiveTab('trash')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'trash' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-neutral-300'}`}>
          Trash
        </button>
      </div>

      {activeTab === 'sops' && (
        <>
          <SOPCreateForm
            showCreate={showCreate} setShowCreate={setShowCreate}
            newTitle={newTitle} setNewTitle={setNewTitle}
            newDescription={newDescription} setNewDescription={setNewDescription}
            loading={loading}
            cascade={cascade}
            onCancel={resetForm}
            onCreate={handleCreate}
          />

          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="text" placeholder={archivedTab ? 'Search archived SOPs...' : 'Search SOPs...'} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500" />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500">
              <option value="">All Statuses</option>
              <option value={SOP_STATUSES.DRAFT}>Draft</option>
              <option value={SOP_STATUSES.FOR_REVIEW}>For Review</option>
              <option value={SOP_STATUSES.APPROVED}>Approved</option>
              <option value={SOP_STATUSES.PUBLISHED}>Published</option>
              {!archivedTab && <option value={SOP_STATUSES.ARCHIVED}>Archived</option>}
            </select>
            <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-page)]">
              <button onClick={() => setViewMode(VIEW_MODES.GRID)} className={`p-2 ${viewMode === VIEW_MODES.GRID ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`} title="Grid View">
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode(VIEW_MODES.LIST)} className={`p-2 ${viewMode === VIEW_MODES.LIST ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`} title="List View">
                <LayoutList size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-[var(--text-muted)] text-center py-8">Loading...</p>
          ) : (
            <div className={viewMode === VIEW_MODES.GRID ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
              {sops.map((sop) => (
                <SOPCard key={sop.id} sop={sop} />
              ))}
              {sops.length === 0 && !loading && (
                <div className={viewMode === VIEW_MODES.GRID ? 'col-span-full' : ''}>
                  <p className="text-[var(--text-muted)] text-center py-8">{archivedTab ? 'No archived SOPs.' : 'No SOPs found.'}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'trash' && <TrashPanel />}
    </div>
  );
}

export default SOPListPage;
