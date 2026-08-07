import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import CategoryTable from '../components/category/CategoryTable';
import CategoryModal from '../components/category/CategoryModal';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import { useCategories } from '../hooks/useCategories';
import { useDepartments } from '../hooks/useDepartments';
import { sanitizeSearchQuery, validateSearchQuery } from '../utils/validation';
import { useToast } from '@/shared/components/ui/Toast';

export default function CategoryPage() {
  const { categories, loading, error, create, update, remove } = useCategories();
  const { departments } = useDepartments();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, category: null });

  const safeQuery = sanitizeSearchQuery(query);

  const filteredCategories = useMemo(() => {
    const term = safeQuery.toLowerCase();
    let result = categories || [];
    if (term) {
      result = result.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(term) ||
          (c.description || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((c) => String(c.is_active) === statusFilter);
    }
    if (departmentFilter !== 'all') {
      result = result.filter((c) => String(c.department_id) === departmentFilter);
    }
    return result;
  }, [safeQuery, categories, statusFilter, departmentFilter]);

  const hasActiveFilters = safeQuery || statusFilter !== 'all' || departmentFilter !== 'all';

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      await create(data);
      setModalOpen(false);
      setEditData(null);
      toast.success('Category created successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data) => {
    if (!editData) return;
    setSubmitting(true);
    try {
      await update(editData.id, data);
      setModalOpen(false);
      setEditData(null);
      toast.success('Category updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditData(category);
    setModalOpen(true);
  };

  const handleDelete = (category) => {
    setDeleteConfirm({ open: true, category });
  };

  const confirmDelete = async () => {
    const category = deleteConfirm.category;
    if (!category) return;
    setDeleting(true);
    try {
      await remove(category.id);
      toast.success('Category deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
      setDeleteConfirm({ open: false, category: null });
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    const err = validateSearchQuery(value);
    if (err) return;
    setQuery(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Categories</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage categories within departments.
          </p>
        </div>
        <button
          onClick={() => { setEditData(null); setModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
        >
          <Plus size={16} />
          Create Category
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
              onChange={handleSearchChange}
              placeholder="Search categories by name or description..."
              maxLength={100}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="all">All departments</option>
            {(departments || []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="all">All statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setQuery(''); setStatusFilter('all'); setDepartmentFilter('all'); }}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <CategoryTable
        categories={filteredCategories}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <CategoryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null); }}
        onSubmit={editData ? handleUpdate : handleCreate}
        initialData={editData}
        loading={submitting}
        departments={departments}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, category: null })}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirm.category?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}