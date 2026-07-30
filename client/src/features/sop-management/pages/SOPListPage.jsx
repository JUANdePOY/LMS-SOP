import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Check, TrashIcon, Undo2, Edit2, Trash2, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAssignmentCascade } from '@/features/sop-management/hooks/useAssignmentCascade';
import { createAssignment } from '@/features/sop-management/services/assignmentService';
import { deleteSop, updateSop } from '@/features/sop-management/services/sopService';
import { useTrashSops } from '@/features/sop-management/hooks/useTrashSops';
import { useTrashModules } from '@/features/sop-management/hooks/useTrashModules';
import { useTrashAttachments } from '@/features/sop-management/hooks/useTrashAttachments';
import { useDebounce } from '@/hooks/useDebounce';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';

function CheckboxList({ items, selectedIds, onToggle, labelKey, valueKey, placeholder }) {
  const [open, setOpen] = useState(false);
  const selectedCount = selectedIds.length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-sm text-[var(--text-primary)] hover:border-[var(--border)] transition-colors flex items-center justify-between"
      >
        <span className={selectedCount > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
          {selectedCount > 0 ? `${selectedCount} selected` : placeholder}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-sm">
          {items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--text-muted)]">No options</p>
          ) : (
            items.map((item) => {
              const id = valueKey ? item[valueKey] : item;
              const label = labelKey ? item[labelKey] : item;
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(id)}
                    className="rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[var(--text-primary)]">{label}</span>
                  {checked && <Check size={14} className="ml-auto text-green-600" />}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const TRASH_TABS = {
  SOPS: 'sops',
  MODULES: 'modules',
  ATTACHMENTS: 'attachments',
};

function SOPListPage() {
  const [activeTab, setActiveTab] = useState('sops');
  const [sops, setSops] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingSopId, setEditingSopId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [archivedTab, setArchivedTab] = useState(false);
  const cascade = useAssignmentCascade();

  const sopTrash = useTrashSops();
  const moduleTrash = useTrashModules(null);
  const attachmentTrash = useTrashAttachments(null);

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

  const debouncedSearch = useDebounce(search, 400);
  const debouncedStatus = useDebounce(status, 400);

  useEffect(() => {
    setStatus('');
    setSearch('');
    handleSearch();
  }, [activeTab, archivedTab]);

  useEffect(() => {
    if (activeTab !== 'sops') return;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedStatus, activeTab]);

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    cascade.setSelectedBusinessIds([]);
    cascade.setSelectedDeptIds([]);
    cascade.setSelectedPositions([]);
    cascade.setSelectedUserIds([]);
    cascade.setUserSearch('');
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const { data: sopData } = await api.post('/sops', { title: newTitle, description: newDescription, department_id: null, status: 'Draft' });
      const sopId = sopData?.data?.id || sopData?.id;
      if (sopId && cascade.selectedDeptIds.length > 0) {
        await createAssignment(sopId, {
          department_ids: cascade.selectedDeptIds,
          position_names: cascade.selectedPositions,
          user_ids: cascade.selectedUserIds,
          due_date: null,
          notes: '',
        });
      }
      resetForm();
      setShowCreate(false);
      await handleSearch();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchValue, statusValue) => {
    setLoading(true);
    try {
      const params = { search: searchValue ?? search };
      const effectiveStatus = statusValue ?? status;
      if (archivedTab) {
        params.status = 'Archived';
      } else {
        params.exclude_status = 'Archived';
        if (effectiveStatus) {
          params.status = effectiveStatus;
        }
      }
      const { data } = await api.get('/sops', { params });
      setSops(data?.data?.rows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (sop) => {
    setEditingSopId(sop.id);
    setEditTitle(sop.title);
    setEditDescription(sop.description || '');
    setEditStatus(sop.status);
  };

  const handleEditCancel = () => {
    setEditingSopId(null);
    setEditTitle('');
    setEditDescription('');
    setEditStatus('');
  };

  const handleEditSave = async (sopId) => {
    if (!editTitle.trim()) return;
    try {
      await updateSop(sopId, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
      });
      setEditingSopId(null);
      await handleSearch();
    } catch (err) {
      console.error('Failed to update SOP:', err);
    }
  };

  const handleRestore = (entityType, id) => {
    setConfirmDialog({
      isOpen: true,
      type: 'restore',
      entityType,
      id,
      title: 'Restore Item',
      message: 'Are you sure you want to restore this item? It will reappear in its original location.',
      variant: 'default',
    });
  };

  const handlePermanentDelete = (entityType, id) => {
    setConfirmDialog({
      isOpen: true,
      type: 'permanent',
      entityType,
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

  const handleDeleteSop = (sopId) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      entityType: TRASH_TABS.SOPS,
      id: sopId,
      title: 'Delete SOP',
      message: 'Are you sure you want to delete this SOP? It will be moved to the trash and can be restored later.',
      variant: 'destructive',
    });
  };

  const confirmAction = async () => {
    if (!confirmDialog || !confirmDialog.isOpen) return;
    const { type, entityType, id } = confirmDialog;

    try {
      if (type === 'restore') {
        if (entityType === TRASH_TABS.SOPS) await sopTrash.restore(id);
        else if (entityType === TRASH_TABS.MODULES) await moduleTrash.restore(id);
        else if (entityType === TRASH_TABS.ATTACHMENTS) await attachmentTrash.restore(id);
      } else if (type === 'delete') {
        if (entityType === TRASH_TABS.SOPS) {
          await deleteSop(id);
          await handleSearch();
        }
      } else if (type === 'permanent') {
        if (entityType === TRASH_TABS.SOPS) await sopTrash.permanentlyDelete(id);
        else if (entityType === TRASH_TABS.MODULES) await moduleTrash.permanentlyDelete(id);
        else if (entityType === TRASH_TABS.ATTACHMENTS) await attachmentTrash.permanentlyDelete(id);
      } else if (type === 'empty') {
        await sopTrash.emptyAll();
      }
    } catch (err) {
      console.error('Action failed:', err);
    }

    setConfirmDialog({ isOpen: false, type: 'restore', entityType: TRASH_TABS.SOPS, id: undefined, title: '', message: '', variant: 'default' });
  };

  const tabs = [
    { key: TRASH_TABS.SOPS, label: 'SOPs', count: sopTrash.total },
    { key: TRASH_TABS.MODULES, label: 'Modules', count: moduleTrash.modules.length },
    { key: TRASH_TABS.ATTACHMENTS, label: 'Attachments', count: attachmentTrash.attachments.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">SOP Management</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Manage your standard operating procedures</p>
        </div>
        {activeTab === 'sops' && !archivedTab && (
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors rounded-lg inline-flex items-center gap-2">
            <Plus size={16} /> Create SOP
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => { setActiveTab('sops'); setArchivedTab(false); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sops' && !archivedTab
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-neutral-300'
          }`}
        >
          SOPs
        </button>
        <button
          onClick={() => { setActiveTab('sops'); setArchivedTab(true); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sops' && archivedTab
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-neutral-300'
          }`}
        >
          Archived
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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
           {showCreate && !archivedTab && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { resetForm(); setShowCreate(false); }} />
               <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm p-6">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-[var(--text-primary)]">New SOP</h3>
                   <button
                     type="button"
                     onClick={() => { resetForm(); setShowCreate(false); }}
                     className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                   >
                     <X size={20} className="text-[var(--text-muted)]" />
                   </button>
                 </div>

                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">SOP Title</label>
                     <input
                       type="text"
                       placeholder="SOP Title"
                       value={newTitle}
                       onChange={(e) => setNewTitle(e.target.value)}
                       className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description (optional)</label>
                     <textarea
                       placeholder="Description (optional)"
                       value={newDescription}
                       onChange={(e) => setNewDescription(e.target.value)}
                       className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
                       rows={3}
                     />
                   </div>
                   <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-2 mb-1">Assignments</h4>
                   <CheckboxList
                     items={cascade.businesses}
                     selectedIds={cascade.selectedBusinessIds}
                     onToggle={cascade.toggleBusiness}
                     labelKey="business_name"
                     valueKey="id"
                     placeholder="Select businesses..."
                   />
                   <CheckboxList
                     items={cascade.filteredDepartments}
                     selectedIds={cascade.selectedDeptIds}
                     onToggle={cascade.toggleDepartment}
                     labelKey="name"
                     valueKey="id"
                     placeholder="Select departments..."
                   />
                   <CheckboxList
                     items={cascade.positions}
                     selectedIds={cascade.selectedPositions}
                     onToggle={cascade.togglePosition}
                     labelKey={(p) => p}
                     valueKey={(p) => p}
                     placeholder="Select positions..."
                   />
                   <div>
                     <div className="flex items-center justify-between mb-1">
                       <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Users</span>
                       <span className="text-xs text-neutral-400">{cascade.totalUsers} found</span>
                     </div>
                     <input
                       type="text"
                       placeholder="Search users..."
                       value={cascade.userSearch}
                       onChange={(e) => cascade.setUserSearch(e.target.value)}
                       className="w-full rounded border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-xs bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mb-2 focus:outline-none focus:border-indigo-500"
                     />
                     <CheckboxList
                       items={cascade.users}
                       selectedIds={cascade.selectedUserIds}
                       onToggle={cascade.toggleUser}
                       labelKey="full_name"
                       valueKey="id"
                       placeholder="Select users..."
                     />
                   </div>
                 </div>

                 <div className="flex justify-end gap-3 mt-6">
                   <button
                     type="button"
                     onClick={() => { resetForm(); setShowCreate(false); }}
                     className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                   >
                     Cancel
                   </button>
                   <button onClick={handleCreate} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                     {loading ? 'Creating...' : 'Create'}
                   </button>
                 </div>
               </div>
             </div>
           )}

           <div className="flex gap-3 mb-4">
             <div className="relative flex-1">
               <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
               <input
                 type="text"
                 placeholder={archivedTab ? 'Search archived SOPs...' : 'Search SOPs...'}
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
               />
             </div>
             <select
               value={status}
               onChange={(e) => setStatus(e.target.value)}
               className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
             >
               <option value="">All Statuses</option>
               <option value="Draft">Draft</option>
               <option value="For Review">For Review</option>
               <option value="Approved">Approved</option>
               <option value="Published">Published</option>
               {!archivedTab && <option value="Archived">Archived</option>}
              </select>
            </div>
           {loading ? (
             <p className="text-[var(--text-muted)] text-center py-8">Loading...</p>
           ) : (
             <div className="space-y-2">
               {sops.map((sop) => (
                 <div key={sop.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:shadow-sm transition-shadow">
                   {editingSopId === sop.id ? (
                       <div className="space-y-3">
                       <div>
                         <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">SOP Title</label>
                         <input
                           type="text"
                           value={editTitle}
                           onChange={(e) => setEditTitle(e.target.value)}
                           placeholder="SOP Title"
                           className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description (optional)</label>
                         <textarea
                           value={editDescription}
                           onChange={(e) => setEditDescription(e.target.value)}
                           placeholder="Description (optional)"
                           className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
                           rows={2}
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Status</label>
                         <select
                           value={editStatus}
                           onChange={(e) => setEditStatus(e.target.value)}
                           className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
                         >
                           <option value="Draft">Draft</option>
                           <option value="For Review">For Review</option>
                           <option value="Approved">Approved</option>
                           <option value="Published">Published</option>
                           <option value="Archived">Archived</option>
                         </select>
                       </div>
                       <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-2 mb-1">Assignments</h4>
                       <CheckboxList
                         items={cascade.businesses}
                         selectedIds={cascade.selectedBusinessIds}
                         onToggle={cascade.toggleBusiness}
                         labelKey="business_name"
                         valueKey="id"
                         placeholder="Select businesses..."
                       />
                       <CheckboxList
                         items={cascade.filteredDepartments}
                         selectedIds={cascade.selectedDeptIds}
                         onToggle={cascade.toggleDepartment}
                         labelKey="name"
                         valueKey="id"
                         placeholder="Select departments..."
                       />
                       <CheckboxList
                         items={cascade.positions}
                         selectedIds={cascade.selectedPositions}
                         onToggle={cascade.togglePosition}
                         labelKey={(p) => p}
                         valueKey={(p) => p}
                         placeholder="Select positions..."
                       />
                       <div>
                         <div className="flex items-center justify-between mb-1">
                           <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Users</span>
                           <span className="text-xs text-neutral-400">{cascade.totalUsers} found</span>
                         </div>
                         <input
                           type="text"
                           placeholder="Search users..."
                           value={cascade.userSearch}
                           onChange={(e) => cascade.setUserSearch(e.target.value)}
                           className="w-full rounded border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-xs bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mb-2 focus:outline-none focus:border-indigo-500"
                         />
                         <CheckboxList
                           items={cascade.users}
                           selectedIds={cascade.selectedUserIds}
                           onToggle={cascade.toggleUser}
                           labelKey="full_name"
                           valueKey="id"
                           placeholder="Select users..."
                         />
                       </div>
                       <div className="flex gap-2 justify-end">
                         <button
                           onClick={handleEditCancel}
                           className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 transition-colors"
                         >
                           Cancel
                         </button>
                         <button
                           onClick={() => handleEditSave(sop.id)}
                           className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
                         >
                           Save
                         </button>
                       </div>
                     </div>
                   ) : (
                       <div className="flex items-center justify-between">
                         <div>
                           <Link to={`/sops/${sop.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                             {sop.title}
                           </Link>
                           <span className="ml-2 text-xs text-[var(--text-muted)]">{sop.sop_code}</span>
                           <span className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300">{sop.status}</span>
                         </div>
                         <div className="flex gap-2">
                           <button
                             onClick={() => handleEditStart(sop)}
                             className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                             title="Edit SOP"
                           >
                             <Edit2 size={14} />
                           </button>
                           <button
                             onClick={() => handleDeleteSop(sop.id)}
                             className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                             title="Delete SOP"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                       </div>
                   )}
                 </div>
               ))}
               {sops.length === 0 && !loading && (
                 <p className="text-[var(--text-muted)] text-center py-8">
                   {archivedTab ? 'No archived SOPs.' : 'No SOPs found.'}
                 </p>
               )}
             </div>
           )}
         </>
       )}

      {activeTab === 'trash' && (
        <>
           {trashTab === TRASH_TABS.SOPS && sopTrash.total > 0 && (
             <div className="mb-4">
               <button
                 onClick={handleEmptyTrash}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
               >
                 Empty Trash
               </button>
             </div>
           )}

          <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-700">
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

           {trashTab === TRASH_TABS.SOPS && (
             <div className="space-y-2">
               {sopTrash.loading && <p className="text-[var(--text-muted)] text-center py-8">Loading trashed SOPs...</p>}
               {sopTrash.error && <p className="text-red-600 dark:text-red-400 text-center py-8">Failed to load trashed SOPs</p>}
               {!sopTrash.loading && !sopTrash.error && sopTrash.sops.length === 0 && (
                 <p className="text-[var(--text-muted)] text-center py-8">No trashed SOPs.</p>
               )}
               {!sopTrash.loading && !sopTrash.error && sopTrash.sops.map((sop) => (
                 <div
                   key={sop.id}
                   className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:shadow-sm transition-shadow"
                 >
                   <div>
                     <span className="font-medium text-[var(--text-primary)]">{sop.title}</span>
                     <span className="ml-2 text-xs text-[var(--text-muted)]">{sop.sop_code}</span>
                     <span className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300">
                       {sop.status}
                     </span>
                     <p className="text-xs text-[var(--text-muted)] mt-1">
                       Deleted: {sop.updated_at ? new Date(sop.updated_at).toLocaleDateString() : 'N/A'}
                     </p>
                   </div>
                   <div className="flex gap-2">
                     <button
                       onClick={() => handleRestore('sops', sop.id)}
                       className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                     >
                       <Undo2 size={14} className="inline mr-1" /> Restore
                     </button>
                     <button
                       onClick={() => handlePermanentDelete('sops', sop.id)}
                       className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                     >
                       <TrashIcon size={14} className="inline mr-1" /> Delete Forever
                     </button>
                   </div>
                 </div>
               ))}
            </div>
          )}

           {trashTab === TRASH_TABS.MODULES && (
             <div className="space-y-2">
               {moduleTrash.loading && <p className="text-[var(--text-muted)] text-center py-8">Loading trashed modules...</p>}
               {moduleTrash.error && <p className="text-red-600 dark:text-red-400 text-center py-8">Failed to load trashed modules</p>}
               {!moduleTrash.loading && !moduleTrash.error && moduleTrash.modules.length === 0 && (
                 <p className="text-[var(--text-muted)] text-center py-8">No trashed modules.</p>
               )}
               {!moduleTrash.loading && !moduleTrash.error && moduleTrash.modules.map((mod) => (
                 <div
                   key={mod.id}
                   className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:shadow-sm transition-shadow"
                 >
                   <div>
                     <span className="font-medium text-[var(--text-primary)]">{mod.title}</span>
                     <p className="text-xs text-[var(--text-muted)] mt-1">
                       Deleted: {mod.updated_at ? new Date(mod.updated_at).toLocaleDateString() : 'N/A'}
                     </p>
                   </div>
                   <div className="flex gap-2">
                     <button
                       onClick={() => handleRestore('modules', mod.id)}
                       className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                     >
                       <Undo2 size={14} className="inline mr-1" /> Restore
                     </button>
                     <button
                       onClick={() => handlePermanentDelete('modules', mod.id)}
                       className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                     >
                       <TrashIcon size={14} className="inline mr-1" /> Delete Forever
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}

           {trashTab === TRASH_TABS.ATTACHMENTS && (
             <div className="space-y-2">
               {attachmentTrash.loading && <p className="text-[var(--text-muted)] text-center py-8">Loading trashed attachments...</p>}
               {attachmentTrash.error && <p className="text-red-600 dark:text-red-400 text-center py-8">Failed to load trashed attachments</p>}
               {!attachmentTrash.loading && !attachmentTrash.error && attachmentTrash.attachments.length === 0 && (
                 <p className="text-[var(--text-muted)] text-center py-8">No trashed attachments.</p>
               )}
               {!attachmentTrash.loading && !attachmentTrash.error && attachmentTrash.attachments.map((att) => (
                 <div
                   key={att.id}
                   className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:shadow-sm transition-shadow"
                 >
                   <div>
                     <span className="font-medium text-[var(--text-primary)]">{att.original_name || att.file_name}</span>
                     <p className="text-xs text-[var(--text-muted)] mt-1">
                       Deleted: {att.updated_at ? new Date(att.updated_at).toLocaleDateString() : 'N/A'}
                     </p>
                   </div>
                   <div className="flex gap-2">
                     <button
                       onClick={() => handleRestore('attachments', att.id)}
                       className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                     >
                       <Undo2 size={14} className="inline mr-1" /> Restore
                     </button>
                     <button
                       onClick={() => handlePermanentDelete('attachments', att.id)}
                       className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                     >
                       <TrashIcon size={14} className="inline mr-1" /> Delete Forever
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </>
      )}

      <ConfirmationDialog
        isOpen={confirmDialog?.isOpen || false}
        onClose={() => setConfirmDialog(null)}
        onConfirm={confirmAction}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmText={confirmDialog?.type === 'permanent' ? 'Permanently Delete' : confirmDialog?.type === 'empty' ? 'Empty Trash' : confirmDialog?.type === 'delete' ? 'Delete' : 'Restore'}
        variant={confirmDialog?.variant || 'default'}
      />
    </div>
  );
}

export default SOPListPage;