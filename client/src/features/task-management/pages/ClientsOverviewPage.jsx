import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FolderKanban, Plus, Users } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/shared/components/ui/Toast';
import Breadcrumb from '../components/Breadcrumb';
import ClientFormModal from '../components/ClientFormModal';

function ClientCard({ client, onOpen }) {
  const totalProjects = client.businesses.reduce((sum, b) => sum + (b.project_count || 0), 0);
  return (
    <button
      onClick={() => onOpen(client.id)}
      className="ppm-card ppm-card--interactive p-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]">
          <Building2 size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[var(--ppm-text)]">{client.client_name}</h3>
          <p className="text-xs text-[var(--ppm-text-muted)]">{client.businesses.length} business{client.businesses.length === 1 ? '' : 'es'}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-[var(--ppm-text-muted)]">
        <span className="inline-flex items-center gap-1"><FolderKanban size={14} /> {totalProjects} projects</span>
        <span className="inline-flex items-center gap-1"><Users size={14} /> {client.businesses.length}</span>
      </div>
    </button>
  );
}

export default function ClientsOverviewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClient, setShowClient] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/clients')
      .then((res) => {
        if (!active) return;
        setClients(res.data?.data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || err.message || 'Failed to load clients');
        toast.error('Failed to load clients');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [toast]);

  return (
    <div className="ppm mx-auto max-w-6xl">
      <Breadcrumb items={[{ label: 'Clients' }]} className="mb-3" />

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Clients</h1>
          <p className="text-sm text-[var(--ppm-text-muted)]">External clients, their businesses, and project portfolios.</p>
        </div>
        <button onClick={() => setShowClient(true)} className="ppm-btn-primary shrink-0">
          <Plus size={16} /> New Client
        </button>
      </div>

      {loading && <p className="text-sm text-[var(--ppm-text-muted)]">Loading clients…</p>}
      {error && !loading && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && clients.length === 0 && (
        <div className="ppm-empty">
          <Building2 size={28} />
          <p className="text-sm">No clients yet.</p>
          <button onClick={() => navigate('/clients/new')} className="ppm-btn-ghost">
            <Plus size={15} /> Create your first client
          </button>
        </div>
      )}

      {!loading && !error && clients.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} onOpen={(id) => navigate(`/clients/${id}`)} />
          ))}
        </div>
      )}

      <ClientFormModal open={showClient} onClose={() => setShowClient(false)} onCreated={(c) => c?.id && navigate(`/clients/${c.id}`)} />
    </div>
  );
}
