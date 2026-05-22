import { Calendar, MapPin, Users, X } from 'lucide-react';
import { shortDate } from '@/lib/dateUtils';

export default function RegistrationModal({ training, isOpen, onClose }) {
  if (!isOpen) return null;

  const squadronCount = training.squadron_limits?.length ?? training.squadronLimits?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">External Event</span>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{training.title || 'Untitled Event'}</h2>
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
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{squadronCount} squadron limits</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Squadron Registration</p>
            {training.squadron_limits && training.squadron_limits.length > 0 ? (
              <div className="space-y-2">
                {training.squadron_limits.map((squadron) => (
                  <div key={squadron.id} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{squadron.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {squadron.registered ?? 0} / {squadron.limit ?? 'Unlimited'} registered
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-600 dark:text-neutral-400">No squadron registration limits configured.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}