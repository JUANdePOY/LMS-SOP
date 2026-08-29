import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderKanban, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/shared/components/ui/Toast';
import Breadcrumb from '../components/Breadcrumb';
import StatusDot from '../components/StatusDot';
import ProjectFormModal from '../components/ProjectFormModal';

function ProjectCard({ project, onOpen }) {
  const due = project.due_date
    ? new Date(project.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;
  return (
    <button
      onClick={() => onOpen(project.id)}
      className="ppm-card ppm-card--interactive p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: project.color || 'var(--color-primary)' }}
            aria-hidden="true"
          />
          <h3 className="truncate text-sm font-semibold text-[var(--ppm-text)]">{project.name}</h3>
        </div>
        <ChevronRight size={16} className="text-[var(--ppm-text-muted)] shrink-0" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <StatusDot status={project.status} />
        {due && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--ppm-text-muted)]">
            <CalendarDays size={13} /> {due}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs text-[var(--ppm-text-muted)]">
        <FolderKanban size={14} /> {project.task_count || 0} tasks
      </div>
    </button>
  );
}

export default function BusinessProjectsPage() {
  const { clientId, businessId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState(null);
  const [business, setBusiness] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get(`/clients/${clientId}`),
      api.get('/projects', { params: { client_business_id: businessId } }),
    ])
      .then(([clientRes, projRes]) => {
        if (!active) return;
        const c = clientRes.data?.data;
        setClient(c);
        setBusiness((c?.businesses || []).find((b) => String(b.id) === String(businessId)) || null);
        setProjects(projRes.data?.data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || err.message || 'Failed to load projects');
        toast.error('Failed to load projects');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [clientId, businessId, toast]);

  const breadcrumbItems = [
    { label: 'Clients', to: '/clients' },
    client?.client_name && { label: client.client_name, to: `/clients/${clientId}` },
    { label: business?.business_name || 'Business' },
  ].filter(Boolean);

  return (
    <div className="ppm mx-auto max-w-6xl">
      <Breadcrumb items={breadcrumbItems} className="mb-3" />

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{business?.business_name || 'Business'}</h1>
          <p className="text-sm text-[var(--ppm-text-muted)]">Projects under this business.</p>
        </div>
        {client && (
          <button onClick={() => setShowForm(true)} className="ppm-btn-primary shrink-0">
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-[var(--ppm-text-muted)]">Loading…</p>}
      {error && !loading && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <div className="ppm-empty">
          <FolderKanban size={28} />
          <p className="text-sm">No projects yet for this business.</p>
          {client && (
            <button onClick={() => setShowForm(true)} className="ppm-btn-ghost">
              <Plus size={15} /> Create your first project
            </button>
          )}
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onOpen={(id) => navigate(`/clients/${clientId}/businesses/${businessId}/projects/${id}`)} />
          ))}
        </div>
      )}

      <ProjectFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        defaultClientBusinessId={businessId}
        onCreated={(project) => navigate(`/clients/${clientId}/businesses/${businessId}/projects/${project.id}`)}
      />
    </div>
  );
}
