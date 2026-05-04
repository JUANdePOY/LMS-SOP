import { Megaphone } from 'lucide-react';

/**
 * Announcements Page
 * Displays announcements and updates for reservist users
 */
export default function Announcements() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Announcements
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Latest updates and announcements for reservists
        </p>
      </div>

      {/* Empty State */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
            <Megaphone size={28} className="text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            No Announcements Yet
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-md">
            Announcements from administrators will appear here. Check back later for updates on trainings, events, and important notices.
          </p>
        </div>
      </div>

      {/* TODO: Implement announcements list when backend API is ready */}
      {/* This page will eventually fetch from GET /api/announcements */}
    </div>
  );
}
