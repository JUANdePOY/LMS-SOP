import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Building2, Users, Pencil, Trash2 } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import ClientModal from '../components/client/ClientModal';
import KPICards from '../../organization-management/components/KPICards';
import { useToast } from '@/shared/components/ui/Toast';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';

export default function ClientsPage() {
  const { clients, loading, error, load, create, update, remove } = useClients();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, client: null });

  useEffect(() => {
    load();
  }, [load]);

  const safeQuery = query.toLowerCase();
  const filteredClients = useMemo(() => {
    if (!safeQuery) return clients;
    return clients.filter(
      (c) =>
        (c.client_name || '').toLowerCase().includes(safeQuery) ||
        (c.businesses || []).some((b) => b.business_name.toLowerCase().includes(safeQuery))
    );
  }, [clients, safeQuery]);

  const kpiCards = useMemo(() => {
    const list = clients || [];
    const withBusinesses = list.filter((c) => (c.businesses || []).length > 0).length;
    const totalBusinesses = list.reduce((sum, c) => sum + (c.businesses?.length || 0), 0);
    return [
      { label: 'Total Clients', value: list.length, sub: { icon: 'Users' }, color: 'blue' },
      { label: 'With Businesses', value: withBusinesses, sub: { icon: 'Building2' }, color: 'emerald' },
      { label: 'Total Businesses', value: totalBusinesses, sub: { icon: 'Building2' }, color: 'amber' },
    ];
  }, [clients]);

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editData) {
        await update(editData.id, data);
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditData(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (client) => setDeleteConfirm({ open: true, client });

  const confirmDelete = async () => {
    const client = deleteConfirm.client;
    if (!client) return;
    try {
      await remove(client.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete client');
    } finally {
      setDeleteConfirm({ open: false, client: null });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Clients</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage clients and their associated businesses.
          </p>
        </div>
        <button
          onClick={() => { setEditData(null); setModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
        >
          <Plus size={16} />
          Create Client
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      <KPICards cards={kpiCards} />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients or businesses..."
            maxLength={100}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-page)] text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th className="text-left px-4 py-3">Client Name</th>
                <th className="text-left px-4 py-3">Businesses</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && clients.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    Loading...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    No clients found
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{client.client_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(client.businesses || []).map((b) => (
                          <span
                            key={b.id}
                            className="rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
                          >
                            {b.business_name}
                          </span>
                        ))}
                        {(client.businesses || []).length === 0 && (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditData(client); setModalOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-page)] text-[var(--text-muted)]"
                          aria-label="Edit client"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600"
                          aria-label="Delete client"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null); }}
        onSubmit={handleSubmit}
        initialData={editData}
        loading={submitting}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, client: null })}
        onConfirm={confirmDelete}
        title="Delete Client"
        message={`Are you sure you want to delete "${deleteConfirm.client?.client_name}"? This will also remove its businesses. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
