import { useState, useEffect, useRef, memo } from 'react';
import { CircleDotDashed, Loader2, Check, AlarmClock, Ban } from 'lucide-react';
import { TASK_PRIORITIES, TASK_STATUSES, TASK_PRIORITY_DOT } from '../constants/taskConstants';
import { formatDateTime, toLocalInputValue } from '../utils/taskDateUtils';
import { cn } from '@/lib/utils';
import { useClickOutside } from '../hooks/useClickOutside';

const STATUS_ICONS = {
  'Not Started': CircleDotDashed,
  'In Progress': Loader2,
  Completed: Check,
  Overdue: AlarmClock,
  Cancelled: Ban,
};

const STATUS_CONFIG = {
  'Not Started': { border: 'border-neutral-300 bg-transparent hover:border-blue-500 dark:border-neutral-600', label: 'Not Started', iconColor: 'text-neutral-500 dark:text-neutral-400' },
  'In Progress': { border: 'border-blue-500 bg-blue-500', label: 'In Progress', iconColor: 'text-white' },
  Completed: { border: 'border-emerald-500 bg-emerald-500', label: 'Completed', iconColor: 'text-white' },
  Overdue: { border: 'border-red-500 bg-red-500', label: 'Overdue', iconColor: 'text-white' },
  Cancelled: { border: 'border-neutral-300 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700', label: 'Cancelled', iconColor: 'text-white' },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG['Not Started'];

const PRIORITY_DOT = TASK_PRIORITY_DOT;

  const InlineEditableText = memo(function InlineEditableText({ value, onSave, className, inputClassName, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => setVal(value), [value]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = val.trim();
    if (!trimmed || trimmed === value) {
      setVal(value);
      return;
    }
    onSave(trimmed);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setVal(value); setEditing(false); }
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className={inputClassName || 'w-full min-w-0 rounded-md border border-blue-500 bg-[var(--bg-page)] px-1.5 py-0.5 text-sm outline-none'}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={className || 'min-w-0 truncate rounded-md px-1.5 py-0.5 -mx-1.5 text-left hover:bg-[var(--bg-page)]'}
      title="Click to edit"
    >
      {value}
    </button>
  );
});

const StatusMenu = memo(function StatusMenu({ status, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  const current = getStatusConfig(status);
  const StatusIcon = STATUS_ICONS[status] || STATUS_ICONS['Not Started'];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="relative grid h-6 w-6 place-items-center"
        title={`Status: ${status} — click to change`}
      >
        <span className={cn('h-3.5 w-3.5 rotate-45 rounded-[3px] border-2 transition-colors', current.border)} />
        <StatusIcon size={10} strokeWidth={2.5} className={cn('absolute drop-shadow-sm', current.iconColor)} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-30 left-0 top-full mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl"
        >
          {TASK_STATUSES.map((s) => {
            const config = getStatusConfig(s);
            const isActive = s === status;
            const SvgIcon = STATUS_ICONS[s] || STATUS_ICONS['Not Started'];
            return (
              <button
                key={s}
                type="button"
                onClick={() => { onStatusChange(s); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]',
                  isActive ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                )}
              >
                <span className={cn('h-2 w-2 rotate-45 rounded-[3px] border-2 flex items-center justify-center', config.border)}>
                  <SvgIcon size={8} strokeWidth={3} className={cn(config.iconColor)} />
                </span>
                {config.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

const PriorityDot = memo(function PriorityDot({ priority, onSave }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="grid h-4 w-4 place-items-center rounded hover:bg-[var(--bg-page)]"
        title={`${priority} priority — click to change`}
      >
        <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[priority] || PRIORITY_DOT.Medium)} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-30 left-0 top-full mt-1 w-32 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl"
        >
          {TASK_PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { onSave({ priority: p }); setOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]',
                p === priority ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[p])} />
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const EditableDateTime = memo(function EditableDateTime({ value, field, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(toLocalInputValue(value));

  useEffect(() => setVal(toLocalInputValue(value)), [value]);

  const commit = (newVal) => {
    setEditing(false);
    if (!newVal || newVal === toLocalInputValue(value)) return;
    onSave({ [field]: newVal });
  };

  if (editing) {
    return (
      <input
        type="datetime-local"
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(e.target.value); }
          if (e.key === 'Escape') setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full min-w-0 rounded-md border border-blue-500 bg-[var(--bg-page)] px-1.5 py-0.5 text-xs outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="w-full min-w-0 truncate rounded-md px-1.5 py-0.5 -mx-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
      title="Click to change"
    >
      {formatDateTime(value)}
    </button>
  );
});

export { InlineEditableText, StatusMenu, PriorityDot, EditableDateTime };
