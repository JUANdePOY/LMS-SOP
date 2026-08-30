import { useMemo, useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ExternalLink, MoreHorizontal, Plus, Pencil, Check, EyeOff, Trash2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClickOutside } from '../hooks/useClickOutside';
import { getBusinesses } from '../api/business.api';
import { TaskRow } from './TaskListRow';
import InlineEditableName from './InlineEditableName';
import InlineNameRow from './InlineNameRow';

// Shared responsive grid template for the hierarchy table. Column order is
// always: [toggle, name, assignees, status, priority, due, progress, open, select].
// Less-critical columns are dropped on smaller screens so the table reflows
// instead of forcing horizontal scroll:
//   base (<640px):  toggle · name · status · select   (4 cols)
//   sm   (>=640px): + assignees · priority · due · progress (8 cols)
//   lg   (>=1024px): + open icon                       (9 cols)
// Every row (header, task rows, hierarchy rows) must render exactly these 9
// cells in order and apply the matching visibility classes below. The trailing
// 28px column is the selection checkbox (bulk actions on task rows).
export const HIERARCHY_GRID =
  'grid-cols-[36px_minmax(150px,1fr)_minmax(90px,120px)_28px] ' +
  'sm:grid-cols-[36px_minmax(160px,1fr)_minmax(120px,160px)_minmax(100px,130px)_minmax(70px,90px)_minmax(60px,80px)_minmax(80px,100px)_28px] ' +
  'lg:grid-cols-[36px_minmax(160px,1fr)_minmax(120px,160px)_minmax(100px,130px)_minmax(70px,90px)_minmax(60px,80px)_minmax(80px,100px)_minmax(36px,40px)_28px]';

// Visibility classes that must be applied to the corresponding grid cell so the
// number of visible cells always matches the active HIERARCHY_GRID column count.
const CELL_HIDE_SM = 'hidden sm:block'; // assignees / priority / due / progress
const CELL_HIDE_LG = 'hidden lg:block'; // open icon

/**
 * Inline "add client" form. Beyond a name it lets the user assign the new client
 * to an existing SOP business (clients.business_id) via a select populated from
 * GET /api/businesses. The business choice is optional ("— SOP business —").
 */
function AddClientForm({ onCommit, onCancel }) {
  const [name, setName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getBusinesses()
      .then((list) => { if (active) setBusinesses(Array.isArray(list) ? list : []); })
      .catch(() => { if (active) setBusinesses([]); })
      .finally(() => { if (active) setLoading(false); });
    inputRef.current?.focus();
    return () => { active = false; };
  }, []);

  const commit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { onCancel?.(); return; }
    setSubmitting(true);
    try {
      await onCommit(trimmed, businessId ? Number(businessId) : null);
      setName('');
      setBusinessId('');
    } catch {
      // Parent surfaces its own error toast; keep the form open so the user can retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-2 py-2 text-sm" style={{ paddingLeft: '8px' }}>
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)] opacity-40" aria-hidden="true" />
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel?.(); }
        }}
        placeholder="New client name…"
        className="min-w-[160px] flex-1 rounded border border-[var(--color-primary)] bg-[var(--bg-surface)] px-2 py-1 text-sm outline-none"
      />
      <select
        value={businessId}
        onChange={(e) => setBusinessId(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel?.(); }
        }}
        disabled={loading}
        className="rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-sm text-[var(--text-secondary)] outline-none transition-colors duration-150 ease-out focus:border-[var(--color-primary)] motion-reduce:transition-none"
      >
        <option value="">{loading ? 'Loading businesses…' : '— SOP business —'}</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>{b.business_name}</option>
        ))}
      </select>
      {submitting && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--color-primary)]" />
      )}
    </div>
  );
}

/**
 * TaskHierarchyTable
 * Renders Client -> Business -> Project -> Task as one continuous,
 * inline-expandable tree table (no page navigation on row click).
 *
 * Built from data already loaded in TasksPage:
 *  - tasks: flat array, each task must resolve to a project via one of
 *    task.project_id / task.projectId / task.project?.id — adjust
 *    getProjectId() below if your task shape differs.
 *  - projectsById: { [id]: { id, name, client_id, client_name,
 *      client_business_id, client_business_name, ... } }
 *
 * Everything is grouped client-side from already-fetched data — no lazy
 * fetching. If task volume grows large enough that this gets slow, that's
 * the first thing to revisit, but it's the right starting point given the
 * current architecture (TasksPage already loads all tasks + all projects
 * up front).
 */

function getProjectId(task) {
  return task.project_id ?? task.projectId ?? task.project?.id ?? null;
}

function getProgress(task) {
  const v = task.progress_rate ?? task.completion_rate ?? 0;
  return Math.max(0, Math.min(100, Number(v) || 0));
}

function isOverdue(task) {
  if (!task.deadline_datetime || task.status === 'Completed' || task.status === 'Cancelled') return false;
  return new Date(task.deadline_datetime) < new Date();
}

function formatDue(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Builds Client -> Business -> Project -> Task[] tree from flat data. */
function useHierarchy(tasks, projectsById, clientTree = []) {
  return useMemo(() => {
    const clients = new Map(); // client_id -> { id, name, businesses: Map }

    // Ensures the Client node exists (preserving its accent color from the org
    // tree) and returns it.
    const ensureClient = (clientId, clientName, color) => {
      const cid = clientId ?? 'unassigned-client';
      const cname = clientName || 'Unassigned Client';
      if (!clients.has(cid)) {
        clients.set(cid, { id: cid, name: cname, color: color ?? null, businesses: new Map() });
      } else if (color != null) {
        clients.get(cid).color = color;
      }
      return clients.get(cid);
    };

    // Ensures the Client -> Business skeleton exists and returns the business
    // node so a project (or a tree-sourced business with no projects) can be attached.
    const ensureBusiness = (clientId, clientName, businessId, businessName, color) => {
      const client = ensureClient(clientId, clientName, color);
      const bid = businessId ?? 'unassigned-business';
      const bname = businessName || 'Unassigned Business';

      if (!client.businesses.has(bid)) {
        client.businesses.set(bid, { id: bid, name: bname, clientId: client.id, projects: new Map() });
      }
      return client.businesses.get(bid);
    };

    // Ensures the Client -> Business -> Project skeleton exists and returns
    // the project node so a task can be attached to it.
    const ensureProject = (project) => {
      const business = ensureBusiness(
        project.client_id,
        project.client_name,
        project.client_business_id,
        project.client_business_name
      );
      if (!business.projects.has(project.id)) {
        business.projects.set(project.id, { id: project.id, name: project.name, clientId: business.clientId, businessId: business.id, tasks: [] });
      }
      return business.projects.get(project.id);
    };

    // Seed the full Client -> Business skeleton from the org tree. Ensure every
    // client row exists first (even clients with no businesses yet, e.g. just
    // created) so they appear in the table, then attach their businesses.
    for (const client of clientTree || []) {
      ensureClient(client.id, client.client_name, client.color);
      for (const business of client.businesses || []) {
        ensureBusiness(client.id, client.client_name, business.id, business.business_name, client.color);
      }
    }

    // Seed projects (also guarantees the skeleton for any project-only data).
    for (const project of Object.values(projectsById || {})) {
      if (project?.id == null) continue;
      ensureProject(project);
    }

    // Attach tasks to their projects.
    for (const task of tasks || []) {
      const projectId = getProjectId(task);
      const project = projectId != null ? projectsById[String(projectId)] : null;
      if (!project) continue; // task without a resolvable project is skipped from the tree
      ensureProject(project).tasks.push(task);
    }

    // Convert Maps to arrays and compute rollups bottom-up. Progress is a
    // hierarchical average: a project's progress is the avg of its tasks, a
    // business's progress is the avg of its project progresses, and a client's
    // progress is the avg of its business progresses. The other rollup fields
    // (total/atRisk/earliestDue/summary) stay computed from the flat task list.
    const clientList = [...clients.values()].map((client) => {
      const businessList = [...client.businesses.values()].map((business) => {
        const projectList = [...business.projects.values()].map((project) => {
          const rollup = computeRollup(project.tasks);
          return { ...project, rollup };
        });
        const businessProgress = projectList.length
          ? Math.round(projectList.reduce((sum, p) => sum + (p.rollup.avgProgress || 0), 0) / projectList.length)
          : 0;
        const businessRollup = computeRollup(
          projectList.flatMap((p) => p.tasks),
          businessProgress
        );
        return { ...business, projects: projectList, rollup: businessRollup };
      });
      const clientProgress = businessList.length
        ? Math.round(businessList.reduce((sum, b) => sum + (b.rollup.avgProgress || 0), 0) / businessList.length)
        : 0;
      const clientRollup = computeRollup(
        businessList.flatMap((b) => b.projects.flatMap((p) => p.tasks)),
        clientProgress
      );
      return { ...client, businesses: businessList, rollup: clientRollup };
    });

    return clientList;
  }, [tasks, projectsById, clientTree]);
}

function computeRollup(taskList, progress) {
  const total = taskList.length;
  // When `progress` is supplied it is the hierarchical rollup value (avg of the
  // child-group progresses), so it takes precedence over a flat task average.
  if (total === 0) {
    return { total: 0, atRisk: 0, avgProgress: progress ?? 0, earliestDue: null, summary: 'No tasks' };
  }
  const atRisk = taskList.filter(isOverdue).length;
  const active = taskList.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled').length;
  const computed = Math.round(taskList.reduce((sum, t) => sum + getProgress(t), 0) / total);
  const avgProgress = progress ?? computed;
  const upcoming = taskList
    .filter((t) => t.deadline_datetime && t.status !== 'Completed' && t.status !== 'Cancelled')
    .sort((a, b) => new Date(a.deadline_datetime) - new Date(b.deadline_datetime));
  const earliestDue = upcoming[0]?.deadline_datetime || null;
  const summary = atRisk > 0
    ? `${active} active · ${atRisk} at risk`
    : `${active} active`;
  return { total, atRisk, avgProgress, earliestDue, summary };
}

/** Matches a search term against a client/business/project/task subtree. */
function subtreeMatches(node, kind, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  if (kind === 'task') return (node.title || '').toLowerCase().includes(t);
  if (kind === 'project') {
    if ((node.name || '').toLowerCase().includes(t)) return true;
    return node.tasks.some((task) => subtreeMatches(task, 'task', term));
  }
  if (kind === 'business') {
    if ((node.name || '').toLowerCase().includes(t)) return true;
    return node.projects.some((p) => subtreeMatches(p, 'project', term));
  }
  if (kind === 'client') {
    if ((node.name || '').toLowerCase().includes(t)) return true;
    return node.businesses.some((b) => subtreeMatches(b, 'business', term));
  }
  return false;
}

const EXPANDED_STORAGE_KEY = 'ppm:tasks:tree-expanded';

function loadExpanded() {
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export default function TaskHierarchyTable({
  tasks,
  projectsById,
  clientTree = [],
  search,
  onViewTask,
  onDelete,
  onStatusChange,
  onInlineUpdate,
  onAddProjectTask,
  canManage,
  scopeClientId,
  scopeBusinessId,
  onEditProject,
  onDeleteImmediate,
  onDuplicated,
  onQuickAddTask,
  onRenameClient,
  onRenameBusiness,
  onRenameProject,
  onRenameTask,
  onCreateBusiness,
  onCreateProject,
  onCreateClient,
  onDeleteEntity,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}) {
  const navigate = useNavigate();
  const clients = useHierarchy(tasks, projectsById, clientTree);
  const [expanded, setExpanded] = useState(loadExpanded);
  // Which parent is currently showing an inline "add" row: { kind, parentId }.
  const [addingFor, setAddingFor] = useState(null);
  // Whether the inline "add client" row at the bottom of the table is open.
  const [addingClient, setAddingClient] = useState(false);

  // Opens an inline "add" row directly under the clicked parent (no modal):
  // a client reveals a business row, a business reveals a project row. A project
  // already has its own QuickAddRow for tasks, so it is excluded here.
  const startAdd = useCallback((kind, id) => {
    if (kind === 'client') {
      setAddingFor({ kind: 'business', parentId: id });
      setExpanded((prev) => { const next = new Set(prev); next.add(`client-${id}`); return next; });
    } else if (kind === 'business') {
      setAddingFor({ kind: 'project', parentId: id });
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(`business-${id}`);
        const owning = Object.values(projectsById).find(
          (p) => String(p.client_business_id) === String(id)
        );
        if (owning?.client_id != null) next.add(`client-${owning.client_id}`);
        return next;
      });
    } else if (kind === 'project') {
      // A project's children are tasks, so reveal an inline task-add row
      // (matching how the business row reveals a project row) instead of a modal.
      setAddingFor({ kind: 'task', parentId: id });
      setExpanded((prev) => { const next = new Set(prev); next.add(`project-${id}`); return next; });
    }
  }, [projectsById]);

  const projects = useMemo(() => Object.values(projectsById || {}), [projectsById]);

  const visibleTaskIds = useMemo(
    () => (tasks || []).map((t) => String(t.id)),
    [tasks]
  );
  const selectedVisibleCount = visibleTaskIds.filter((id) => selectedIds?.has(id)).length;
  const allSelected = visibleTaskIds.length > 0 && selectedVisibleCount === visibleTaskIds.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) onSelectAll?.([]);
    else onSelectAll?.(visibleTaskIds);
  };

  const toggle = useCallback((key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      try { localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore persistence errors */ }
      return next;
    });
  }, []);

  // Collapse every client/business/project branch that has no tasks anywhere in
  // its subtree (rollup.total === 0). Keeps only populated groups visible.
  const hideEmptyGroups = useCallback(() => {
    setExpanded(() => {
      const next = new Set();
      for (const client of clients) {
        if (client.rollup.total > 0) next.add(`client-${client.id}`);
        for (const business of client.businesses) {
          if (business.rollup.total > 0) next.add(`business-${business.id}`);
          for (const project of business.projects) {
            if (project.rollup.total > 0) next.add(`project-${project.id}`);
          }
        }
      }
      return next;
    });
  }, [clients]);

  // When a client/business scope is active (e.g. opened from the sidebar),
  // seed the expansion state so the relevant branches start open. The user
  // can still collapse them afterwards because this only runs on scope change.
  useEffect(() => {
    const forced = new Set();
    if (scopeClientId) forced.add(`client-${scopeClientId}`);
    if (scopeBusinessId) {
      forced.add(`business-${scopeBusinessId}`);
      const owning = Object.values(projectsById).find(
        (p) => String(p.client_business_id) === String(scopeBusinessId)
      );
      if (owning?.client_id != null) forced.add(`client-${owning.client_id}`);
    }
    if (forced.size === 0) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      forced.forEach((key) => next.add(key));
      return next;
    });
  }, [scopeClientId, scopeBusinessId, projectsById]);

  // Auto-expand branches that match an active search term.
  const isExpanded = useCallback((key, kind, node) => {
    if (search && subtreeMatches(node, kind, search)) return true;
    return expanded.has(key);
  }, [expanded, search]);

  const table = clients.length === 0 ? (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <Inbox size={28} className="text-[var(--text-muted)]" aria-hidden="true" />
      <p className="text-sm text-[var(--text-muted)]">No tasks found</p>
    </div>
  ) : (
    <div role="table" aria-label="Client to task hierarchy" className="w-full overflow-x-auto">
      {/* Header row */}
      <div
        role="row"
        className={cn('grid gap-2 border-b border-[var(--border-subtle)] px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]', HIERARCHY_GRID)}
      >
        <span className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleSelectAll}
            aria-label="Select all tasks"
            className={cn(
              'grid h-4 w-4 place-items-center rounded border-2 transition-colors',
              (allSelected || someSelected)
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--border)] hover:border-[var(--color-primary)]'
            )}
          >
            {allSelected ? (
              <Check size={10} strokeWidth={3} />
            ) : someSelected ? (
              <span className="h-0.5 w-2 rounded bg-white" />
            ) : null}
          </button>
        </span>
        <span>Name</span>
        <span className={CELL_HIDE_SM}>Assignees</span>
        <span>Status</span>
        <span className={CELL_HIDE_SM}>Priority</span>
        <span className={CELL_HIDE_SM}>Due</span>
        <span className={CELL_HIDE_SM}>Progress</span>
        <span className={CELL_HIDE_LG} />
        <span />
      </div>

      {clients.map((client) => {
        const dimmed = search && !subtreeMatches(client, 'client', search);
        const clientKey = `client-${client.id}`;
        const open = isExpanded(clientKey, 'client', client);
        const clientProjectCount = client.businesses.reduce((sum, b) => sum + b.projects.length, 0);
        return (
           <div key={clientKey} className="mt-2 first:mt-0">
             <Row
               depth={0}
               kind="client"
               id={client.id}
               name={client.name}
               open={open}
               onToggle={() => toggle(clientKey)}
               rollupText={`${clientProjectCount} project${clientProjectCount === 1 ? '' : 's'}`}
               dueDate={client.rollup.earliestDue}
               progress={client.rollup.avgProgress}
               dimmed={dimmed}
               onOpenPage={() => navigate(`/clients/${client.id}`)}
               colorDot
               color={client.color}
               canEdit={canManage}
              onRename={onRenameClient}
              onAddChild={startAdd}
              onDeleteEntity={onDeleteEntity}
              onHideEmptyGroups={hideEmptyGroups}
              hideDue
            />
            {open && client.businesses.map((business) => {
              const bDimmed = search && !subtreeMatches(business, 'business', search);
              const businessKey = `business-${business.id}`;
              const bOpen = isExpanded(businessKey, 'business', business);
              return (
                <div key={businessKey}>
                   <Row
                    depth={1}
                    kind="business"
                    id={business.id}
                    name={business.name}
                    open={bOpen}
                    onToggle={() => toggle(businessKey)}
                    rollupText={`${business.projects.length} project${business.projects.length === 1 ? '' : 's'}`}
                    dueDate={business.rollup.earliestDue}
                    progress={business.rollup.avgProgress}
                    dimmed={bDimmed}
                    onOpenPage={() => navigate(`/clients/${client.id}/businesses/${business.id}`)}
                          canEdit={canManage}
                          onRename={onRenameBusiness}
                          onAddChild={startAdd}
                          onDeleteEntity={onDeleteEntity}
                          onHideEmptyGroups={hideEmptyGroups}
                        />
                  {bOpen && business.projects.map((project) => {
                    const pDimmed = search && !subtreeMatches(project, 'project', search);
                    const projectKey = `project-${project.id}`;
                    const pOpen = isExpanded(projectKey, 'project', project);
                    return (
                      <div key={projectKey}>
                         <Row
                           depth={2}
                           kind="project"
                           id={project.id}
                           name={project.name}
                           open={pOpen}
                           onToggle={() => toggle(projectKey)}
                           rollupText={project.rollup.summary}
                           dueDate={project.rollup.earliestDue}
                           progress={project.rollup.avgProgress}
                           dimmed={pDimmed}
                           onOpenPage={() => navigate(`/clients/${client.id}/businesses/${business.id}/projects/${project.id}`)}
                           onAddTask={canManage ? () => onAddProjectTask?.(project.id) : undefined}
                           onEditProject={canManage && onEditProject ? () => onEditProject?.(project.id) : undefined}
                             canEdit={canManage}
                             onRename={onRenameProject}
                             onAddChild={startAdd}
                             onDeleteEntity={onDeleteEntity}
                             onHideEmptyGroups={hideEmptyGroups}
                          />
                        {pOpen && project.tasks.map((task) => {
                          const tDimmed = search && !subtreeMatches(task, 'task', search);
                          return (
                            <TaskRow
                              key={task.id}
                              task={task}
                              dimmed={tDimmed}
                              selected={selectedIds?.has(String(task.id))}
                              onToggleSelect={onToggleSelect}
                              onViewTask={onViewTask}
                              onStatusChange={onStatusChange}
                              onInlineUpdate={onInlineUpdate}
                              onDelete={onDelete}
                              onDeleteImmediate={onDeleteImmediate}
                              onDuplicated={onDuplicated}
                              onRenameTask={onRenameTask}
                              canManage={canManage}
                              projects={projects}
                            />
                          );
                        })}
                        {addingFor?.kind === 'task' && addingFor.parentId === project.id && (
                          <InlineNameRow
                            key="__add-task"
                            placeholder="New task name…"
                            indent={DEPTH_INDENT_PX * 3}
                            onCommit={async (name) => {
                              if (onQuickAddTask) await onQuickAddTask(project.id, name);
                              else onAddProjectTask?.(project.id);
                              setAddingFor(null);
                            }}
                            onCancel={() => setAddingFor(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                  {addingFor?.kind === 'project' && addingFor.parentId === business.id && (
                    <InlineNameRow
                      key="__add-project"
                      placeholder="New project name…"
                      indent={DEPTH_INDENT_PX * 2}
                      onCommit={async (name) => { await onCreateProject?.(business.id, name); setAddingFor(null); }}
                      onCancel={() => setAddingFor(null)}
                    />
                  )}
                </div>
              );
            })}
            {addingFor?.kind === 'business' && addingFor.parentId === client.id && (
              <InlineNameRow
                key="__add-business"
                placeholder="New business name…"
                indent={DEPTH_INDENT_PX * 1}
                onCommit={async (name) => { await onCreateBusiness?.(client.id, name); setAddingFor(null); }}
                onCancel={() => setAddingFor(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      {table}
      {canManage && (
        <div className="px-2 pt-3">
          {addingClient ? (
            <AddClientForm
              key="__add-client"
              onCommit={async (name, businessId) => { await onCreateClient?.(name, businessId); setAddingClient(false); }}
              onCancel={() => setAddingClient(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingClient(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-[var(--bg-surface-hover)] hover:text-[var(--color-primary)]"
            >
              <Plus size={14} />
              Add client
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const DEPTH_INDENT_PX = 20;

// Centralized per-kind typography. Hierarchy reads through size/weight/spacing
// only — no per-level color, background, or border.
const LEVEL_STYLE = {
  client:   { font: 'font-semibold', size: 'text-[15px]', py: 'py-3.5', tracking: 'tracking-[0.01em]', leading: 'leading-relaxed' },
  business: { font: 'font-medium',   size: 'text-sm',     py: 'py-3',   tracking: '', leading: '' },
  project:  { font: 'font-medium',   size: 'text-sm',     py: 'py-2.5', tracking: '', leading: '' },
};

function Row({ depth, kind, id, name, open, onToggle, rollupText, dueDate, progress, dimmed, onOpenPage, colorDot, color, canEdit, onRename, onAddChild, onAddTask, onEditProject, onDeleteEntity, onHideEmptyGroups, hideAdd, hideDue }) {
  const level = LEVEL_STYLE[kind] || LEVEL_STYLE.project;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renameSignal, setRenameSignal] = useState(0);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });
  const menuRef = useClickOutside(() => { setMenuOpen(false); setConfirmDelete(false); });
  const menuTriggerRef = useRef(null);

  // Position the action menu with fixed coordinates so it escapes the table's
  // overflow-x-auto scroll container and isn't painted under later rows (e.g. a
  // project's own task rows). Mirrors the approach used by TaskListRow.
  useLayoutEffect(() => {
    if (!menuOpen && !confirmDelete) return;
    const update = () => {
      const el = menuTriggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuCoords({ top: rect.bottom + 4, left: rect.left });
    };
    update();
    const onScroll = (e) => {
      if (menuRef.current && e.target && menuRef.current.contains(e.target)) return;
      setMenuOpen(false);
      setConfirmDelete(false);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', update);
    };
  }, [menuOpen, confirmDelete]);

  const childNoun = kind === 'client' ? 'business' : kind === 'business' ? 'project' : 'task';
  const addTitle = `Add ${childNoun}`;

  const menuItems = [];
  if (kind === 'project') {
    // Projects manage tasks via the new-task form, not an inline child row.
    if (onAddTask) menuItems.push({ label: 'New Task', icon: Plus, onClick: () => { setMenuOpen(false); onAddTask(); } });
    if (onEditProject) menuItems.push({ label: 'Edit Project', icon: Pencil, onClick: () => { setMenuOpen(false); onEditProject(); } });
  } else {
    menuItems.push({ label: `Add ${childNoun}`, icon: Plus, onClick: () => onAddChild?.(kind, id) });
  }
  if (canEdit) {
    menuItems.push({ label: 'Rename', icon: Pencil, onClick: () => setRenameSignal((s) => s + 1) });
  }
  menuItems.push({ label: 'Delete', icon: Trash2, danger: true, onClick: () => { setMenuOpen(false); setConfirmDelete(true); } });
  menuItems.push({ label: 'Hide all empty groups', icon: EyeOff, onClick: () => { setMenuOpen(false); onHideEmptyGroups?.(); } });

  return (
    <div
      role="row"
      onClick={(e) => {
        // Don't toggle when the click lands on the name (it renames) — those
        // stop propagation themselves, but this is a safety net so the row never
        // both renames and expands/collapses.
        if (e.target.closest('[data-no-nav]')) return;
        onToggle();
      }}
      className={cn(
        'group grid cursor-pointer items-center gap-2 border-b border-[var(--border-subtle)] px-2 text-sm transition-colors duration-150 ease-out motion-reduce:transition-none',
        level.py,
        'hover:bg-[var(--bg-surface-hover)]',
        dimmed && 'opacity-40',
        HIERARCHY_GRID
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${name}`}
          className="grid h-5 w-5 shrink-0 place-items-center rounded transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-[var(--bg-surface-hover)]"
        >
          <ChevronRight
            size={14}
            className={cn(
              'shrink-0 text-[var(--text-muted)] transition-transform duration-150 ease-out motion-reduce:transition-none',
              open ? 'rotate-90 text-[var(--color-primary)]' : 'group-hover:text-[var(--color-primary)]'
            )}
          />
        </button>
        {colorDot && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color || 'var(--color-primary)' }}
            aria-hidden="true"
          />
        )}
      </span>

      <span
        className="relative z-10 min-w-0"
        style={{ paddingLeft: `${depth * DEPTH_INDENT_PX}px` }}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
           <span className="flex min-w-0 items-center" data-no-nav>
            <InlineEditableName
              value={name}
              canEdit={canEdit}
              onCommit={(next) => onRename?.(id, next)}
              renameSignal={renameSignal}
              className={cn(
                'whitespace-normal break-words text-[var(--text-primary)]',
                level.font,
                level.size,
                level.tracking,
                level.leading
              )}
              inputClassName={cn(level.font, level.size, level.tracking, level.leading)}
              ariaLabel={`Rename ${kind}`}
            />
          </span>
          {canEdit && !hideAdd && (
            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 motion-reduce:transition-none group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild?.(kind, id);
                }}
                title={addTitle}
                className="rounded p-1 text-[var(--text-muted)] transition-colors duration-150 ease-out hover:bg-[var(--bg-surface-hover)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
              >
                <Plus size={13} />
              </button>
              <button
                ref={menuTriggerRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                title="More actions"
                className="rounded p-1 text-[var(--text-muted)] transition-colors duration-150 ease-out hover:bg-[var(--bg-surface-hover)] hover:text-[var(--color-primary)] motion-reduce:transition-none"
              >
                <MoreHorizontal size={13} />
              </button>
            </span>
          )}
          {rollupText && (
            <span className="ml-auto hidden text-xs text-[var(--text-muted)] sm:inline">
              {rollupText}
            </span>
          )}
        </div>

        {(menuOpen || confirmDelete) && createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: menuCoords.top, left: menuCoords.left, zIndex: 50 }}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
          >
            {menuOpen && menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={cn(
                  'flex w-48 items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors duration-150 ease-out motion-reduce:transition-none',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                )}
              >
                {item.icon && <item.icon size={13} />}
                {item.label}
              </button>
            ))}
            {confirmDelete && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                <span>Delete {kind}?</span>
                <button
                  type="button"
                  onClick={() => { onDeleteEntity?.(kind, id); setConfirmDelete(false); }}
                  className="rounded bg-red-600 px-2 py-0.5 font-medium text-white transition-colors duration-150 ease-out hover:bg-red-700 motion-reduce:transition-none"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded px-1.5 py-0.5 text-[var(--text-secondary)] transition-colors duration-150 ease-out hover:bg-[var(--bg-surface-hover)] motion-reduce:transition-none"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
      </span>

      <span className={CELL_HIDE_SM} />
      <span />
      <span className={CELL_HIDE_SM} />
      <span className={cn('text-xs tabular-nums text-[var(--text-secondary)]', CELL_HIDE_SM)}>{hideDue ? '' : formatDue(dueDate)}</span>
      <span className={cn('flex items-center justify-end tabular-nums text-xs text-[var(--text-secondary)]', CELL_HIDE_SM)}>
        {Math.round(progress || 0)}%
      </span>
      <span className={cn('flex items-center justify-end', CELL_HIDE_LG)} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenPage?.(); }}
          title="Open full page"
          className="rounded p-1 text-[var(--text-muted)] opacity-0 transition-opacity duration-150 motion-reduce:transition-none hover:bg-[var(--bg-surface-hover)] hover:text-[var(--color-primary)] group-hover:opacity-100"
        >
          <ExternalLink size={13} />
        </button>
      </span>
      <span />
      </div>
  );
}


