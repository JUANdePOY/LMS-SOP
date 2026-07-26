import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react';

function ApprovalStatusBadge({ status }) {
  const map = {
    Pending: { icon: Clock, class: 'bg-amber-50 text-amber-700 border-amber-200' },
    Approved: { icon: ThumbsUp, class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Rejected: { icon: ThumbsDown, class: 'bg-red-50 text-red-700 border-red-200' },
  };
  const config = map[status] || map.Pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.class}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

export default function ApprovalTable({ approvals, loading }) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading approvals…</div>;
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No approvals recorded.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Approver</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Comments</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {approvals.map((approval) => (
            <tr key={approval.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {approval.approver_name || `User #${approval.approver_user_id}`}
              </td>
              <td className="px-4 py-3">
                <ApprovalStatusBadge status={approval.status} />
              </td>
              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                {approval.comments || '—'}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {approval.created_at ? new Date(approval.created_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

