import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import DepartmentTable from '../components/department/DepartmentTable';
import DepartmentModal from '../components/department/DepartmentModal';
import { useDepartments } from '../hooks/useDepartments';
import { useBusinesses } from '../hooks/useBusinesses';
import { useUsers } from '../hooks/useUsers';
import { useToast } from '@/shared/components/Toast';

export default function DepartmentPage() {
  const { departments, loading, error, create, update, remove } = useDepartments();
  const { businesses } = useBusinesses();
  const { users: allUsers } = useUsers();
  const { success, error: showError } = useToast();
  const users = allUsers.filter(
    (u) => u.role === 'admin' || u.role === 'department_head'
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');

  const filteredDepartments = useMemo(() => {
    const term = query.trim().toLowerCase();
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
  }, [query, departments, statusFilter, businessFilter]);

  const hasActiveFilters = query.trim() || statusFilter !== 'all' || businessFilter !== 'all';

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      await create(data);
      success('Department created successfully');
      setModalOpen(false);
      setEditData(null);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create department';
      showError(message);
      console.error('Failed to create department:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data) => {
    if (!editData) return;
    setSubmitting(true);
    try {
      await update(editData.id, data);
      success('Department updated successfully');
      setModalOpen(false);
      setEditData(null);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update department';
      showError(message);
      console.error('Failed to update department:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept) => {
    setEditData(dept);
    setModalOpen(true);
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete "${dept.name}"? This action cannot be undone.`)) return;
    try {
      await remove(dept.id);
      success('Department deleted successfully');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete department';
      showError(message);
      console.error('Failed to delete department:', err);
    }
  };

  return (
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
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Department
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments by name or code..."
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
    </div>
  );
}

