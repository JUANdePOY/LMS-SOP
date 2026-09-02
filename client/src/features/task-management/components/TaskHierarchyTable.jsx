import { useMemo, useState, useCallback, useEffect, useRef, useLayoutEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, MoreHorizontal, Plus, Pencil, Check, EyeOff, Trash2, Inbox, Building2, Briefcase, FolderKanban, Filter } from 'lucide-react';
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
  'grid-cols-[minmax(150px,1fr)_minmax(90px,120px)] ' +
  'sm:grid-cols-[minmax(200px,1fr)_140px_120px_100px_110px_90px] ' +
  'lg:grid-cols-[minmax(220px,1fr)_150px_130px_110px_120px_100px]';

// Visibility classes that must be applied to the corresponding grid cell so the
// number of visible cells always matches the active HIERARCHY_GRID column count.
const CELL_HIDE_SM = 'hidden sm:block'; // assignees / priority / due / progress

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
    <div className="flex flex-wrap items-center gap-2 px-2 py-2 text-sm" style={{ paddingLeft: '8px' }}>
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
 * Renders Client -> Business -> Task as one continuous, inline-expandable
 * tree table (no page navigation on row click). The project layer has been
 * removed — tasks live directly under their client business unit.
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

/** Builds Client -> Business -> Task[] tree from flat data. */
function useHierarchy(tasks, projectsById, clientTree = [], tasksById = {}) {
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
    // node so tasks can be attached directly to it (the project layer has been
    // removed — tasks live under their client business unit).
    const ensureBusiness = (clientId, clientName, businessId, businessName, color) => {
      const client = ensureClient(clientId, clientName, color);
      const bid = businessId ?? 'unassigned-business';
      const bname = businessName || 'Unassigned Business';
      if (!client.businesses.has(bid)) {
        client.businesses.set(bid, { id: bid, name: bname, clientId: client.id, tasks: [] });
      }
      return client.businesses.get(bid);
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

    // Attach tasks directly to their owning client business. Tasks carry their own
    // client_id / client_business_id, so they no longer need to resolve through a
    // project — that's how a task created without a project_id still shows up.
    // Tasks with no client/business scope (created from the New Task modal
    // without selecting a client) are grouped under an "Unassigned" pseudo-client
    // so they are still visible instead of being silently dropped.
    // Sub-tasks (those with a parent_task_id) are intentionally NOT pushed onto
    // the business here — they are attached to their parent task's `subtasks`
    // list in the second loop below, so the hierarchy table only renders the
    // parent row. The parent row surfaces its sub-task count via a button in
    // the name column (Asana-style), which opens the task detail drawer where
    // the sub-tasks are managed.
    for (const task of tasks || []) {
      if (task.parent_task_id != null && task.parent_task_id !== '') continue;
      // Enrich tasks that have a project but missing client/business data by
      // inheriting from the project. This ensures the hierarchy groups them under
      // the correct client/business instead of "Unassigned".
      if ((task.client_id == null || task.client_business_id == null) && task.project_id != null) {
        const proj = projectsById[String(task.project_id)];
        if (proj) {
          if (task.client_id == null && proj.client_id != null) {
            task.client_id = proj.client_id;
            task.client_name = proj.client_name;
          }
          if (task.client_business_id == null && proj.client_business_id != null) {
            task.client_business_id = proj.client_business_id;
            task.client_business_name = proj.client_business_name;
          }
        }
      }
      let business = null;
      if (task.client_business_id != null && task.client_id != null) {
        business = ensureBusiness(
          task.client_id,
          task.client_name,
          task.client_business_id,
          task.client_business_name
        );
      } else {
        const projectId = getProjectId(task);
        const project = projectId != null ? projectsById[String(projectId)] : null;
        if (project) {
          business = ensureBusiness(
            project.client_id,
            project.client_name,
            project.client_business_id,
            project.client_business_name
          );
        }
      }
      if (!business) {
        business = ensureBusiness(
          null,
          'Unassigned Client',
          'unassigned-business',
          'Unassigned Business'
        );
      }
      // Attach the parent task to its business unit, and seed an empty
      // subtasks list so the second loop can safely push children onto it.
      business.tasks.push(task);
      if (!task.subtasks) task.subtasks = [];
    }

    // Re-attach sub-tasks to their parent task node (the flat list above only
    // knows each task's parent_task_id, not the resolved parent node).
    for (const task of tasks || []) {
      if (task.parent_task_id == null || task.parent_task_id === '') continue;
      const parent = tasksById[String(task.parent_task_id)];
      if (parent && !parent.subtasks) parent.subtasks = [];
      if (parent) parent.subtasks.push(task);
    }

    // Convert Maps to arrays and compute rollups bottom-up.
    const clientList = [...clients.values()].map((client) => {
      const businessList = [...client.businesses.values()].map((business) => {
        const rollup = computeRollup(business.tasks);
        return { ...business, rollup };
      });
      const clientProgress = businessList.length
        ? Math.round(businessList.reduce((sum, b) => sum + (b.rollup.avgProgress || 0), 0) / businessList.length)
        : 0;
      const clientRollup = computeRollup(
        businessList.flatMap((b) => b.tasks),
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
    return node.tasks.some((task) => subtreeMatches(task, 'task', term));
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
  scopeProjectId,
  onEditProject,
  onDeleteImmediate,
  onDuplicated,
  onQuickAddTask,
  onQuickAddSubtask,
  onRenameClient,
  onRenameBusiness,
  onRenameProject,
  onRenameTask,
  onCreateBusiness,
  onCreateProject,
  onCreateClient,
  onDeleteEntity,
  newTaskIds = null,
  onViewSubtasks,
}) {
  const tasksById = useMemo(() => {
    const map = {};
    for (const t of tasks || []) {
      if (t?.id != null) map[String(t.id)] = t;
    }
    return map;
  }, [tasks]);

  const projects = useMemo(() => Object.values(projectsById || {}), [projectsById]);

  const clients = useHierarchy(tasks, projectsById, clientTree, tasksById);
  const [expanded, setExpanded] = useState(loadExpanded);

  const subtaskCountMap = useMemo(() => {
    const counts = {};
    for (const t of tasks || []) {
      const pid = t.parent_task_id;
      if (pid != null && pid !== '') {
        counts[String(pid)] = (counts[String(pid)] || 0) + 1;
      }
    }
    return counts;
  }, [tasks]);
  // Which parent is currently showing an inline "add" row: { kind, parentId }.
  const [addingFor, setAddingFor] = useState(null);
  // Whether the inline "add client" row at the bottom of the table is open.
  const [addingClient, setAddingClient] = useState(false);

  // Opens an inline "add" row directly under the clicked parent (no modal):
  // a client reveals a business row, a business reveals a task row.
  const startAdd = useCallback((kind, id) => {
    if (kind === 'client') {
      setAddingFor({ kind: 'business', parentId: id });
      setExpanded((prev) => { const next = new Set(prev); next.add(`client-${id}`); return next; });
    } else if (kind === 'business') {
      setAddingFor({ kind: 'task', parentId: id });
      setExpanded((prev) => { const next = new Set(prev); next.add(`business-${id}`); return next; });
    } else if (kind === 'task') {
      // Add a sub-task under a task: reveal an inline add row indented under it.
      setAddingFor({ kind: 'subtask', parentId: id });
      setExpanded((prev) => { const next = new Set(prev); next.add(`task-${id}`); return next; });
    }
  }, []);

  // Opens an inline "add sub-task" row directly under the clicked task so the
  // new sub-task inherits the parent's context (client/business/project).
  const startAddSubtask = (taskId) => startAdd('task', taskId);

  const toggle = useCallback((key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      try { localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore persistence errors */ }
      return next;
    });
  }, []);

  // Collapse every client/business branch that has no tasks anywhere in its
  // subtree (rollup.total === 0). Keeps only populated groups visible.
  const hideEmptyGroups = useCallback(() => {
    setExpanded(() => {
      const next = new Set();
      for (const client of clients) {
        if (client.rollup.total > 0) next.add(`client-${client.id}`);
        for (const business of client.businesses) {
          if (business.rollup.total > 0) next.add(`business-${business.id}`);
        }
      }
      return next;
    });
  }, [clients]);

  // When a client/business scope is active (e.g. opened from the sidebar),
  // seed the expansion state so the relevant branches start open. The user
  // can still collapse them afterwards because this only runs on scope change.
  // When a client/business/project scope is active (e.g. chosen in the secondary
  // panel), collapse everything and open ONLY that branch. We must include the
  // branch's ancestors (client/business) so the chosen row is actually visible.
  // The expanded set is *replaced* (not merged) so every other row closes.
  useEffect(() => {
    const forced = new Set();
    if (scopeProjectId) {
      const p = projectsById[String(scopeProjectId)];
      if (p) {
        forced.add(`project-${p.id}`);
        if (p.client_business_id != null) forced.add(`business-${p.client_business_id}`);
        if (p.client_id != null) forced.add(`client-${p.client_id}`);
      }
    } else if (scopeBusinessId) {
      forced.add(`business-${scopeBusinessId}`);
      // Resolve the owning client: first try projects, then fall back to the
      // hierarchy's client list (so a business with no projects still opens).
      const owning = Object.values(projectsById).find(
        (p) => String(p.client_business_id) === String(scopeBusinessId)
      );
      if (owning?.client_id != null) {
        forced.add(`client-${owning.client_id}`);
      } else {
        const client = clients.find((c) => c.businesses.some((b) => String(b.id) === String(scopeBusinessId)));
        if (client) forced.add(`client-${client.id}`);
      }
    } else if (scopeClientId) {
      forced.add(`client-${scopeClientId}`);
    }
    if (forced.size === 0) return;
    setExpanded(forced);
  }, [scopeClientId, scopeBusinessId, scopeProjectId, projectsById, clients]);

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
        className={cn('grid gap-0 border-t border-b border-[var(--border-subtle)]/30 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)] h-10', HIERARCHY_GRID)}
      >
        <span className="flex items-center justify-center py-2 pr-2 border-r border-[var(--border-subtle)]/30 text-center">Name</span>
        <span className="flex items-center justify-center py-2 px-2 border-r border-[var(--border-subtle)]/30 text-center">Assignees</span>
        <span className="flex items-center justify-center py-2 px-2 border-r border-[var(--border-subtle)]/30 text-center">Status</span>
        <span className="flex items-center justify-center py-2 px-2 border-r border-[var(--border-subtle)]/30 text-center">Priority</span>
        <span className="flex items-center justify-center py-2 px-2 border-r border-[var(--border-subtle)]/30 text-center">Due</span>
        <span className="flex items-center justify-center py-2 px-2 text-center">Progress</span>
      </div>

      {clients.map((client) => {
        const dimmed = search && !subtreeMatches(client, 'client', search);
        const clientKey = `client-${client.id}`;
        const open = isExpanded(clientKey, 'client', client);
return (
           <div key={clientKey}>
              <Row
                depth={0}
                kind="client"
                id={client.id}
                name={client.name}
                open={open}
                 onToggle={() => toggle(clientKey)}
                 dueDate={client.rollup.earliestDue}
                progress={client.rollup.avgProgress}
                dimmed={dimmed}
                 canEdit={canManage}
                 onRename={onRenameClient}
                 onAddChild={startAdd}
                onDeleteEntity={onDeleteEntity}
                 onHideEmptyGroups={hideEmptyGroups}
                 hideDue
                 taller
                 noBorder
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
                     dueDate={business.rollup.earliestDue}
                     progress={business.rollup.avgProgress}
                     dimmed={bDimmed}
                     canEdit={canManage}
                     onRename={onRenameBusiness}
                            onAddChild={startAdd}
                            onDeleteEntity={onDeleteEntity}
                        onHideEmptyGroups={hideEmptyGroups}
                        hideDue
                        noBorder
                      />
                  {bOpen && business.tasks.map((task) => {
                    const tDimmed = search && !subtreeMatches(task, 'task', search);
                    return (
                      <Fragment key={task.id}>
                        <TaskRow
                          task={task}
                          dimmed={tDimmed}
                          onViewTask={onViewTask}
                          onViewSubtasks={onViewSubtasks}
                          onStatusChange={onStatusChange}
                          onInlineUpdate={onInlineUpdate}
                          onDelete={onDelete}
                          onDeleteImmediate={onDeleteImmediate}
                          onDuplicated={onDuplicated}
                          onRenameTask={onRenameTask}
                          canManage={canManage}
                          projects={projects}
                          tasksById={tasksById}
                          onAddSubtask={(t) => startAdd('task', t.id)}
                          subtaskCount={subtaskCountMap[task.id] || 0}
                          isNew={newTaskIds ? newTaskIds.has(String(task.id)) : false}
                        />
                        {addingFor?.kind === 'subtask' && addingFor.parentId === task.id && (
                          <InlineNameRow
                            key="__add-subtask"
                            placeholder="New sub-task name…"
                            indent={DEPTH_INDENT_PX * 3}
                            onCommit={async (name) => {
                              await onQuickAddSubtask?.(task.id, name);
                              setAddingFor(null);
                            }}
                            onCancel={() => setAddingFor(null)}
                          />
                        )}
                      </Fragment>
                    );
                  })}
                  {bOpen && (
                    addingFor?.kind === 'subtask' && addingFor.parentId === business.id ? (
                      <InlineNameRow
                        key="__add-task"
                        placeholder="New task name…"
                        indent={DEPTH_INDENT_PX * 2}
                        onCommit={async (name) => {
                          if (onQuickAddTask) await onQuickAddTask(business.id, client.id, name);
                          else onAddProjectTask?.(business.id);
                          setAddingFor(null);
                        }}
                        onCancel={() => setAddingFor(null)}
                      />
                    ) : canManage && (
                      <button
                        type="button"
                        onClick={() => startAdd('task', business.id)}
                        className="flex w-full cursor-pointer items-center gap-1.5 py-3 pl-[44px] text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--color-primary)] h-10"
                      >
                        <Plus size={13} className="shrink-0" />
                        Add task
                      </button>
                    )
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

// Per-kind visual identity. Each hierarchy level (client / business) gets a
// subtle, premium accent so a row's type is obvious at a glance — a tinted
// chip (icon + label) and a matching accent on the expand caret. Colors are
// intentionally low-saturation tints that also work in dark mode.
const KIND_META = {
  client: {
    label: 'Client',
    icon: Building2,
    chip: 'text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/15',
    accent: 'text-violet-500 dark:text-violet-400',
  },
  business: {
    label: 'Business',
    icon: Briefcase,
    chip: 'text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/15',
    accent: 'text-sky-500 dark:text-sky-400',
  },
};

// Centralized per-kind typography. Hierarchy reads through size/weight/spacing
// only — no per-level color, background, or border.
const LEVEL_STYLE = {
   client:   { font: 'font-semibold', size: 'text-sm', tracking: 'tracking-[0.01em]', leading: '' },
   business: { font: 'font-medium',   size: 'text-sm', tracking: '', leading: '' },
};

function Row({ depth, kind, id, name, open, onToggle, dueDate, progress, dimmed, canEdit, onRename, onAddChild, onAddTask, onDeleteEntity, onHideEmptyGroups, hideAdd, hideDue, onFilter, taller = false, noBorder = false }) {
  const level = LEVEL_STYLE[kind] || LEVEL_STYLE.business;
  const meta = KIND_META[kind];
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
    const MARGIN = 8;
    const update = () => {
      const el = menuTriggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Vertical: open below the trigger, flip above if it would overflow the
      // bottom of the viewport.
      let top = rect.bottom + 4;
      const menuW = menuRef.current?.offsetWidth || 192;
      const menuH = menuRef.current?.offsetHeight || 0;
      if (menuH && top + menuH > window.innerHeight - MARGIN) {
        top = Math.max(MARGIN, rect.top - menuH - 4);
      }
      // Horizontal: anchor to the trigger's left edge, but flip so the menu's
      // right edge stays inside the viewport when near the right edge.
      let left = rect.left;
      if (left + menuW > window.innerWidth - MARGIN) {
        left = Math.max(MARGIN, rect.right - menuW);
      }
      setMenuCoords({ top, left });
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

  const childNoun = kind === 'client' ? 'business' : 'task';
  const addTitle = `Add ${childNoun}`;

  const menuItems = [];
  if (kind === 'business') {
    // Tasks live directly under the business unit now, so the inline add row
    // creates a task rather than a nested project.
    if (onAddTask) menuItems.push({ label: 'New Task', icon: Plus, onClick: () => { setMenuOpen(false); onAddTask(); } });
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
        'group grid gap-0 px-2 text-sm transition-colors duration-150 ease-out motion-reduce:transition-none',
        taller ? 'h-14' : 'h-10',
        noBorder ? '' : 'border-b border-[var(--border-subtle)]/30',
        dimmed && 'opacity-40',
        HIERARCHY_GRID
      )}
    >
      <span
        className="relative z-10 min-w-0 h-full flex items-center pr-2"
        style={{ paddingLeft: `${depth * DEPTH_INDENT_PX}px` }}
      >
        <div className="flex items-center gap-x-2 whitespace-nowrap overflow-hidden">
           <button
             type="button"
             onClick={(e) => { e.stopPropagation(); onToggle(); }}
             aria-expanded={open}
             aria-label={`${open ? 'Collapse' : 'Expand'} ${name}`}
             className="grid h-5 w-5 shrink-0 place-items-center rounded transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-[var(--bg-surface-hover)]"
           >
             <ChevronRight
               size={15}
               className={cn(
                 'shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
                 open ? 'rotate-90' : 'rotate-0',
                 meta?.accent || 'text-[var(--text-muted)]'
               )}
             />
           </button>
           {meta && (
             <span
               className={cn(
                 'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                 meta.chip
               )}
             >
               <meta.icon size={11} />
               {meta.label}
             </span>
           )}
           <span className="flex min-w-0 items-center" data-no-nav>
            <InlineEditableName
              value={name}
              canEdit={canEdit}
              onCommit={(next) => onRename?.(id, next)}
              renameSignal={renameSignal}
              className={cn(
                'truncate text-[var(--text-primary)]',
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

      <span className={cn(CELL_HIDE_SM, 'px-2')} />
      <span className="px-2" />
      <span className={cn(CELL_HIDE_SM, 'px-2')} />
      <span className={cn('text-xs tabular-nums text-[var(--text-secondary)] px-2 text-center', CELL_HIDE_SM)}>{hideDue ? '' : formatDue(dueDate)}</span>
      <span className={cn('flex items-center justify-center tabular-nums text-xs text-[var(--text-secondary)] px-2 text-center', CELL_HIDE_SM)}>
        {Math.round(progress || 0)}%
      </span>
    </div>
  );
}


