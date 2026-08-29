import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ExternalLink, MoreHorizontal, Plus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskListRow';

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
function useHierarchy(tasks, projectsById) {
  return useMemo(() => {
    const clients = new Map(); // client_id -> { id, name, businesses: Map }

    // Ensures the Client -> Business -> Project skeleton exists and returns
    // the project node so a task can be attached to it.
    const ensureProject = (project) => {
      const clientId = project.client_id ?? 'unassigned-client';
      const clientName = project.client_name || 'Unassigned Client';
      const businessId = project.client_business_id ?? 'unassigned-business';
      const businessName = project.client_business_name || 'Unassigned Business';

      if (!clients.has(clientId)) {
        clients.set(clientId, { id: clientId, name: clientName, businesses: new Map() });
      }
      const client = clients.get(clientId);

      if (!client.businesses.has(businessId)) {
        client.businesses.set(businessId, { id: businessId, name: businessName, clientId, projects: new Map() });
      }
      const business = client.businesses.get(businessId);

      if (!business.projects.has(project.id)) {
        business.projects.set(project.id, { id: project.id, name: project.name, clientId, businessId, tasks: [] });
      }
      return business.projects.get(project.id);
    };

    // Seed the full structure from every known project so the tree still
    // renders even when there are no tasks yet.
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

    // Convert Maps to arrays and compute rollups bottom-up.
    const clientList = [...clients.values()].map((client) => {
      const businessList = [...client.businesses.values()].map((business) => {
        const projectList = [...business.projects.values()].map((project) => {
          const rollup = computeRollup(project.tasks);
          return { ...project, rollup };
        });
        const businessRollup = computeRollup(projectList.flatMap((p) => p.tasks));
        return { ...business, projects: projectList, rollup: businessRollup };
      });
      const clientRollup = computeRollup(businessList.flatMap((b) => b.projects.flatMap((p) => p.tasks)));
      return { ...client, businesses: businessList, rollup: clientRollup };
    });

    return clientList;
  }, [tasks, projectsById]);
}

function computeRollup(taskList) {
  const total = taskList.length;
  if (total === 0) return { total: 0, atRisk: 0, avgProgress: 0, earliestDue: null, summary: 'No tasks' };
  const atRisk = taskList.filter(isOverdue).length;
  const active = taskList.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled').length;
  const avgProgress = Math.round(taskList.reduce((sum, t) => sum + getProgress(t), 0) / total);
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
}) {
  const navigate = useNavigate();
  const clients = useHierarchy(tasks, projectsById);
  const [expanded, setExpanded] = useState(loadExpanded);

  const projects = useMemo(() => Object.values(projectsById || {}), [projectsById]);

  const toggle = useCallback((key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      try { localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore persistence errors */ }
      return next;
    });
  }, []);

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

  if (clients.length === 0) {
    return (
      <div className="ppm-empty">
        <p className="text-sm">No tasks found</p>
      </div>
    );
  }

  return (
    <div role="table" aria-label="Client to task hierarchy" className="w-full">
      {/* Header row */}
      <div
        role="row"
        className="grid grid-cols-[36px_minmax(0,1fr)_120px_150px_100px_90px_110px_40px] gap-2 border-b border-[var(--border-subtle)] px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]"
      >
        <span />
        <span>Name</span>
        <span>Assignees</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due</span>
        <span>Progress</span>
        <span />
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
              name={client.name}
              open={open}
              onToggle={() => toggle(clientKey)}
              rollupText={client.rollup.summary}
              dueDate={client.rollup.earliestDue}
              progress={client.rollup.avgProgress}
              dimmed={dimmed}
              onOpenPage={() => navigate(`/clients/${client.id}`)}
              colorDot
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
                    name={business.name}
                    open={bOpen}
                    onToggle={() => toggle(businessKey)}
                    rollupText={business.rollup.summary}
                    dueDate={business.rollup.earliestDue}
                    progress={business.rollup.avgProgress}
                    dimmed={bDimmed}
                    onOpenPage={() => navigate(`/clients/${client.id}/businesses/${business.id}`)}
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
                          name={project.name}
                          open={pOpen}
                          onToggle={() => toggle(projectKey)}
                          rollupText={project.rollup.summary}
                          dueDate={project.rollup.earliestDue}
                          progress={project.rollup.avgProgress}
                          dimmed={pDimmed}
                          onOpenPage={() => navigate(`/clients/${client.id}/businesses/${business.id}/projects/${project.id}`)}
                          menu={canManage ? [
                            { label: '+ New Task', onClick: () => onAddProjectTask?.(project.id) },
                          ] : null}
                          onAddTask={canManage ? () => onAddProjectTask?.(project.id) : undefined}
                          onEditProject={canManage && onEditProject ? () => onEditProject?.(project.id) : undefined}
                        />
                        {pOpen && project.tasks.map((task) => {
                          const tDimmed = search && !subtreeMatches(task, 'task', search);
                          return (
                            <TaskRow
                              key={task.id}
                              task={task}
                              dimmed={tDimmed}
                              onViewTask={onViewTask}
                              onStatusChange={onStatusChange}
                              onInlineUpdate={onInlineUpdate}
                              onDelete={onDelete}
                              onDeleteImmediate={onDeleteImmediate}
                              onDuplicated={onDuplicated}
                              projects={projects}
                            />
                          );
                        })}
                        {pOpen && canManage && (
                          <div className="grid grid-cols-[36px_minmax(0,1fr)_120px_150px_100px_90px_110px_40px] gap-2 px-2 py-2" style={{ paddingLeft: `${3 * 20 + 8}px` }}>
                            <span />
                            <button
                              onClick={() => onAddProjectTask?.(project.id)}
                              className="col-span-1 flex items-center gap-1.5 text-left text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                            >
                              <Plus size={13} /> Add task
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const DEPTH_INDENT_PX = 20;

function Row({ depth, kind, name, open, onToggle, rollupText, dueDate, progress, dimmed, onOpenPage, colorDot, menu, onAddTask, onEditProject }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      role="row"
      onClick={onToggle}
      className={cn(
        'group grid cursor-pointer grid-cols-[36px_minmax(0,1fr)_120px_150px_100px_90px_110px_40px] items-center gap-2 border-b border-[var(--border-subtle)] px-2 py-2.5 text-sm transition-colors',
        'hover:bg-[var(--bg-surface-hover)]',
        dimmed && 'opacity-40'
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: `${depth * DEPTH_INDENT_PX}px` }}>
        <ChevronRight
          size={14}
          className={cn('shrink-0 text-[var(--text-muted)] transition-transform duration-150', open && 'rotate-90')}
        />
        {colorDot && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
        )}
        <span className={cn('truncate', kind === 'client' ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-primary)]')}>
          {name}
        </span>
      </span>
      <span />
      <span className="truncate text-xs text-[var(--text-secondary)]">{rollupText}</span>
      <span />
      <span className="text-xs text-[var(--text-secondary)]">{formatDue(dueDate)}</span>
      <span className="flex items-center gap-2">
        <span className="h-1 flex-1 rounded-full bg-[var(--border-subtle)]">
          <span
            className="block h-1 rounded-full bg-[var(--color-primary)]"
            style={{ width: `${progress || 0}%` }}
          />
        </span>
      </span>
      <span className="relative flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {kind === 'project' && onAddTask && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddTask(); }}
            title="Add task"
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          >
            <Plus size={13} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenPage?.(); }}
          title="Open full page"
          className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
        >
          <ExternalLink size={13} />
        </button>
        {(menu || (kind === 'project' && onEditProject)) && (
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          >
            <MoreHorizontal size={13} />
          </button>
        )}
        {menuOpen && (menu || (kind === 'project' && onEditProject)) && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-lg"
          >
            {menu?.map((item) => (
              <button
                key={item.label}
                onClick={() => { item.onClick(); setMenuOpen(false); }}
                className="flex w-full items-center px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
              >
                {item.label}
              </button>
            ))}
            {kind === 'project' && onEditProject && (
              <button
                onClick={() => { onEditProject(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
              >
                <Pencil size={12} /> Edit project
              </button>
            )}
          </div>
        )}
      </span>
    </div>
  );
}


