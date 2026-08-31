import { useState, useMemo } from 'react';
import { Building2, Users, Layers, ChevronRight, Loader2, Inbox, X } from 'lucide-react';
import { useBusinessClientTree } from '../hooks/useBusinessClientTree';
import { cn } from '@/lib/utils';

function TreeRow({ depth = 0, icon: Icon, title, meta, open, onToggle, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-[var(--ppm-text)] transition-colors hover:bg-[var(--ppm-surface-hover)]"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {onToggle ? (
          <ChevronRight
            size={13}
            className={cn('shrink-0 text-[var(--ppm-text-muted)] transition-transform duration-150', open && 'rotate-90')}
          />
        ) : (
          <span className="w-[13px] shrink-0" />
        )}
        {Icon && <Icon size={13} className="shrink-0 text-[var(--ppm-text-muted)]" />}
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {meta != null && <span className="shrink-0 text-[11px] tabular-nums text-[var(--ppm-text-muted)]">{meta}</span>}
      </button>
      {open && children}
    </div>
  );
}

/**
 * Secondary panel for the employee "My Tasks" page. Shows only the employee's
 * SOP business (filtered by `businessId`) as a compact, collapsible tree:
 *   SOP Business -> Clients -> Business units.
 * Uses the shared business/client tree hook; if the employee has no business
 * assigned, a clear empty state is shown instead of a blank panel.
 */
export default function BusinessTreePanel({ businessId, onClose }) {
  const { businesses, loading, error } = useBusinessClientTree();

  const scoped = useMemo(() => {
    if (businessId == null) return businesses;
    return businesses.filter((b) => Number(b.id) === Number(businessId));
  }, [businesses, businessId]);

  const [openClients, setOpenClients] = useState(() => new Set());
  const toggleClient = (key) =>
    setOpenClients((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const businessName = scoped.length ? scoped[0].name : 'Your SOP business';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ppm-border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Building2 size={16} className="shrink-0 text-[var(--ppm-accent)]" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-[var(--ppm-text-muted)]">My SOP Business</p>
            <p className="truncate text-sm font-semibold text-[var(--ppm-text)]">{businessName}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 rounded p-1 text-[var(--ppm-text-muted)] transition-colors hover:bg-[var(--ppm-surface-hover)] hover:text-[var(--ppm-text)]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-sm text-[var(--ppm-text-muted)]">
            <Loader2 size={16} className="animate-spin" />
            Loading business tree…
          </div>
        ) : error ? (
          <p className="px-2 py-4 text-xs text-red-600">{error}</p>
        ) : scoped.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Inbox size={28} className="text-[var(--ppm-text-muted)]" aria-hidden="true" />
            <p className="text-sm text-[var(--ppm-text-muted)]">
              {businessId != null ? 'No SOP business is linked to your account.' : 'No SOP business available.'}
            </p>
          </div>
        ) : (
          scoped.map((biz) => (
            <div key={biz.id} className="mb-1">
              <TreeRow
                icon={Building2}
                title={biz.name}
                meta={biz.clients.length || null}
              >
                {biz.clients.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-[var(--ppm-text-muted)]" style={{ paddingLeft: '36px' }}>
                    No clients yet
                  </p>
                ) : (
                  biz.clients.map((client) => {
                    const key = `c-${client.id}`;
                    const open = openClients.has(key);
                    const units = Array.isArray(client.businesses) ? client.businesses : [];
                    return (
                      <TreeRow
                        key={client.id}
                        depth={1}
                        icon={Users}
                        title={client.client_name || `Client ${client.id}`}
                        meta={units.length || null}
                        open={open}
                        onToggle={() => toggleClient(key)}
                      >
                        {units.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-[var(--ppm-text-muted)]" style={{ paddingLeft: '50px' }}>
                            No business units
                          </p>
                        ) : (
                          units.map((u) => (
                            <TreeRow
                              key={u.id}
                              depth={2}
                              icon={Layers}
                              title={u.business_name || u.name || `Unit ${u.id}`}
                            />
                          ))
                        )}
                      </TreeRow>
                    );
                  })
                )}
              </TreeRow>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
