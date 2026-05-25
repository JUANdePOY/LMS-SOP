import React from 'react';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeTotalSlots } from '@/lib/slotUtils';

export default function TrainingCard({ training, isAdmin, onEdit, onDelete }) {
  const isExternal = training._source === 'external';
  const displayDate = training.start_datetime || training.start_date;

  const statusStyles = {
    published: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    open:      'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    ongoing:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    completed: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    closed:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    draft:     'bg-neutral-50 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  };

  const totalSlots = computeTotalSlots(training);

  return (
    <div className={cn(
      'relative flex flex-col gap-4 rounded-xl p-5',
      'border border-neutral-200 dark:border-neutral-800',
      'bg-white dark:bg-neutral-900',
      'hover:border-neutral-300 dark:hover:border-neutral-700',
      'hover:shadow-lg dark:hover:shadow-none',
      'transition-all duration-200'
    )}>

      <span className={cn(
        'absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
        isExternal
          ? 'bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20'
          : 'bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
      )}>
        {isExternal ? 'External' : 'Internal'}
      </span>

      <div className="pr-16">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          {training.title}
        </h3>
        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 truncate">
          {training.location || training.venue || 'No location specified'}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {training.type && (
          <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
            {training.type.charAt(0).toUpperCase() + training.type.slice(1)}
          </span>
        )}

        <span className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border',
          statusStyles[training.status] || 'bg-neutral-50 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
        )}>
          {training.status || 'Unknown'}
        </span>
      </div>

      <div className={cn('gap-3', isExternal && 'grid grid-cols-3')}>
        <div className="flex items-start gap-2 text-sm">
          <Calendar size={14} className="text-neutral-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-xs">Start</span>
            <span className="text-neutral-700 dark:text-neutral-300">
              {displayDate ? new Date(displayDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        {isExternal && (
          <>
            <div className="flex items-start gap-2 text-sm">
              <Calendar size={14} className="text-neutral-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs">Capacity</span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  {totalSlots ? `${totalSlots} slots` : 'Unlimited'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <Calendar size={14} className="text-neutral-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs">Squadrons</span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  {training.squadron_limits?.length ?? training.squadronLimits?.length ?? 0}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        {isAdmin && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Edit"
          >
            <Edit size={14} className="text-neutral-500" />
          </button>
        )}

        {isAdmin && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}