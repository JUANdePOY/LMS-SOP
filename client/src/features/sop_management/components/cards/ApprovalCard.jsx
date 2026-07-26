import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react';

export default function ApprovalCard({ approval }) {
  if (!approval) return null;

  const statusIcon = {
    Pending: Clock,
    Approved: ThumbsUp,
    Rejected: ThumbsDown,
  };
  const statusColors = {
    Pending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400',
    Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400',
    Rejected: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400',
  };
  const Icon = statusIcon[approval.status] || Clock;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${statusColors[approval.status] || 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-[var(--text-primary)]">
              {approval.approver_name || `User #${approval.approver_user_id}`}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">
              {approval.created_at ? new Date(approval.created_at).toLocaleString() : '—'}
            </div>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[approval.status] || 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}>
          {approval.status}
        </span>
      </div>

      {approval.comments && (
        <p className="mt-3 text-sm text-[var(--text-primary)] bg-[var(--bg-subtle)] rounded-lg p-3">
          {approval.comments}
        </p>
      )}
    </div>
  );
}