import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import DepartmentTable from '../components/department/DepartmentTable';
import DepartmentModal from '../components/department/DepartmentModal';
import { useDepartments } from '../hooks/useDepartments';
import { useBusinesses } from '../hooks/useBusinesses';
import { useUsers } from '../hooks/useUsers';
import { useToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import KPICards from '../components/KPICards';
import { sanitizeSearchQuery, validateSearchQuery } from '../utils/validation';

export default function DepartmentPage() {
  const { departments, loading, error, create, update, remove, refresh } = useDepartments();
  const { businesses } = useBusinesses();
  const { users: allUsers } = useUsers();
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const users = allUsers.filter(
    (u) => u.role === 'admin' || u.role === 'department_head'
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, department: null, force: false });
  const [deleting, setDeleting] = useState(false);

  const safeQuery = sanitizeSearchQuery(query);

  const filteredDepartments = useMemo(() => {
    const term = safeQuery.toLowerCase();
    let result = departments || [];
    if (term) {
      result = result.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(term) ||
          (d.code || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((d) => d.status === statusFilter);
    }
    if (businessFilter !== 'all') {
      result = result.filter((d) => String(d.business_id) === businessFilter);
    }
    return result;
  }, [safeQuery, departments, statusFilter, businessFilter]);

  const hasActiveFilters = safeQuery || statusFilter !== 'all' || businessFilter !== 'all';

  const kpiCards = useMemo(() => {
    const list = departments || [];
    return [
      { label: 'Total Departments', value: list.length, sub: { icon: 'Layers' }, color: 'blue' },
      { label: 'Active', value: list.filter((d) => d.status === 'active').length, sub: { icon: 'Layers' }, color: 'emerald' },
      { label: 'Inactive', value: list.filter((d) => d.status === 'inactive' || d.status === 'archived').length, sub: { icon: 'Layers' }, color: 'amber' },
    ];
  }, [departments]);

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      await create(data);
      toast.success('Department created successfully');
      setModalOpen(false);
      setEditData(null);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create department';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data) => {
    if (!editData) return;
    setSubmitting(true);
    try {
      await update(editData.id, data);
      toast.success('Department updated successfully');
      setModalOpen(false);
      setEditData(null);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update department';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept) => {
    setEditData(dept);
    setModalOpen(true);
  };

  const handleDelete = (dept) => {
    setDeleteConfirm({ open: true, department: dept, force: false });
  };

  const confirmDelete = async () => {
    const dept = deleteConfirm.department;
    if (!dept) return;
    setDeleting(true);
    try {
      await remove(dept.id, { force: deleteConfirm.force });
      toast.success('Department deleted successfully');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete department';
      toast.error(message);
    } finally {
      setDeleting(false);
      setDeleteConfirm({ open: false, department: null });
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    const err = validateSearchQuery(value);
    if (err) return;
    setQuery(value);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Departments</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage departments within your businesses.
          </p>
        </div>
        <button
          onClick={() => { setEditData(null); setModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
        >
          <Plus size={16} />
          Create Department
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <div className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <KPICards cards={kpiCards} />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={handleSearchChange}
              placeholder="Search departments by name or code..."
              maxLength={100}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none"
            />
          </div>
          <select
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="all">All businesses</option>
            {(businesses || []).map((b) => (
              <option key={b.id} value={b.id}>{b.business_name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setQuery(''); setStatusFilter('all'); setBusinessFilter('all'); }}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <DepartmentTable
        departments={filteredDepartments}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DepartmentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null); }}
        onSubmit={editData ? handleUpdate : handleCreate}
        initialData={editData}
        loading={submitting}
        businesses={businesses}
        users={users}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, department: null, force: false })}
        onConfirm={confirmDelete}
        title="Delete Department"
        message={`Are you sure you want to delete "${deleteConfirm.department?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      >
        {isSuperAdmin && (
          <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <input
              type="checkbox"
              checked={deleteConfirm.force}
              onChange={(e) => setDeleteConfirm((prev) => ({ ...prev, force: e.target.checked }))}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Force delete</span> — removes this department along with its SOPs, categories, and users' department links instead of blocking.
            </span>
          </label>
        )}
      </ConfirmationDialog>
      </div>
    </ErrorBoundary>
  );
}

