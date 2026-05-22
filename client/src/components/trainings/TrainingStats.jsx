import React from 'react';
import { ClipboardList, PlayCircle, CheckCircle, FileEdit, Users, TrendingUp, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeTotalSlots } from '@/lib/slotUtils';

const iconWrapperClass = 'flex h-10 w-10 items-center justify-center rounded-xl';

const statsConfig = [
  {
    key: 'total',
    label: 'Total Trainings',
    icon: ClipboardList,
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    valueFn: (trainings) => trainings.length,
  },
  {
    key: 'active',
    label: 'In Progress',
    icon: PlayCircle,
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueFn: (trainings) => {
      const activeStatuses = new Set(['published', 'ongoing', 'open']);
      return trainings.filter((t) => activeStatuses.has(t.status)).length;
    },
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle,
    iconBg: 'bg-sky-50 dark:bg-sky-500/10',
    iconColor: 'text-sky-600 dark:text-sky-400',
    valueFn: (trainings) => trainings.filter((t) => t.status === 'completed').length,
  },
  {
    key: 'draft',
    label: 'Drafts',
    icon: FileEdit,
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueFn: (trainings) => trainings.filter((t) => t.status === 'draft').length,
  },
  {
    key: 'participants',
    label: 'Total Participants',
    icon: Users,
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    valueFn: (trainings) => trainings.reduce((sum, t) => sum + (t.participants?.length || 0), 0),
  },
  {
    key: 'capacity',
    label: 'Participation Rate',
    icon: TrendingUp,
    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
    iconColor: 'text-rose-600 dark:text-rose-400',
    valueFn: (trainings) => {
      const totalParticipants = trainings.reduce((sum, t) => sum + (t.participants?.length || 0), 0);
      const totalMaxCapacity = trainings.reduce((sum, t) => sum + (computeTotalSlots(t) || 0), 0);
      if (totalMaxCapacity === 0) return '—';
      return `${Math.round((totalParticipants / totalMaxCapacity) * 100)}%`;
    },
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    icon: XCircle,
    iconBg: 'bg-red-50 dark:bg-red-500/10',
    iconColor: 'text-red-600 dark:text-red-400',
    valueFn: (trainings) => trainings.filter((t) => t.status === 'cancelled').length,
  },
];

const TrainingStats = ({ trainings = [] }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {statsConfig.map((stat) => {
        const Icon = stat.icon;
        const value = stat.valueFn(trainings);
        return (
          <div
            key={stat.key}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
          >
            <div className={cn(iconWrapperClass, stat.iconBg)}>
              <Icon size={18} className={stat.iconColor} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 leading-none">{value}</p>
              <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 mt-1 uppercase tracking-wider truncate">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrainingStats;
