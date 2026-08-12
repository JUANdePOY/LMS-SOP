import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useToast } from '@/shared/components/ui/Toast';
import { DEFAULT_DUE_DATE_OFFSET_MS, TASK_TABLE_GRID_COLS, TASK_STATUS_ORDER } from '../constants/taskConstants';
import { StatusGroup } from './StatusGroup';
import { validateTaskPayload } from '../utils/taskValidation';

/**
 * Convert the shared validator's first error into the single-field
 * { field, message } format expected by the inline create row.
 * @param {string} title
 * @param {Array} assignments
 * @param {string} start
 * @param {string} end
 * @returns {{field: string, message: string} | null}
 */
function validateCreateForm(title, assignments, start, end) {
  const payload = {
    title,
    status: 'Pending',
    priority: 'Medium',
    start_datetime: start,
    deadline_datetime: end,
    estimated_hours: 1,
    category: '',
    description: '',
    assignments,
  };

  const result = validateTaskPayload(payload);
  if (!result.valid) {
    const firstField = Object.keys(result.errors)[0];
    return { field: firstField, message: result.errors[firstField] };
  }
  return null;
}

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
  const [isCreating, setIsCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createAssignments, setCreateAssignments] = useState([]);
  const [createStart, setCreateStart] = useState('');
  const [createEnd, setCreateEnd] = useState('');
  const [createError, setCreateError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createInputRef = useRef(null);
  const createRowRef = useRef(null);
  const { toast } = useToast();

  const isFormDirty = useMemo(() => {
    return Boolean(createTitle.trim() || createAssignments.some((a) => a.reference_id || a.reference_name) || createStart || createEnd);
  }, [createTitle, createAssignments, createStart, createEnd]);

  useEffect(() => {
    if (isCreating) {
      createInputRef.current?.focus();
      setCreateError(null);
      const now = new Date();
      const start = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const end = new Date(now.getTime() + DEFAULT_DUE_DATE_OFFSET_MS - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setCreateStart(start);
      setCreateEnd(end);
    }
  }, [isCreating]);

  const handleCreateSubmit = useCallback(async () => {
    const trimmed = createTitle.trim();

    const error = validateCreateForm(createTitle, createAssignments, createStart, createEnd);
    if (error) {
      setCreateError(error);
      return;
    }

    setCreateError(null);
    setIsSubmitting(true);
    try {
      const assignments = createAssignments
        .filter((a) => a.reference_id || a.reference_name)
        .map((a) => ({
          assignment_type: a.assignment_type || 'User',
          reference_id: String(a.reference_id || a.reference_name),
          reference_name: a.reference_name || '',
        }));
      await onCreateTask?.({
        title: trimmed,
        status: 'Pending',
        priority: 'Medium',
        start_datetime: createStart,
        deadline_datetime: createEnd,
        estimated_hours: 1,
        category: '',
        description: '',
        assignments,
      });
      setCreateTitle('');
      setCreateAssignments([]);
      setCreateStart('');
      setCreateEnd('');
      setIsCreating(false);
    } catch (err) {
      const message = err?.message || 'Failed to create task';
      setCreateError({ field: 'form', message });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [createTitle, createAssignments, createStart, createEnd, onCreateTask, toast]);

  useEffect(() => {
    if (!isCreating) return;
    const handleClickOutside = (event) => {
      if (createRowRef.current && !createRowRef.current.contains(event.target)) {
        if (!isSubmitting && isFormDirty) {
          handleCreateSubmit();
        } else if (!isSubmitting && !isFormDirty) {
          setIsCreating(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCreating, isSubmitting, isFormDirty, handleCreateSubmit]);

  const grouped = useMemo(() => {
    const map = {};
    TASK_STATUS_ORDER.forEach((s) => { map[s] = []; });
    tasks.forEach((task) => {
      const status = task.status || 'Pending';
      if (!map[status]) map[status] = [];
      map[status].push(task);
    });
    return map;
  }, [tasks]);

  const statusGroupProps = {
    onEdit,
    onDelete,
    onStatusChange,
    onInlineUpdate,
    onViewTask,
    onProgressChange,
    canManage,
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
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
            <div className="flex justify-end pr-5">
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsCreating((o) => !o)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                  aria-label="Create task"
                  title="Create task"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          </div>

          {TASK_STATUS_ORDER.map((status) => (
            <StatusGroup
              key={status}
              status={status}
              tasks={grouped[status] || []}
              isCreating={isCreating}
              createTitle={createTitle}
              setCreateTitle={setCreateTitle}
              createInputRef={createInputRef}
              handleCreateSubmit={handleCreateSubmit}
              setIsCreating={setIsCreating}
              createAssignments={createAssignments}
              setCreateAssignments={setCreateAssignments}
              createStart={createStart}
              setCreateStart={setCreateStart}
              createEnd={createEnd}
              setCreateEnd={setCreateEnd}
              createError={createError}
              setCreateError={setCreateError}
              isSubmitting={isSubmitting}
              createRowRef={createRowRef}
              canManage={canManage}
              {...statusGroupProps}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TaskListTable;
