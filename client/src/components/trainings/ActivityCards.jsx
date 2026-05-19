import React from 'react';
import { cn } from '@/lib/utils';
import { computeTotalSlots } from '@/lib/slotUtils';
import {
  Calendar,
  MapPin,
  User,
  Users,
  Eye,
  Pencil,
  Trash2,
  ClipboardList,
  Clock,
} from 'lucide-react';

const mapStatus = (dbStatus) => {
  switch (dbStatus) {
    case 'draft':
    case 'published':
      return 'planned';
    case 'ongoing':
      return 'active';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'planned';
  }
};

const activityStatusConfig = {
  planned: {
    label: 'Planned',
    bar: 'bg-blue-500',
    accent: 'border-l-blue-500',
    dot: 'bg-blue-500',
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  },
  active: {
    label: 'In progress',
    bar: 'bg-emerald-500',
    accent: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  },
  completed: {
    label: 'Completed',
    bar: 'bg-slate-500',
    accent: 'border-l-slate-500',
    dot: 'bg-slate-500',
    className:
      'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    bar: 'bg-red-500',
    accent: 'border-l-red-500',
    dot: 'bg-red-500',
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  },
};

const activityTypeStyles = {
  physical:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25',
  classroom:
    'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/25',
  field:
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25',
  simulation:
    'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25',
  training:
    'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600',
};

function formatDateTime(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function MetaRow({ icon: Icon, label, children, className }) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border border-neutral-100 bg-neutral-50/80 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/40',
        className
      )}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-sm ring-1 ring-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-800"
        aria-hidden
      >
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-neutral-800 dark:text-neutral-100">{children}</p>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, variant = 'default' }) {
  const styles = {
    default: cn(
      'border-neutral-200 bg-white text-neutral-700',
      'hover:border-neutral-300 hover:bg-neutral-50',
      'dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'
    ),
    primary: cn(
      'border-indigo-200 bg-indigo-50 text-indigo-800',
      'hover:border-indigo-300 hover:bg-indigo-100',
      'dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20'
    ),
    danger: cn(
      'border-red-200 bg-red-50 text-red-700',
      'hover:border-red-300 hover:bg-red-100',
      'dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'
    ),
  };

  const iconStyles = {
    default: 'text-neutral-500 dark:text-neutral-400',
    primary: 'text-indigo-600 dark:text-indigo-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5',
        'text-xs font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
        styles[variant]
      )}
    >
      <Icon size={16} strokeWidth={2} className={cn('shrink-0', iconStyles[variant])} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

export function ActivityCard({ activity, onAction }) {
  const displayStatus = mapStatus(activity.status);
  const status = activityStatusConfig[displayStatus] || activityStatusConfig.planned;
  const rawType = (activity.type || 'training').toLowerCase();
  const typeChipClass = activityTypeStyles[rawType] || activityTypeStyles.training;

  const startTime = activity.start_datetime || activity.start_time || activity.startTime;
  const endTime = activity.end_datetime || activity.end_time || activity.endTime;
  const location = activity.venue || activity.location;

  const handleAction = (action) => {
    if (onAction) onAction(action, activity);
  };

  const hasActions = typeof onAction === 'function';

  
  const totalSlots = computeTotalSlots(activity);
  const attendanceCurrent = activity.attendance?.current;
  const attendanceTotal = totalSlots ?? activity.attendance?.total ?? 0;
  const pct = attendanceTotal > 0 ? Math.min(100, Math.round((attendanceCurrent / attendanceTotal) * 100)) : 0;

  const title = activity.title || activity.name || 'Untitled activity';
  const description = activity.description?.trim();
  const typeLabel = rawType.charAt(0).toUpperCase() + rawType.slice(1);
  const startLabel = formatDateTime(startTime);
  const endLabel = formatDateTime(endTime);

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm',
        'transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-900',
        'hover:border-neutral-300 hover:shadow-md dark:hover:border-neutral-700',
        'border-l-[4px]',
        status.accent
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold capitalize',
              typeChipClass
            )}
          >
            {typeLabel}
          </span>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
              status.className
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} aria-hidden />
            {status.label}
          </span>
        </div>

        <div className="min-w-0 space-y-1">
          <h3 className="text-lg font-bold leading-snug tracking-tight text-neutral-900 dark:text-neutral-50">
            {title}
          </h3>
          {description ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {description}
            </p>
          ) : (
            <p className="text-sm italic text-neutral-400 dark:text-neutral-500">No description added</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetaRow icon={Calendar} label="Starts">
            {startLabel || <span className="text-neutral-400">To be scheduled</span>}
          </MetaRow>
          <MetaRow icon={Clock} label="Ends">
            {endLabel || <span className="text-neutral-400">To be scheduled</span>}
          </MetaRow>
          <MetaRow icon={MapPin} label="Location" className="sm:col-span-2">
            {location ? <span className="break-words">{location}</span> : 'Not set'}
          </MetaRow>
          <MetaRow icon={User} label="Instructor" className="sm:col-span-2">
            {activity.instructor?.trim() ? activity.instructor : 'Not assigned'}
          </MetaRow>
        </div>

        {activity.assignedAreas && activity.assignedAreas.length > 0 && (
          <MetaRow icon={Users} label="Assigned units">
            {activity.assignedAreas.length} unit{activity.assignedAreas.length !== 1 ? 's' : ''}
          </MetaRow>
        )}

        {activity.attendance && attendanceTotal > 0 && (
          <div className="rounded-lg border border-neutral-100 bg-gradient-to-br from-neutral-50/90 to-white px-3 py-3 dark:border-neutral-800 dark:from-neutral-800/50 dark:to-neutral-900/50">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">Attendance</span>
              <span className="tabular-nums font-semibold text-neutral-800 dark:text-neutral-100">
                {attendanceCurrent} / {attendanceTotal}
                <span className="ml-1 font-normal text-neutral-500 dark:text-neutral-400">({pct}%)</span>
              </span>
            </div>
            <div
              className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Attendance: ${pct}%`}
            >
              <div
                className={cn('h-full rounded-full transition-all duration-500 ease-out', status.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {hasActions && (
          <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Actions
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <ActionButton
                icon={Eye}
                label="View details"
                variant="default"
                onClick={() => handleAction('view')}
              />
              <ActionButton
                icon={Pencil}
                label="Edit activity"
                variant="primary"
                onClick={() => handleAction('edit')}
              />
              <ActionButton
                icon={Trash2}
                label="Delete"
                variant="danger"
                onClick={() => handleAction('delete')}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function ActivityCards({ activities = [], onAction, title = 'Activities' }) {
  if (!activities.length) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-gradient-to-b from-neutral-50/80 to-white px-6 py-16 text-center dark:border-neutral-700 dark:from-neutral-900/60 dark:to-neutral-900/30"
        role="status"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-neutral-100 dark:bg-neutral-800 dark:ring-neutral-700">
          <ClipboardList className="text-neutral-400" size={26} strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-5 text-base font-semibold text-neutral-900 dark:text-neutral-100">No activities yet</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          Sessions and activities linked to this training will appear here. Each card shows schedule, location,
          instructor, and clear actions when you need to manage them.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {activities.length} activity{activities.length !== 1 ? 'ies' : ''} — use the labeled buttons on each card
            to view, edit, or remove.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {activities.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {activities.map((activity, index) => (
          <ActivityCard
            key={activity.id ?? activity.activity_id ?? `activity-${index}`}
            activity={activity}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  );
}
