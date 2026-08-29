import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Building2, Search, X, ChevronRight, ChevronDown, Plus, Briefcase, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/services/api";
import { useToast } from "@/shared/components/ui/Toast";
import { useNavigation } from "@/shared/contexts/NavigationContext";
import { useProjectTree } from "@/features/task-management/hooks/useProjectTree";
import ClientFormModal from "@/features/task-management/components/ClientFormModal";
import BusinessFormModal from "@/features/task-management/components/BusinessFormModal";
import ConfirmationDialog from "@/shared/components/ui/ConfirmationDialog";

/**
 * Secondary (nested) sidebar shown beside the main nav rail. Lists every client
 * and, when expanded, the businesses that belong to it. Sits in the flex flow
 * on `lg` so the page content naturally shifts right; hidden on smaller screens.
 */
export default function SecondarySidebar() {
  const { secondaryNav, closeSecondaryNav } = useNavigation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hasScope = searchParams.get('client') || searchParams.get('business');
  const { tree, loading, refresh } = useProjectTree();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewBusiness, setShowNewBusiness] = useState(false);
  const [businessClientId, setBusinessClientId] = useState(null);
  const [menu, setMenu] = useState(null); // { kind: 'client'|'business', id, clientId, name }
  const [pendingDelete, setPendingDelete] = useState(null);

  const addBusiness = (clientId) => {
    setBusinessClientId(clientId);
    setShowNewBusiness(true);
  };

  const requestDelete = (kind, id, clientId, name) => {
    setMenu(null);
    setPendingDelete({ kind, id, clientId, name });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { kind, id, clientId } = pendingDelete;
    try {
      if (kind === "client") {
        await api.delete(`/clients/${id}`);
        toast.success("Client deleted");
      } else {
        await api.delete(`/clients/${clientId}/businesses/${id}`);
        toast.success("Business deleted");
      }
      setPendingDelete(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to delete ${kind}`);
      setPendingDelete(null);
    }
  };

  const open = secondaryNav === "clients";

  const activeClientId = (() => {
    const m = location.pathname.match(/^\/clients\/(\d+)/);
    return m ? m[1] : null;
  })();

  // Auto-expand the client whose page is currently open.
  useEffect(() => {
    if (open && activeClientId) {
      setExpanded((prev) => (prev[activeClientId] ? prev : { ...prev, [activeClientId]: true }));
    }
  }, [open, activeClientId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tree;
    return tree.filter((c) => (c.client_name || "").toLowerCase().includes(q));
  }, [tree, query]);

  if (!open) return null;

  const isClientActive = (id) => location.pathname.startsWith(`/clients/${id}`);
  const isBusinessActive = (clientId, bizId) =>
    location.pathname === `/clients/${clientId}/businesses/${bizId}` ||
    location.pathname.startsWith(`/clients/${clientId}/businesses/${bizId}/`);

  return (
    <div
      className={cn(
        "hidden lg:flex lg:sticky lg:top-0 lg:self-start lg:z-20 lg:flex-col",
        "lg:w-[260px] shrink-0",
        "lg:h-[calc(100dvh-var(--app-shell-inset,20px))]",
        "min-[1280px]:h-[calc(100dvh-var(--app-shell-inset-lg,28px))]",
        "bg-[var(--bg-sidebar)] text-[var(--text-on-sidebar)]",
        "border-r border-[var(--border-sidebar)]"
      )}
      aria-label="Clients"
    >
      <div className="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b border-[var(--header-border)] px-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--text-on-sidebar)_60%,transparent)]">
          Clients
        </p>
        <button
          type="button"
          onClick={closeSecondaryNav}
          aria-label="Close clients panel"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-amber)_60%,transparent)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-3 py-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="w-full rounded-lg border border-[var(--border-sidebar)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-on-sidebar)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-amber)_50%,transparent)]"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3 scrollbar-none" aria-label="Client list">
        <Link
          to="/tasks"
          onClick={closeSecondaryNav}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            location.pathname === "/tasks" && !hasScope
              ? "bg-[var(--bg-active)] text-[var(--text-on-sidebar)]"
              : "text-[color-mix(in_srgb,var(--text-on-sidebar)_75%,transparent)] hover:bg-[var(--bg-hover)]"
          )}
        >
          <Building2 size={17} /> All Clients
        </Link>

        {loading && tree.length === 0 ? (
          <div className="space-y-1 px-1 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-[var(--bg-hover)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-xs text-[var(--text-muted)]">
            {query ? "No clients match your search." : "No clients yet."}
          </p>
        ) : (
          <ul className="mt-0.5 space-y-0.5" role="list">
            {filtered.map((client) => {
              const cOpen = expanded[client.id];
              const businesses = client.businesses || [];
              return (
                <li key={client.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg pr-2 transition-colors",
                      isClientActive(client.id)
                        ? "bg-[var(--bg-active)] text-[var(--text-on-sidebar)]"
                        : "hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [client.id]: !p[client.id] }))}
                      aria-label={cOpen ? "Collapse businesses" : "Expand businesses"}
                      aria-expanded={cOpen}
                      className="flex h-9 w-8 shrink-0 items-center justify-center text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] focus:outline-none"
                    >
                      {cOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    <Link
                      to={`/tasks?view=list&client=${client.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2 py-2 text-sm"
                    >
                      <Building2
                        size={16}
                        className={cn(
                          "shrink-0",
                          isClientActive(client.id)
                            ? "text-[var(--text-on-sidebar)]"
                            : "text-[color-mix(in_srgb,var(--text-on-sidebar)_60%,transparent)]"
                        )}
                      />
                      <span className="flex-1 truncate">{client.client_name}</span>
                         {businesses.length > 0 && (
                           <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                             {businesses.length}
                           </span>
                         )}
                       </Link>
                       <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                         <button
                           type="button"
                           onClick={(e) => { e.stopPropagation(); addBusiness(client.id); }}
                           title="Add business"
                           className="rounded p-1 text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]"
                         >
                           <Plus size={14} />
                         </button>
                         <div className="relative">
                           <button
                             type="button"
                             onClick={(e) => { e.stopPropagation(); setMenu((m) => (m?.kind === 'client' && m.id === client.id ? null : { kind: 'client', id: client.id, clientId: client.id, name: client.client_name })); }}
                             title="More actions"
                             className="rounded p-1 text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]"
                           >
                             <MoreHorizontal size={14} />
                           </button>
                           {menu?.kind === 'client' && menu?.id === client.id && (
                             <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-lg">
                               <button
                                 type="button"
                                 onClick={() => requestDelete('client', client.id, client.id, client.client_name)}
                                 className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                               >
                                 <Trash2 size={13} /> Delete
                               </button>
                             </div>
                           )}
                         </div>
                       </div>
                     </div>

                  {cOpen && (
                    <div className="ml-[22px] mt-0.5 space-y-0.5 border-l border-[var(--border-sidebar)] pb-0.5">
                      {businesses.length === 0 ? (
                        <p className="px-3 py-1 text-xs text-[var(--text-muted)]">No businesses</p>
                      ) : (
                        businesses.map((biz) => (
                          <Link
                            key={biz.id}
                            to={`/tasks?view=list&business=${biz.id}&client=${client.id}`}
                            className={cn(
                              "flex items-center gap-2 rounded-lg py-2 pl-3 pr-2 text-[13px] transition-colors",
                              isBusinessActive(client.id, biz.id)
                                ? "bg-[var(--bg-active)] text-[var(--text-on-sidebar)]"
                                : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:bg-[var(--bg-hover)]"
                            )}
                          >
                             <Briefcase size={14} className="shrink-0" />
                             <span className="flex-1 truncate">{biz.business_name}</span>
                             <div className="relative">
                               <button
                                 type="button"
                                 onClick={(e) => { e.stopPropagation(); setMenu((m) => (m?.kind === 'business' && m.id === biz.id ? null : { kind: 'business', id: biz.id, clientId: client.id, name: biz.business_name })); }}
                                 title="More actions"
                                 className="rounded p-1 text-[var(--text-on-sidebar)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--bg-hover)]"
                               >
                                 <MoreHorizontal size={13} />
                               </button>
                               {menu?.kind === 'business' && menu?.id === biz.id && (
                                 <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-lg">
                                   <button
                                     type="button"
                                     onClick={() => requestDelete('business', biz.id, client.id, biz.business_name)}
                                     className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                   >
                                     <Trash2 size={13} /> Delete
                                   </button>
                                 </div>
                               )}
                             </div>
                           </Link>
                        ))
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-[var(--border-sidebar)] p-2">
        <button
          type="button"
          onClick={() => setShowNewClient(true)}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--text-on-sidebar)_75%,transparent)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Plus size={16} /> New Client
         </button>
         <button
           type="button"
           onClick={() => addBusiness(activeClientId)}
           disabled={!activeClientId}
           title={activeClientId ? 'Add a business to this client' : 'Open a client first to add a business'}
           className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--text-on-sidebar)_75%,transparent)] hover:bg-[var(--bg-hover)] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
         >
           <Plus size={16} /> New Business
         </button>
       </div>

      <ClientFormModal
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        onCreated={() => setShowNewClient(false)}
      />

      <BusinessFormModal
        open={showNewBusiness}
        clientId={businessClientId}
        onClose={() => setShowNewBusiness(false)}
        onCreated={() => { setShowNewBusiness(false); refresh(); }}
      />

      <ConfirmationDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={`Delete ${pendingDelete?.kind === 'client' ? 'Client' : 'Business'}`}
        message={`Are you sure you want to delete "${pendingDelete?.name || ''}"? This may also affect its businesses, projects, and tasks.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
