import { memo, useState } from 'react';
import { Plus } from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LABELS, STATUS_STYLES } from '../constants/taskConstants';
import { cn } from '@/lib/utils';
import TaskCard from './TaskCard';

const STATUS_ACCENT = {
  Pending: 'bg-slate-400',
  'In Progress': 'bg-blue-500',
  Completed: 'bg-emerald-500',
  Overdue: 'bg-red-500',
  Cancelled: 'bg-neutral-400',
};

function DraggableCard({ task, onEdit, onDelete, onView, canManage }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={cn('mb-2.5', dragging && 'opacity-40')}
    >
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} onView={onView} canManage={canManage} />
    </div>
  );
}

function BoardColumn({ status, tasks, tasksById, onEdit, onDelete, onView, onStatusChange, canManage, onAddToColumn }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData('text/task-id');
    const task = id ? tasksById[id] : null;
    if (task && task.status !== status) onStatusChange(task, status);
  };

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_ACCENT[status] || 'bg-neutral-400')} />
        <span className={cn('text-xs font-semibold uppercase tracking-wide', STATUS_STYLES[status]?.split(' ').find((c) => c.startsWith('text-')))}>
          {TASK_STATUS_LABELS[status] || status}
        </span>
        <span className="rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
          {tasks.length}
        </span>
        {canManage && (
          <button
            type="button"
            onClick={() => onAddToColumn?.(status)}
            title={`Add task to ${status}`}
            className="ml-auto rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--color-primary)]"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex-1 rounded-xl border border-dashed p-2 transition-colors min-h-[120px]',
          dragOver ? 'border-[var(--color-primary)] bg-[var(--bg-subtle)]' : 'border-[var(--border)] bg-[var(--bg-page)]'
        )}
      >
        {tasks.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            canManage={canManage}
          />
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs italic text-[var(--text-muted)]">Drop tasks here</p>
        )}
      </div>
    </div>
  );
}

function TaskBoard({ tasks, onEdit, onDelete, onView, onStatusChange, canManage, onCreateTask, onAddToColumn }) {
  const grouped = {};
  const byId = {};
  TASK_STATUSES.forEach((s) => { grouped[s] = []; });
  (tasks || []).forEach((t) => {
    const key = TASK_STATUSES.includes(t.status) ? t.status : 'Pending';
    grouped[key].push(t);
    byId[String(t.id)] = t;
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {TASK_STATUSES.map((status) => (
        <BoardColumn
          key={status}
          status={status}
          tasks={grouped[status]}
          tasksById={byId}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onStatusChange={onStatusChange}
          canManage={canManage}
          onAddToColumn={onAddToColumn}
        />
      ))}
      {canManage && (
        <button
          onClick={onCreateTask}
          className="flex w-[300px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-sm font-medium text-[var(--text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <Plus size={16} /> New Task
        </button>
      )}
    </div>
  );
}

export default memo(TaskBoard);
