import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import api from '@/services/api';
import { useToast } from '@/shared/components/ui/Toast';
import { notifyOrgTreeChanged } from '@/shared/store/orgTreeBus';

export default function ClientFormModal({ open, onClose, onCreated, businessId }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [businesses, setBusinesses] = useState('');
  const [businessIdValue, setBusinessIdValue] = useState('');
  const [sopBusinesses, setSopBusinesses] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setBusinesses('');
    setBusinessIdValue(businessId ? String(businessId) : '');
    let active = true;
    api.get('/businesses', { params: { limit: 1000 } })
      .then((r) => {
        if (!active) return;
        const rows = r?.data?.data?.rows || r?.data?.rows || [];
        setSopBusinesses(Array.isArray(rows) ? rows : []);
      })
      .catch(() => active && setSopBusinesses([]));
    return () => { active = false; };
  }, [open, businessId]);

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
      const res = await api.post('/clients', {
        client_name: name.trim(),
        businesses: businessList,
        business_id: businessIdValue ? Number(businessIdValue) : null,
      });
      const client = res.data?.data;
      toast.success('Client created');
      notifyOrgTreeChanged();
      onCreated?.(client);
      setName('');
      setBusinesses('');
      setBusinessIdValue('');
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
            placeholder="Client name"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">SOP Business</label>
          <select
            value={businessIdValue}
            onChange={(e) => setBusinessIdValue(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">— Unassigned —</option>
            {sopBusinesses.map((b) => (
              <option key={b.id} value={b.id}>{b.business_name || b.name}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Assigns this client to a business from the SOP dashboard.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Business units (one per line or comma-separated)</label>
          <textarea
            value={businesses}
            onChange={(e) => setBusinesses(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            placeholder={'Business Name 1\n'}
          />
        </div>
      </div>
    </Modal>
  );
}
