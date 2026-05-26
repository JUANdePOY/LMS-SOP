import { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { shortDate } from '@/lib/dateUtils';
import TrainingDetailsModal from '../trainings/TrainingDetailsModal';

export default function InternalTrainingCard({ training }) {
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => setShowDetails(true);
  const handleClose = () => setShowDetails(false);

  const participantCount = training.participant_count ?? training.participants?.length ?? 0;

  return (
    <>
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{training.title || 'Untitled internal training'}</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{training.location || training.venue || 'Location not set'}</p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">Internal</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Starts</p>
            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{shortDate(training.start_datetime || training.start_date)}</p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Participants</p>
            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{participantCount}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <Users className="text-indigo-500" size={16} />
            <span>{participantCount > 0 ? `${participantCount} participant${participantCount !== 1 ? 's' : ''}` : 'No participants yet'}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleClick}>View Full details</Button>
        </div>
      </div>

      <TrainingDetailsModal training={training} isOpen={showDetails} onClose={handleClose} />
    </>
  );
}