import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react';

export default function ApprovalCard({ approval }) {
  if (!approval) return null;

  const statusIcon = {
    Pending: Clock,
    Approved: ThumbsUp,
    Rejected: ThumbsDown,
  };
  const statusColors = {
    Pending: 'border-amber-200 bg-amber-50 text-amber-700',
    Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Rejected: 'border-red-200 bg-red-50 text-red-700',
  };
  const Icon = statusIcon[approval.status] || Clock;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${statusColors[approval.status] || 'bg-gray-100 text-gray-500'}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {approval.approver_name || `User #${approval.approver_user_id}`}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {approval.created_at ? new Date(approval.created_at).toLocaleString() : '—'}
            </div>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[approval.status] || 'bg-gray-100 text-gray-600'}`}>
          {approval.status}
        </span>
      </div>

      {approval.comments && (
        <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
          {approval.comments}
        </p>
      )}
    </div>
  );
}

