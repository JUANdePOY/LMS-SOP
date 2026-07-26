import { ThumbsUp, ThumbsDown, Clock, Send, Circle } from 'lucide-react';

const ACTION_ICONS = {
  Submitted: Send,
  Approved: ThumbsUp,
  Rejected: ThumbsDown,
  Commented: Circle,
};

const ACTION_COLORS = {
  Submitted: 'text-blue-600 bg-blue-50',
  Approved: 'text-emerald-600 bg-emerald-50',
  Rejected: 'text-red-600 bg-red-50',
  Commented: 'text-gray-600 bg-gray-50',
};

export default function ApprovalTimeline({ actions, loading }) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading timeline…</div>;
  }

  if (!actions || actions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No approval activity yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {actions.map((action, index) => {
          const Icon = ACTION_ICONS[action.action] || Clock;
          const colorClass = ACTION_COLORS[action.action] || 'text-gray-500 bg-gray-100';

          return (
            <div key={action.id || index} className="relative flex gap-4">
              {/* Icon circle */}
              <div className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {action.actor_name || `User #${action.actor_id}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {action.action_at || action.created_at ? new Date(action.action_at || action.created_at).toLocaleString() : '—'}
                  </span>
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 mt-1">
                  {action.action || 'Action'}
                </span>
                {action.comments && (
                  <p className="mt-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    {action.comments}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

