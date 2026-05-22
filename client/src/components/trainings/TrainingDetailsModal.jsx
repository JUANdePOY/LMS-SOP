import { Users, Calendar, MapPin, X } from 'lucide-react';
import { shortDate } from '@/lib/dateUtils';

export default function TrainingDetailsModal({ training, isOpen, onClose }) {
  if (!isOpen) return null;

  const participantCount = training.participant_count ?? training.participants?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">Internal Training</span>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{training.title || 'Untitled Training'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Description</p>
              <p className="mt-1 text-neutral-700 dark:text-neutral-300">{training.description || 'No description available.'}</p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {shortDate(training.start_datetime || training.start_date)} - {shortDate(training.end_datetime || training.end_date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-indigo-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{training.location || training.venue || 'Location not set'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{participantCount} participants</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Participants</p>
              {training.participants && training.participants.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {training.participants.slice(0, 10).map((p) => (
                    <li key={p.id || p.email} className="text-sm text-neutral-700 dark:text-neutral-300">
                      {p.name || p.email}
                    </li>
                  ))}
                  {training.participants.length > 10 && (
                    <li className="text-sm text-neutral-500 dark:text-neutral-400">+{training.participants.length - 10} more</li>
                  )}
                </ul>
              ) : (
                <p className="mt-1 text-neutral-600 dark:text-neutral-400">No participants registered yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}