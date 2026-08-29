import { useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import api from '@/services/api';
import { useToast } from '@/shared/components/ui/Toast';

export default function ClientFormModal({ open, onClose, onCreated }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [businesses, setBusinesses] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error('Client name is required');
      return;
    }
    const businessList = businesses
      .split(/[\n,]/)
      .map((b) => b.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      const res = await api.post('/clients', { client_name: name.trim(), businesses: businessList });
      const client = res.data?.data;
      toast.success('Client created');
      onCreated?.(client);
      setName('');
      setBusinesses('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create client');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Client" footer={
      <>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Client name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Businesses (one per line or comma-separated)</label>
          <textarea
            value={businesses}
            onChange={(e) => setBusinesses(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            placeholder={'Acme Retail\nAcme Logistics'}
          />
        </div>
      </div>
    </Modal>
  );
}
