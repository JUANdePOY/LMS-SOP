import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import api from '@/services/api';
import { useToast } from '@/shared/components/ui/Toast';
import { Plus } from 'lucide-react';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, PROJECT_COLORS } from '../constants/projectConstants';
import ClientFormModal from './ClientFormModal';
import BusinessFormModal from './BusinessFormModal';

export default function ProjectFormModal({ open, onClose, onCreated, defaultClientBusinessId }) {
  const { toast } = useToast();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientBusinessId, setClientBusinessId] = useState(defaultClientBusinessId || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);

  const fetchClients = () =>
    api.get('/clients').then((res) => setClients(res.data?.data || [])).catch(() => setClients([]));

  useEffect(() => {
    if (!open) return;
    fetchClients();
  }, [open]);

  useEffect(() => {
    if (defaultClientBusinessId) setClientBusinessId(String(defaultClientBusinessId));
  }, [defaultClientBusinessId, open]);

  // When a default business is supplied, pre-select its owning client.
  useEffect(() => {
    if (!defaultClientBusinessId || clients.length === 0) return;
    const owner = clients.find((c) => (c.businesses || []).some((b) => String(b.id) === String(defaultClientBusinessId)));
    if (owner) setSelectedClientId(String(owner.id));
  }, [defaultClientBusinessId, clients]);

  const selectedClient = clients.find((c) => String(c.id) === selectedClientId);
  const businessOptions = (selectedClient?.businesses || []).map((b) => ({
    value: String(b.id),
    label: b.business_name,
  }));

  async function handleSubmit() {
    if (!clientBusinessId) {
      toast.error('Select a client business');
      return;
    }
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/projects', {
        client_business_id: parseInt(clientBusinessId, 10),
        name: name.trim(),
        description: description.trim() || null,
        status,
        color,
        start_date: startDate || null,
        due_date: dueDate || null,
      });
      const project = res.data?.data;
      toast.success('Project created');
      onCreated?.(project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  }

  async function handleClientCreated(client) {
    await fetchClients();
    setSelectedClientId(String(client.id));
    setClientBusinessId(String(client.businesses?.[0]?.id || ''));
    setShowClientModal(false);
  }

  async function handleBusinessCreated(business) {
    await fetchClients();
    setSelectedClientId(String(business.client_id));
    setClientBusinessId(String(business.id));
    setShowBusinessModal(false);
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="New Project" size="lg" footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Client</label>
            <div className="flex items-center gap-2">
              <select
                value={selectedClientId}
                onChange={(e) => { setSelectedClientId(e.target.value); setClientBusinessId(''); }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.client_name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowClientModal(true)}
                className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                title="Create new client"
              >
                <Plus size={14} /> Client
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Business</label>
            <div className="flex items-center gap-2">
              <select
                value={clientBusinessId}
                onChange={(e) => setClientBusinessId(e.target.value)}
                disabled={!selectedClientId}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
              >
                <option value="">{selectedClientId ? 'Select a business…' : 'Select a client first'}</option>
                {businessOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!selectedClientId) {
                    toast.error('Select a client first');
                    return;
                  }
                  setShowBusinessModal(true);
                }}
                className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                title="Create new business"
              >
                <Plus size={14} /> Business
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Project name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              placeholder="Website Redesign"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              placeholder="Short summary of the project"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]">
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Color</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-[var(--text-primary)]' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]" />
            </div>
          </div>
        </div>
      </Modal>

      <ClientFormModal open={showClientModal} onClose={() => setShowClientModal(false)} onCreated={handleClientCreated} />
      <BusinessFormModal
        open={showBusinessModal}
        clientId={selectedClientId}
        clientName={selectedClient?.client_name}
        onClose={() => setShowBusinessModal(false)}
        onCreated={handleBusinessCreated}
      />
    </>
  );
}
