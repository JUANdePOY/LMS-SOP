import { Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { shortDate } from '@/lib/dateUtils';

export default function TrainingPreviewCard({ training, onLogin, variant = 'internal' }) {
  if (variant === 'internal') {
    const participantCount = training.participant_count ?? training.participants?.length ?? training.participant_groups?.reduce((sum, group) => sum + (group.selectedReservists?.length || 0), 0) ?? 0;
    const participantLabels = training.participants?.slice(0, 4).map((participant) => participant.name || participant.username || participant.email) || [];

    return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{training.title || 'Untitled internal training'}</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{training.location || training.venue || 'Location not set'}</p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">Internal</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Starts</p>
            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{shortDate(training.start_datetime || training.start_date)}</p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Participants</p>
            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{participantCount}</p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Activities</p>
            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{training.activities?.length ?? 0}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <Users className="text-indigo-500" size={16} />
            <span>{participantCount > 0 ? `${participantCount} participant${participantCount !== 1 ? 's' : ''}` : 'No participants yet'}</span>
          </div>
          {participantLabels.length > 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{participantLabels.filter(Boolean).join(', ')}{participantCount > participantLabels.length ? ` +${participantCount - participantLabels.length} more` : ''}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onLogin}>
            Sign in for full details
          </Button>
        </div>
      </div>
    );
  }

  const squadronCount = training.squadron_limits?.length ?? training.squadronLimits?.length ?? 0;
  const registrationFields = training.registration_fields?.length ?? 0;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{training.title || 'Untitled external event'}</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{training.location || training.venue || 'Location not set'}</p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">External</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Starts</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{shortDate(training.start_datetime || training.start_date)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Squadrons</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{squadronCount}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Registration</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{registrationFields ? `${registrationFields} field${registrationFields !== 1 ? 's' : ''}` : 'Login required'}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="default" size="sm" onClick={onLogin}>Login to register</Button>
      </div>
    </div>
  );
}