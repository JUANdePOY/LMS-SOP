import { useState, useRef } from 'react';
import {
  Check,
  Trash2,
  Type,
  CalendarClock,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_STATUS_LABELS, TASK_TABLE_GRID_COLS } from '../constants/taskConstants';
import { StatusMenu } from './TaskInlineControls';
import { TaskRow } from './TaskRow';
import AssignmentInput from './AssignmentInput';

function StatusGroup({
  status,
  tasks,
  isCreating,
  createTitle,
  setCreateTitle,
  createInputRef,
  handleCreateSubmit,
  setIsCreating,
  createAssignments,
  setCreateAssignments,
  createStart,
  setCreateStart,
  createEnd,
  setCreateEnd,
  createError,
  setCreateError,
  isSubmitting,
  createRowRef,
  ...props
}) {
  const [collapsed, setCollapsed] = useState(false);
  const submittingRef = useRef(false);
  const enterPressedRef = useRef(false);

  const isNotStarted = status === 'Pending';

  const localHandleSubmit = async () => {
    if (submittingRef.current || isSubmitting) return;
    submittingRef.current = true;
    try {
      await handleCreateSubmit();
    } finally {
      submittingRef.current = false;
      enterPressedRef.current = false;
    }
  };

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          "flex items-center gap-2 w-full px-4 py-2 bg-[var(--bg-page)] hover:bg-[var(--bg-hover)] transition-colors",
          isNotStarted && isCreating && "bg-blue-50/60 dark:bg-blue-500/[0.06] hover:bg-blue-50/80 dark:hover:bg-blue-500/10"
        )}
      >
        {collapsed && !isCreating ? <ChevronRight size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {TASK_STATUS_LABELS[status] || status}
        </span>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
        {isNotStarted && isCreating && (
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
            <Sparkles size={11} />
            New task
          </span>
        )}
      </button>
      {(!collapsed || (isCreating && isNotStarted)) && (
        <>
          {isNotStarted && isCreating && (
            <div
              ref={createRowRef}
              onClick={(e) => {
                // Only focus task name field when clicking the row itself,
                // not when clicking child elements (AssignmentInput, select, etc.)
                if (e.target === e.currentTarget) {
                  createInputRef.current?.focus();
                }
              }}
              className="group relative grid items-start gap-3 border-b border-l-2 border-l-blue-500 border-[var(--border)] pl-[14px] pr-4 py-3 last:border-b-0 cursor-text bg-blue-50/40 dark:bg-blue-500/[0.06] ring-1 ring-inset ring-blue-500/10 transition-colors"
              style={{ gridTemplateColumns: TASK_TABLE_GRID_COLS }}
            >
              <span className="flex h-[30px] items-center" onClick={(e) => e.stopPropagation()}>
                <StatusMenu status="Pending" onStatusChange={(newStatus) => {
                  if (newStatus !== 'Pending') {
                    setIsCreating(false);
                    setCreateTitle('');
                    setCreateAssignments([]);
                    setCreateStart('');
                    setCreateEnd('');
                    setCreateError(null);
                  }
                }} />
              </span>

              <div className="min-w-0">
                <div className="relative">
                  <Type size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500/70" />
                  <input
                    ref={createInputRef}
                    value={createTitle}
                    onChange={(e) => {
                      setCreateTitle(e.target.value);
                      if (createError?.field === 'title') setCreateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        enterPressedRef.current = true;
                        localHandleSubmit();
                      }
                      if (e.key === 'Escape') {
                        setCreateTitle('');
                        setIsCreating(false);
                        setCreateAssignments([]);
                        setCreateStart('');
                        setCreateEnd('');
                        setCreateError(null);
                      }
                    }}
                    placeholder="What needs to be done?"
                    className={cn(
                      'w-full rounded-lg border bg-[var(--bg-surface)] pl-8 pr-2 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-[var(--text-muted)]',
                      createError?.field === 'title'
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-blue-500/60 focus:border-blue-500 focus:ring-2 focus:border-blue-500/20'
                    )}
                  />
                </div>
                {createError?.field === 'title' && (
                  <p className="mt-1 text-xs text-red-600">{createError.message}</p>
                )}
              </div>

              <div className="min-w-0">
                <div className="space-y-2">
                  {(createAssignments || []).map((a, idx) => (
                    <AssignmentInput
                      key={idx}
                      assignment={a}
                      onUpdate={(updated) => {
                        setCreateAssignments((prev) => prev.map((item, i) => (i === idx ? { ...item, ...updated } : item)));
                        if (createError?.field === 'assignments') setCreateError(null);
                      }}
                      onRemove={() => {
                        setCreateAssignments((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      canRemove
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCreateAssignments((prev) => [...prev, { assignment_type: 'User', reference_id: '', reference_name: '' }])}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  + Add assignment
                </button>
                {createError?.field === 'assignments' && (
                  <p className="mt-1 text-xs text-red-600">{createError.message}</p>
                )}
              </div>

              <div className="min-w-0">
                <span className="text-sm text-[var(--text-muted)]">&nbsp;</span>
              </div>

              <div className="min-w-0">
                <div className="relative">
                  <CalendarClock size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500/70" />
                  <input
                    type="datetime-local"
                    value={createStart}
                    onChange={(e) => {
                      setCreateStart(e.target.value);
                      if (createError?.field === 'start_datetime') setCreateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        enterPressedRef.current = true;
                        localHandleSubmit();
                      }
                    }}
                    className={cn(
                      'w-full rounded-lg border bg-[var(--bg-surface)] pl-8 pr-2 py-1.5 text-sm shadow-sm outline-none transition-colors',
                      createError?.field === 'start_datetime'
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-blue-500/60 focus:border-blue-500 focus:ring-2 focus:border-blue-500/20'
                    )}
                  />
                </div>
                {createError?.field === 'start_datetime' && (
                  <p className="mt-1 text-xs text-red-600">{createError.message}</p>
                )}
              </div>

              <div className="min-w-0">
                <div className="relative">
                  <CalendarCheck2 size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500/70" />
                  <input
                    type="datetime-local"
                    value={createEnd}
                    min={createStart || undefined}
                    onChange={(e) => {
                      setCreateEnd(e.target.value);
                      if (createError?.field === 'deadline_datetime') setCreateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        enterPressedRef.current = true;
                        localHandleSubmit();
                      }
                    }}
                    className={cn(
                      'w-full rounded-lg border bg-[var(--bg-surface)] pl-8 pr-2 py-1.5 text-sm shadow-sm outline-none transition-colors',
                      createError?.field === 'deadline_datetime'
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-blue-500/60 focus:border-blue-500 focus:ring-2 focus:border-blue-500/20'
                    )}
                  />
                </div>
                {createError?.field === 'deadline_datetime' && (
                  <p className="mt-1 text-xs text-red-600">{createError.message}</p>
                )}
              </div>

              <span className="flex h-[30px] items-center gap-1.5 shrink-0 opacity-100">
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 dark:border-blue-900 border-t-blue-500" />
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); localHandleSubmit(); }}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors"
                      aria-label="Save"
                      title="Save (Enter)"
                    >
                      <Check size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateTitle('');
                        setIsCreating(false);
                        setCreateAssignments([]);
                        setCreateStart('');
                        setCreateEnd('');
                        setCreateError(null);
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400 transition-colors"
                      aria-label="Cancel"
                      title="Cancel (Esc)"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </span>
             </div>
           )}
           {tasks.map((task) => (
             <TaskRow key={task.id} task={task} {...props} />
           ))}
           {tasks.length === 0 && !isCreating && (
             <div className="px-4 py-3 text-xs text-[var(--text-muted)] italic">
               No {TASK_STATUS_LABELS[status]?.toLowerCase() || status} tasks.
             </div>
           )}
         </>
      )}
    </div>
  );
}

export { StatusGroup };
