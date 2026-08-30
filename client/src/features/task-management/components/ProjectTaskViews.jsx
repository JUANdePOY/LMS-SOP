import { useState } from 'react';
import { List, KanbanSquare, GanttChart, CalendarDays, Users, FolderKanban, PenTool } from 'lucide-react';
import TaskBoard from './TaskBoard';
import TaskTimeline from './TaskTimeline';
import TaskCalendar from './TaskCalendar';
import TaskWorkload from './TaskWorkload';
import TaskPortfolio from './TaskPortfolio';
import TaskWhiteboard from './TaskWhiteboard';
import TaskHierarchyTable from './TaskHierarchyTable';
import ViewTabs from './ViewTabs';
import TaskListTableSkeleton from './TaskListTableSkeleton';

export const TASK_VIEW_KEYS = ['list', 'board', 'timeline', 'calendar', 'workload', 'portfolio', 'whiteboard'];

export const TASK_VIEWS = [
  { key: 'list', label: 'List', icon: List },
  { key: 'board', label: 'Board', icon: KanbanSquare },
  { key: 'timeline', label: 'Timeline', icon: GanttChart },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'workload', label: 'Workload', icon: Users },
  { key: 'portfolio', label: 'Portfolio', icon: FolderKanban },
  { key: 'whiteboard', label: 'Whiteboard', icon: PenTool },
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
  clientTree = [],
  canManage = false,
  storageKey,
  viewProp,
  onViewChange,
  activeViews, // optional subset of TASK_VIEW_KEYS to show
  onEdit,
  onDelete,
  onStatusChange,
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
  onQuickAddTask,
  onRenameClient,
  onRenameBusiness,
  onRenameProject,
  onRenameTask,
  onAddChild,
  onDeleteEntity,
  onCreateBusiness,
  onCreateProject,
  search,
  scopeClientId,
  scopeBusinessId,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  hideTabs = false,
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
      {!hideTabs && (
        <ViewTabs views={views} active={view} onChange={changeView} />
      )}
      {showSkeleton ? (
        <TaskListTableSkeleton count={5} />
      ) : (
        <>
          {view === 'list' && (
            <TaskHierarchyTable
              tasks={tasks}
              projectsById={projectsById}
              clientTree={clientTree}
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
              onQuickAddTask={onQuickAddTask}
              onRenameClient={onRenameClient}
              onRenameBusiness={onRenameBusiness}
              onRenameProject={onRenameProject}
              onRenameTask={onRenameTask}
              onAddChild={onAddChild}
              onDeleteEntity={onDeleteEntity}
              onCreateBusiness={onCreateBusiness}
              onCreateProject={onCreateProject}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectAll={onSelectAll}
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
        </>
      )}
    </div>
  );
}
