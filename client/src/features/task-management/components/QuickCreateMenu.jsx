import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Building2, FolderKanban, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClientFormModal from '@/features/task-management/components/ClientFormModal';
import BusinessFormModal from '@/features/task-management/components/BusinessFormModal';
import ProjectFormModal from '@/features/task-management/components/ProjectFormModal';

export default function QuickCreateMenu({ clientId: propClientId, onProjectCreated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showClient, setShowClient] = useState(false);
  const [showBusiness, setShowBusiness] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const ref = useRef(null);

  // Resolve an active client from the URL or an explicit prop so "New Business"
  // / "New Project" can be pre-scoped to the current context.
  const activeClientId = propClientId || (location.pathname.match(/^\/clients\/(\d+)/) || [])[1] || null;

  // Allow the global command palette (rendered in the app shell) to trigger the
  // same create flows without the palette needing to own these modals.
  useEffect(() => {
    const onQuickCreate = (e) => {
      const type = e.detail?.type;
      if (type === 'client') setShowClient(true);
      else if (type === 'business') setShowBusiness(true);
      else if (type === 'project') setShowProject(true);
      else if (type === 'task') navigate('/tasks');
    };
    window.addEventListener('app:quick-create', onQuickCreate);
    return () => window.removeEventListener('app:quick-create', onQuickCreate);
  }, [navigate]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const items = [
    { label: 'New Client', icon: Building2, action: () => setShowClient(true) },
    { label: 'New Business', icon: Building2, action: () => setShowBusiness(true) },
    { label: 'New Project', icon: FolderKanban, action: () => setShowProject(true) },
    { label: 'New Task', icon: CheckSquare, action: () => navigate('/tasks') },
  ];

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Quick create"
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium',
            'bg-[var(--color-primary)] text-white hover:opacity-90 transition-all'
          )}
        >
          <Plus size={16} /> <span className="hidden sm:inline">New</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-[var(--border)] bg-white py-1 shadow-lg dark:bg-neutral-900">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.label}
                    onClick={() => { setOpen(false); it.action(); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <Icon size={16} className="text-[var(--color-primary)]" /> {it.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ClientFormModal
        open={showClient}
        onClose={() => setShowClient(false)}
        onCreated={() => setShowClient(false)}
      />
      <BusinessFormModal
        open={showBusiness}
        clientId={activeClientId}
        onClose={() => setShowBusiness(false)}
        onCreated={() => setShowBusiness(false)}
      />
      <ProjectFormModal
        open={showProject}
        onClose={() => setShowProject(false)}
        onCreated={(p) => { setShowProject(false); onProjectCreated?.(p); }}
      />
    </>
  );
}
