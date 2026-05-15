import React from 'react';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CalendarClock,
  MapPin,
  User,
  Users,
  Eye,
  Pencil,
  Trash2,
  ClipboardList,
} from 'lucide-react';

// Map database status to display status
const mapStatus = (dbStatus) => {
  switch (dbStatus) {
    case 'draft':
      return 'planned';
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
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  },
  active: {
    label: 'Active',
    bar: 'bg-emerald-500',
    accent: 'border-l-emerald-500',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  },
  completed: {
    label: 'Completed',
    bar: 'bg-slate-500',
    accent: 'border-l-slate-500',
    className:
      'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    bar: 'bg-red-500',
    accent: 'border-l-red-500',
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  },
};

const activityTypeStyles = {
  physical: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25',
  classroom:
    'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/25',
  field: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25',
  simulation:
    'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25',
  training:
    'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600',
};

function formatDateTime(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'TBD';
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'TBD';
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-sm dark:bg-neutral-900 dark:text-neutral-400"
        aria-hidden
      >
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-neutral-800 dark:text-neutral-100">{children}</p>
      </div>
    </div>
  );
}

export function ActivityCard({ activity, onAction }) {
  const displayStatus = mapStatus(activity.status);
  const status = activityStatusConfig[displayStatus] || activityStatusConfig.planned;
  const rawType = (activity.type || 'training').toLowerCase();
  const typeChipClass = activityTypeStyles[rawType] || activityTypeStyles.training;

  const startTime = activity.start_datetime || activity.startTime;
  const endTime = activity.end_datetime || activity.endTime;
  const location = activity.venue || activity.location;

  const handleAction = (action) => {
    if (onAction) onAction(action, activity);
  };

  const attendanceTotal = activity.attendance?.total;
  const attendanceCurrent = activity.attendance?.current;
  const pct =
    attendanceTotal > 0 ? Math.min(100, Math.round((attendanceCurrent / attendanceTotal) * 100)) : 0;

  const title = activity.title || activity.name || 'Untitled activity';
  const description = activity.description?.trim();
  const typeLabel = rawType.charAt(0).toUpperCase() + rawType.slice(1);

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-900',
        'hover:border-neutral-300 hover:shadow-md dark:hover:border-neutral-700 dark:hover:shadow-none',
        'border-l-[3px]',
        status.accent
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        {/* Top: type + status + mandatory */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize',
                typeChipClass
              )}
            >
              {typeLabel}
            </span>
            {(activity.is_mandatory === 1 || activity.is_mandatory === true) && (
              <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                Mandatory
              </span>
            )}
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
              status.className
            )}
          >
            {status.label}
          </span>
        </div>

        {/* Title + description */}
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug text-neutral-900 dark:text-neutral-50">{title}</h3>
          {description ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {description}
            </p>
          ) : (
            <p className="mt-1.5 text-sm italic text-neutral-400 dark:text-neutral-500">No description added</p>
          )}
        </div>

        {/* Schedule & logistics — scannable grid */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetaRow icon={Calendar} label="Starts">
            {formatDateTime(startTime) || 'TBD'}
          </MetaRow>
          <MetaRow icon={CalendarClock} label="Ends">
            {formatDateTime(endTime) || 'TBD'}
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
          <div className="rounded-lg border border-neutral-100 bg-neutral-50/60 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/40">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">Attendance</span>
              <span className="tabular-nums font-semibold text-neutral-800 dark:text-neutral-100">
                {attendanceCurrent} / {attendanceTotal}
                <span className="ml-1 text-neutral-500 dark:text-neutral-400">({pct}%)</span>
              </span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Attendance progress"
            >
              <div
                className={cn('h-full rounded-full transition-all duration-300', status.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions — clear labels on sm+ for discoverability */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => handleAction('view')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="View activity"
          >
            <Eye size={16} strokeWidth={2} className="shrink-0 text-neutral-500" />
            <span className="hidden sm:inline">View</span>
          </button>
          <button
            type="button"
            onClick={() => handleAction('edit')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Edit activity"
          >
            <Pencil size={16} strokeWidth={2} className="shrink-0 text-neutral-500" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            type="button"
            onClick={() => handleAction('delete')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:text-red-400 dark:hover:bg-red-500/10"
            aria-label="Delete activity"
          >
            <Trash2 size={16} strokeWidth={2} className="shrink-0" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ActivityCards({ activities = [], onAction }) {
  if (!activities.length) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-14 text-center dark:border-neutral-700 dark:bg-neutral-900/40"
        role="status"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-neutral-800">
          <ClipboardList className="text-neutral-400" size={22} strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-4 text-sm font-semibold text-neutral-800 dark:text-neutral-100">No activities scheduled</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          When this training has sessions or activities, they will show up here in an easy-to-scan layout.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {activities.map((activity, index) => (
        <ActivityCard
          key={activity.id ?? activity.activity_id ?? `activity-${index}`}
          activity={activity}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
