import { useState } from 'react';

const statusActions = {
  Draft: { label: 'Submit for Review', variant: 'indigo', action: 'submit' },
  'For Review': { label: 'Approve SOP', variant: 'green', action: 'approve' },
  Approved: { label: 'Publish SOP', variant: 'blue', action: 'publish' },
  Published: { label: 'Archive SOP', variant: 'gray', action: 'archive' },
  Archived: null,
};

function SOPActionBar({ sop, onAction, loading }) {
  const config = statusActions[sop.status];
  if (!config) return null;

  const isLoading = loading?.[config.action] || false;

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        Status:{' '}
        <span className={`font-medium ${
          sop.status === 'Published' ? 'text-green-600 dark:text-green-400' :
          sop.status === 'Approved' ? 'text-blue-600 dark:text-blue-400' :
          sop.status === 'For Review' ? 'text-amber-600 dark:text-amber-400' :
          sop.status === 'Archived' ? 'text-neutral-400' :
          'text-neutral-600 dark:text-neutral-300'
        }`}>
          {sop.status}
        </span>
      </span>
      <button
        onClick={() => onAction(config.action)}
        disabled={isLoading}
        className={`px-3 py-1 rounded text-xs font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          config.variant === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' :
          config.variant === 'green' ? 'bg-green-600 hover:bg-green-700' :
          config.variant === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
          'bg-neutral-500 hover:bg-neutral-600'
        }`}
      >
        {isLoading ? '...' : config.label}
      </button>
    </div>
  );
}

export default SOPActionBar;
