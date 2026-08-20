import { useState, useRef, useEffect } from 'react';
import { Check, Trash2, Type, CalendarClock, CalendarCheck2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_TABLE_GRID_COLS, DEFAULT_DUE_DATE_OFFSET_MS } from '../constants/taskConstants';
import { validateTaskPayload } from '../utils/taskValidation';
import CreateAssignmentModal from './CreateAssignmentModal';
import DescriptionModal from './DescriptionModal';

function buildCreatePayload(title, assignments, start, end, description, parentTask) {
  return {
    title: title.trim(),
    status: 'Pending',
    priority: 'Medium',
    start_datetime: start,
    deadline_datetime: end,
    estimated_hours: 1,
    category: '',
    description: description.trim(),
    assignments,
    parent_task_id: parentTask.id,
    client_id: parentTask.client_id ?? null,
    client_business_id: parentTask.client_business_id ?? null,
    business_id: parentTask.business_id ?? null,
  };
}

export default function SubtaskInlineRow({ parentTask, onSave, onCancel, canManage }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const now = new Date();
    const startVal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStart(startVal);
    setEnd(new Date(now.getTime() + DEFAULT_DUE_DATE_OFFSET_MS - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  }, []);

  const handleSave = async () => {
    const cleanedAssignments = assignments
      .filter((a) => a.reference_id && String(a.reference_id).trim() !== '')
      .map((a) => ({
        assignment_type: a.assignment_type || 'User',
        reference_id: String(a.reference_id),
        reference_name: a.reference_name || '',
      }));

    const validation = validateTaskPayload(
      buildCreatePayload(title, cleanedAssignments, start, end, description, parentTask),
      true
    );
    if (!validation.valid) {
      const firstField = Object.keys(validation.errors)[0];
      setError({ field: firstField, message: validation.errors[firstField] });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(buildCreatePayload(title, cleanedAssignments, start, end, description, parentTask));
      setTitle('');
      setDescription('');
      setAssignments([]);
      setStart('');
      setEnd('');
    } catch (err) {
      setError({ field: 'form', message: err?.message || 'Failed to create sub-task' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) inputRef.current?.focus(); }}
      className="group relative grid items-start gap-3 border-b border-l-2 border-l-blue-500 border-[var(--border)] pl-[34px] pr-4 py-3 last:border-b-0 cursor-text bg-blue-50/40 dark:bg-blue-500/[0.06] ring-1 ring-inset ring-blue-500/10 transition-colors"
      style={{ gridTemplateColumns: TASK_TABLE_GRID_COLS }}
    >
      <span className="flex h-[30px] items-center" onClick={(e) => e.stopPropagation()}>
        <Plus size={14} className="text-blue-500/70" />
      </span>

      <div className="min-w-0">
        <div className="relative">
          <Type size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500/70" />
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (error?.field === 'title') setError(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="Sub-task title"
            className={cn(
              'w-full rounded-lg border bg-[var(--bg-surface)] pl-8 pr-2 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-[var(--text-muted)]',
              error?.field === 'title'
                ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-blue-500/60 focus:border-blue-500 focus:ring-2 focus:border-blue-500/20'
            )}
          />
        </div>
        {error?.field === 'title' && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
      </div>

      <div className="min-w-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAssignmentOpen(true); }}
          className="min-w-0 w-full truncate rounded-md px-1.5 py-0.5 -mx-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
          title="Click to edit assignments"
        >
          {assignments.length > 0
            ? assignments.map((a) => a.reference_name || a.reference_id).join(', ')
            : <span className="text-[var(--text-muted)]">Click to add assignments</span>}
        </button>
      </div>

      <CreateAssignmentModal
        open={assignmentOpen}
        onClose={() => setAssignmentOpen(false)}
        onSubmit={(next) => setAssignments(next)}
        initialAssignments={assignments}
      />

      <div className="min-w-0"><span className="text-sm text-[var(--text-muted)]">&nbsp;</span></div>

      <div className="min-w-0">
        <div className="relative">
          <CalendarClock size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500/70" />
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => { setStart(e.target.value); if (error?.field === 'start_datetime') setError(null); }}
            className={cn(
              'w-full rounded-lg border bg-[var(--bg-surface)] pl-8 pr-2 py-1.5 text-sm shadow-sm outline-none transition-colors',
              error?.field === 'start_datetime' ? 'border-red-500' : 'border-blue-500/60 focus:border-blue-500'
            )}
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="relative">
          <CalendarCheck2 size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500/70" />
          <input
            type="datetime-local"
            value={end}
            min={start || undefined}
            onChange={(e) => { setEnd(e.target.value); if (error?.field === 'deadline_datetime') setError(null); }}
            className={cn(
              'w-full rounded-lg border bg-[var(--bg-surface)] pl-8 pr-2 py-1.5 text-sm shadow-sm outline-none transition-colors',
              error?.field === 'deadline_datetime' ? 'border-red-500' : 'border-blue-500/60 focus:border-blue-500'
            )}
          />
        </div>
      </div>

      <div className="min-w-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDescriptionOpen(true); }}
          className="min-w-0 w-full truncate rounded-md px-1.5 py-0.5 -mx-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
          title="Click to add description"
        >
          {description || <span className="text-[var(--text-muted)]">Click to add description</span>}
        </button>
      </div>

      <DescriptionModal
        open={descriptionOpen}
        onClose={() => setDescriptionOpen(false)}
        onSubmit={(desc) => setDescription(desc)}
        initialDescription={description}
      />

      <span className="flex h-[30px] items-center gap-1.5 shrink-0 opacity-100">
        {submitting ? (
          <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 dark:border-blue-900 border-t-blue-500" />
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors"
              aria-label="Save sub-task"
              title="Save (Enter)"
            >
              <Check size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
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
  );
}
