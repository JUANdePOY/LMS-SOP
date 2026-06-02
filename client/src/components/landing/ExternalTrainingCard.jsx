import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { shortDate } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import RegistrationModal from './RegistrationModal';
import { getExternalTrainingById } from '@/services/trainingsService';

export default function ExternalTrainingCard({ training }) {
  const { user } = useAuth();
  const [fullTraining, setFullTraining] = useState(null);

  useEffect(() => {
    if (training && (training.id || training.training_id)) {
      const id = training.id ?? training.training_id;
      getExternalTrainingById(id)
        .then(result => {
          if (result.success && result.data) {
            setFullTraining(result.data);
          }
        });
    }
  }, [training]);

  const trainingData = fullTraining || training;
  const squadronCount = trainingData.squadron_limits?.length ?? trainingData.squadronLimits?.length ?? 0;

  const handleClick = () => {
    // We'll keep the existing showDetails state for now to avoid breaking changes
    setShowDetails(true);
  };

  const handleClose = () => {
    setShowDetails(false);
  };

  // We need to keep the showDetails state for the RegistrationModal
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{trainingData.title || 'Untitled external event'}</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{trainingData.location || trainingData.venue || 'Location not set'}</p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">External</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Starts</p>
            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{shortDate(trainingData.start_datetime || trainingData.start_date)}</p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Squadrons</p>
            <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{squadronCount}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="default" size="sm" onClick={handleClick}>Register Now</Button>
        </div>
      </div>

      <RegistrationModal training={trainingData} isOpen={showDetails} onClose={handleClose} currentUser={user} />
    </>
  );
}