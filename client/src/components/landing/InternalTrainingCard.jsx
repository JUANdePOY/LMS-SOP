import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shortDate } from '@/lib/dateUtils';
import TrainingDetailsModal from '../trainings/TrainingDetailsModal';
import { getInternalTrainingById } from '@/services/trainingsService';

export default function InternalTrainingCard({ training }) {
  const [fullTraining, setFullTraining] = useState(null);

  useEffect(() => {
    if (training && (training.id || training.training_id)) {
      const id = training.id ?? training.training_id;
      getInternalTrainingById(id)
        .then(result => {
          if (result.success && result.data) {
            setFullTraining(result.data);
          }
        });
    }
  }, [training]);

  const trainingData = fullTraining || training;
  const participantCount = trainingData.participant_count ?? trainingData.participants?.length ?? 0;

  const handleClick = () => {
    // We don't need to set showDetails here because we are using the modal from TrainingDetailsModal
    // which is controlled by its own props. But we keep the existing logic for compatibility.
    // Actually, the TrainingDetailsModal is controlled by the isOpen prop we pass.
    // We'll keep the existing showDetails state for now to avoid breaking changes.
    // However, note that we are not using showDetails in this component anymore? 
    // We are still using it to control the TrainingDetailsModal.
    // We'll keep it.
    setShowDetails(true);
  };

  const handleClose = () => {
    setShowDetails(false);
  };

  // We need to keep the showDetails state for the TrainingDetailsModal
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{trainingData.title || 'Untitled internal training'}</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{trainingData.location || trainingData.venue || 'Location not set'}</p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">Internal</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Starts</p>
            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{shortDate(trainingData.start_datetime || trainingData.start_date)}</p>
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

      <TrainingDetailsModal training={trainingData} isOpen={showDetails} onClose={handleClose} />
    </>
  );
}