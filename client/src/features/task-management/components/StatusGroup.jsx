import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TASK_STATUS_LABELS } from '../constants/taskConstants';
import { TaskRow } from './TaskRow';
import SubtaskInlineRow from './SubtaskInlineRow';
import TaskTreeConnector from './TaskTreeConnector';

function StatusGroup({
  status,
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onInlineUpdate,
  onViewTask,
  onProgressChange,
  canManage,
  creatingParentId,
  setCreatingParentId,
  onCreateSubtask,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedParents, setCollapsedParents] = useState(() => new Set());

  const toggleParent = (id) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const taskRows = (tasks || []).map((task) => {
    const isCollapsed = collapsedParents.has(task.id);
    const subtasks = isCollapsed ? [] : (task.subtasks || []);
    const showInline = !isCollapsed && creatingParentId === task.id;
    const hasChildrenBlock = subtasks.length > 0 || showInline;
    return (
      <Fragment key={task.id}>
        <TaskRow
          task={task}
          depth={0}
          collapsed={isCollapsed}
          onToggleCollapse={task.is_parent ? () => toggleParent(task.id) : undefined}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onInlineUpdate={onInlineUpdate}
          onViewTask={onViewTask}
          onProgressChange={task.is_parent ? undefined : onProgressChange}
          onAddSubtask={
            canManage
              ? () => setCreatingParentId(creatingParentId === task.id ? null : task.id)
              : undefined
          }
          canManage={canManage}
        />
        {hasChildrenBlock && (
          <div className="relative border-l-2 border-[var(--border)] ml-[22px] pl-3">
            {subtasks.map((sub, idx) => (
              <TaskTreeConnector
                key={sub.id}
                isLast={idx === subtasks.length - 1 && !showInline}
                stubTop={18}
              >
                <TaskRow
                  task={sub}
                  depth={1}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onInlineUpdate={onInlineUpdate}
                  onViewTask={onViewTask}
                  onProgressChange={onProgressChange}
                  canManage={canManage}
                />
              </TaskTreeConnector>
            ))}
            {showInline && (
              <TaskTreeConnector isLast stubTop={18}>
                <SubtaskInlineRow
                  parentTask={task}
                  canManage={canManage}
                  onSave={async (payload) => {
                    await onCreateSubtask?.(payload);
                    setCreatingParentId(null);
                  }}
                  onCancel={() => setCreatingParentId(null)}
                />
              </TaskTreeConnector>
            )}
          </div>
        )}
      </Fragment>
    );
  });

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 w-full px-4 py-2 bg-[var(--bg-page)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        {collapsed ? <ChevronRight size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {TASK_STATUS_LABELS[status] || status}
        </span>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </button>
      {!collapsed && (
        tasks.length === 0 ? (
          <div className="px-4 py-3 text-xs text-[var(--text-muted)] italic">
            No {TASK_STATUS_LABELS[status]?.toLowerCase() || status} tasks.
          </div>
        ) : (
          taskRows
        )
      )}
    </div>
  );
}

export { StatusGroup };
