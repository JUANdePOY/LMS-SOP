import { useState } from 'react';
import { List, KanbanSquare, GanttChart, CalendarDays, Users, FolderKanban, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import TaskListTable from './TaskListTable';
import TaskListTableSkeleton from './TaskListTableSkeleton';
import TaskBoard from './TaskBoard';
import TaskTimeline from './TaskTimeline';
import TaskCalendar from './TaskCalendar';
import TaskWorkload from './TaskWorkload';
import TaskPortfolio from './TaskPortfolio';
import TaskWhiteboard from './TaskWhiteboard';
import TaskHierarchyTable from './TaskHierarchyTable';

export const TASK_VIEW_KEYS = ['list', 'board', 'timeline', 'calendar', 'workload', 'portfolio', 'whiteboard', 'tree'];

export const TASK_VIEWS = [
  { key: 'list', label: 'List', icon: List },
  { key: 'board', label: 'Board', icon: KanbanSquare },
  { key: 'timeline', label: 'Timeline', icon: GanttChart },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'workload', label: 'Workload', icon: Users },
  { key: 'portfolio', label: 'Portfolio', icon: FolderKanban },
  { key: 'whiteboard', label: 'Whiteboard', icon: PenTool },
  { key: 'tree', label: 'Table', icon: List },
];

/**
 * Shared 7-view engine used by both the flat admin Tasks page (portfolio scope)
 * and the per-project Project Workspace. Renders the view switcher + active view.
 * Pass `storageKey` to remember the last view (e.g. per-project).
 */
export default function ProjectTaskViews({
  tasks = [],
  loading = false,
  projectsById = {},
  canManage = false,
  storageKey,
  viewProp,
  onViewChange,
  activeViews, // optional subset of TASK_VIEW_KEYS to show
  onEdit,
  onDelete,
  onStatusChange,
  onProgressChange,
  onViewTask,
  onInlineUpdate,
  onView,
  onCreateTask,
  onQuickCreate,
  onAddProjectTask,
  onAddToColumn,
  onEditProject,
  onDeleteImmediate,
  onDuplicated,
  search,
  scopeClientId,
  scopeBusinessId,
}) {
  const [internalView, setInternalView] = useState(() => {
    const initial = storageKey ? localStorage.getItem(storageKey) : null;
    return initial || 'list';
  });

  const view = viewProp ?? internalView;

  const changeView = (next) => {
    if (viewProp === undefined) {
      setInternalView(next);
      if (storageKey) localStorage.setItem(storageKey, next);
    }
    onViewChange?.(next);
  };

  const views = (activeViews || TASK_VIEW_KEYS).map((k) => TASK_VIEWS.find((v) => v.key === k)).filter(Boolean);

  const showSkeleton = loading && tasks.length === 0 && (view === 'list' || view === 'board');

  return (
    <div className="ppm-fade">
      <div className="ppm-tabs">
        {views.map((v) => {
          const Icon = v.icon;
          const active = view === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => changeView(v.key)}
              className={cn('ppm-tab', active && 'ppm-tab--active')}
              aria-pressed={active}
            >
              <Icon size={15} />
              {v.label}
            </button>
          );
        })}
      </div>

      {showSkeleton ? (
        <TaskListTableSkeleton count={5} />
      ) : (
        <>
          {view === 'list' && (
            <TaskHierarchyTable
              tasks={tasks}
              projectsById={projectsById}
              search={search || ''}
              onViewTask={onViewTask}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onInlineUpdate={onInlineUpdate}
              onQuickCreate={onQuickCreate}
              canManage={canManage}
              scopeClientId={scopeClientId}
              scopeBusinessId={scopeBusinessId}
              onAddProjectTask={onAddProjectTask}
              onEditProject={onEditProject}
              onDeleteImmediate={onDeleteImmediate}
              onDuplicated={onDuplicated}
            />
          )}
          {view === 'board' && (
            <TaskBoard
              tasks={tasks}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView || onViewTask}
              onStatusChange={onStatusChange}
              onCreateTask={onCreateTask}
              onAddToColumn={onAddToColumn}
              canManage={canManage}
            />
          )}
          {view === 'timeline' && <TaskTimeline tasks={tasks} onView={onView || onViewTask} />}
          {view === 'calendar' && <TaskCalendar tasks={tasks} onView={onView || onViewTask} />}
          {view === 'workload' && <TaskWorkload tasks={tasks} />}
          {view === 'portfolio' && <TaskPortfolio tasks={tasks} projectsById={projectsById} />}
          {view === 'whiteboard' && <TaskWhiteboard tasks={tasks} onView={onView || onViewTask} />}
          {view === 'tree' && (
            <TaskListTable
              tasks={tasks}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onInlineUpdate={onInlineUpdate}
              onCreateTask={onCreateTask}
              onViewTask={onViewTask}
              onProgressChange={onProgressChange}
              canManage={canManage}
              projectsById={projectsById}
              onQuickCreate={onQuickCreate}
            />
          )}
        </>
      )}
    </div>
  );
}
