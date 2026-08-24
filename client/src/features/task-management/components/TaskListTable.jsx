import { useState, useMemo } from 'react';
import { useToast } from '@/shared/components/ui/Toast';
import { TASK_TABLE_GRID_COLS, TASK_STATUS_ORDER, UNKNOWN_STATUS_KEY } from '../constants/taskConstants';
import { StatusGroup } from './StatusGroup';

function TaskListTable({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onInlineUpdate,
  onCreateTask,
  onViewTask,
  onProgressChange,
  canManage,
}) {
  const [creatingParentId, setCreatingParentId] = useState(null);
  const { toast } = useToast();

  const topLevel = useMemo(
    () => (tasks || []).filter((t) => !t.parent_task_id),
    [tasks]
  );

  const grouped = useMemo(() => {
    const map = {};
    TASK_STATUS_ORDER.forEach((s) => { map[s] = []; });
    const unknownStatuses = new Set();

    topLevel.forEach((task) => {
      const status = task.status || 'Pending';
      if (!Object.prototype.hasOwnProperty.call(map, status)) {
        unknownStatuses.add(status);
        map[UNKNOWN_STATUS_KEY] = map[UNKNOWN_STATUS_KEY] || [];
        map[UNKNOWN_STATUS_KEY].push(task);
      } else {
        map[status].push(task);
      }
    });

    if (unknownStatuses.size > 0 && import.meta.env.DEV) {
      console.warn('[TaskListTable] Detected tasks with unexpected status values:', [...unknownStatuses]);
    }

    return map;
  }, [topLevel]);

  const statusGroupProps = {
    onEdit,
    onDelete,
    onStatusChange,
    onInlineUpdate,
    onViewTask,
    onProgressChange,
    canManage,
    creatingParentId,
    setCreatingParentId,
    onCreateSubtask: onCreateTask,
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1400px]">
          <div
            className="grid items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]"
            style={{ gridTemplateColumns: TASK_TABLE_GRID_COLS }}
          >
            <span className="pr-2" />
            <span>Task name</span>
            <span>Assigned</span>
            <span>Progress</span>
            <span>Start</span>
            <span>Deadline</span>
            <span>Description</span>
            <div className="flex justify-end pr-5" />
          </div>

          {TASK_STATUS_ORDER.map((status) => (
            <StatusGroup
              key={status}
              status={status}
              tasks={grouped[status] || []}
              {...statusGroupProps}
            />
          ))}

          {(grouped[UNKNOWN_STATUS_KEY] || []).length > 0 && (
            <StatusGroup
              status={UNKNOWN_STATUS_KEY}
              tasks={grouped[UNKNOWN_STATUS_KEY] || []}
              {...statusGroupProps}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskListTable;
