import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, FolderKanban, ChevronRight, Plus, ArrowLeft, CheckSquare } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';
import { useToast } from '@/shared/components/ui/Toast';
import Breadcrumb from '../components/Breadcrumb';

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBiz, setShowBiz] = useState(false);
  const [newBiz, setNewBiz] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/clients/${clientId}`)
      .then((res) => { if (active) setClient(res.data?.data || null); })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || err.message || 'Failed to load client');
        toast.error('Failed to load client');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [clientId, toast]);

  if (loading) return <p className="text-sm text-[var(--ppm-text-muted)]">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!client) return <p className="text-sm text-[var(--ppm-text-muted)]">Client not found.</p>;

  const breadcrumbItems = [
    { label: 'Tasks & Projects', onClick: () => navigate('/tasks') },
    { label: 'Clients', onClick: () => navigate('/clients') },
    { label: client.client_name },
  ];

  return (
    <div className="ppm mx-auto max-w-6xl">
      <Breadcrumb items={breadcrumbItems} className="mb-3" />

      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]">
            <Building2 size={22} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{client.client_name}</h1>
            <p className="text-sm text-[var(--ppm-text-muted)]">{client.businesses.length} businesses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/tasks')} className="gap-1.5">
            <ArrowLeft size={16} /> Back
          </Button>
          <Button variant="outline" onClick={() => navigate('/tasks')} className="gap-1.5">
            <CheckSquare size={16} /> New Task
          </Button>
          <Button onClick={() => setShowBiz(true)} className="gap-1.5">
            <Plus size={16} /> New Busines
          </Button>
        </div>
      </div>

      {client.businesses.length === 0 ? (
        <div className="ppm-empty">
          <Building2 size={28} />
          <p className="text-sm">No businesses under this client yet.</p>
          <Button onClick={() => navigate(`/clients/${client.id}/businesses/new`)} className="gap-1.5"><Plus size={16} /> Add a business</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {client.businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => navigate(`/clients/${client.id}/businesses/${b.id}`)}
              className="ppm-card ppm-card--interactive p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="truncate text-sm font-semibold text-[var(--ppm-text)]">{b.business_name}</h3>
                <ChevronRight size={16} className="text-[var(--ppm-text-muted)]" />
              </div>
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--ppm-text-muted)]">
                <FolderKanban size={14} /> {b.project_count || 0} projects
              </p>
            </button>
          ))}
        </div>
      )}

      <Modal open={showBiz} onClose={() => setShowBiz(false)} title="Add Business" footer={
        <>
          <Button variant="outline" onClick={() => setShowBiz(false)}>Cancel</Button>
          <Button
            disabled={saving || !newBiz.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                const names = (client.businesses || []).map((b) => b.business_name);
                if (!names.includes(newBiz.trim())) names.push(newBiz.trim());
                await api.put(`/clients/${client.id}`, { businesses: names });
                toast.success('Business added');
                setShowBiz(false);
                setNewBiz('');
                const res = await api.get(`/clients/${client.id}`);
                setClient(res.data?.data || null);
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to add business');
              } finally {
                setSaving(false);
              }
            }}
          >{saving ? 'Saving…' : 'Add'}</Button>
        </>
      }>
        <input
          value={newBiz}
          onChange={(e) => setNewBiz(e.target.value)}
          placeholder="Business name"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </Modal>
    </div>
  );
}
