import { useState } from 'react';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import api from '@/services/api';
import { useToast } from '@/shared/components/ui/Toast';

export default function BusinessFormModal({ open, clientId, clientName, onClose, onCreated }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!clientId) {
      toast.error('Select a client first');
      return;
    }
    if (!name.trim()) {
      toast.error('Business name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/clients/${clientId}/businesses`, {
        business_name: name.trim(),
      });
      const business = res.data?.data;
      toast.success('Business created');
      onCreated?.(business);
      setName('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create business');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Business"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {clientName && (
          <p className="text-xs text-[var(--text-muted)]">
            For client: <span className="font-medium text-[var(--text-secondary)]">{clientName}</span>
          </p>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Business name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            placeholder="Business name"
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
}
