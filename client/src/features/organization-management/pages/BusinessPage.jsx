import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import BusinessTable from '../components/business/BusinessTable';
import BusinessModal from '../components/business/BusinessModal';
import { useBusinesses } from '../hooks/useBusinesses';
import { uploadBusinessLogo } from '../api/business.api';
import KPICards from '../components/KPICards';
import { sanitizeSearchQuery, validateSearchQuery } from '../utils/validation';
import { useToast } from '@/shared/components/ui/Toast';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';

export default function BusinessPage() {
  const { businesses, loading, error, create, update, remove } = useBusinesses();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, business: null });

  const safeQuery = sanitizeSearchQuery(query);

  const filteredBusinesses = useMemo(() => {
    const term = safeQuery.toLowerCase();
    let result = businesses || [];
    if (term) {
      result = result.filter(
        (b) =>
          (b.business_name || '').toLowerCase().includes(term) ||
          (b.business_code || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }
    return result;
  }, [safeQuery, businesses, statusFilter]);

  const hasActiveFilters = safeQuery || statusFilter !== 'all';

  const kpiCards = useMemo(() => {
    const list = businesses || [];
    return [
      { label: 'Total Businesses', value: list.length, sub: { icon: 'Building2' }, color: 'blue' },
      { label: 'Active', value: list.filter((b) => b.status === 'active').length, sub: { icon: 'Building2' }, color: 'emerald' },
      { label: 'Inactive', value: list.filter((b) => b.status === 'inactive').length, sub: { icon: 'Building2' }, color: 'amber' },
    ];
  }, [businesses]);

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      const { logoFile, ...businessData } = data;
      const created = await create(businessData);
      if (logoFile && created?.id) {
        const logoFormData = new FormData();
        logoFormData.append('logo', logoFile);
        await uploadBusinessLogo(created.id, logoFormData);
      }
      setModalOpen(false);
      setEditData(null);
      toast.success('Business created successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create business');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data) => {
    if (!editData) return;
    setSubmitting(true);
    try {
      const { logoFile, ...businessData } = data;
      await update(editData.id, businessData);
      if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append('logo', logoFile);
        await uploadBusinessLogo(editData.id, logoFormData);
      }
      setModalOpen(false);
      setEditData(null);
      toast.success('Business updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update business');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (business) => {
    setEditData(business);
    setModalOpen(true);
  };

  const handleDelete = (business) => {
    setDeleteConfirm({ open: true, business });
  };

  const confirmDelete = async () => {
    const business = deleteConfirm.business;
    if (!business) return;
    try {
      await remove(business.id);
      toast.success('Business deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete business');
    } finally {
      setDeleteConfirm({ open: false, business: null });
    }
  };

  const handleToggleStatus = async (business) => {
    const newStatus = business.status === 'active' ? 'inactive' : 'active';
    try {
      await update(business.id, { status: newStatus });
      toast.success(`Business ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle business status');
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Businesses</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage business entities in your organization.
          </p>
        </div>
        <button
          onClick={() => { setEditData(null); setModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
        >
          <Plus size={16} />
          Create Business
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
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
              placeholder="Search businesses by name or code..."
              maxLength={100}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setQuery(''); setStatusFilter('all'); }}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <BusinessTable
        businesses={filteredBusinesses}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />

      <BusinessModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null); }}
        onSubmit={editData ? handleUpdate : handleCreate}
        initialData={editData}
        loading={submitting}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, business: null })}
        onConfirm={confirmDelete}
        title="Delete Business"
        message={`Are you sure you want to delete "${deleteConfirm.business?.business_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

