import { CheckCircle2, Clock } from 'lucide-react';

function StatusBadge({ status }) {
  const isAcknowledged = status === 'Acknowledged';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isAcknowledged
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}
    >
      {isAcknowledged ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {status || 'Pending'}
    </span>
  );
}

export default function AcknowledgementTable({ acknowledgements, stats, loading }) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading acknowledgements…</div>;
  }

  if (!acknowledgements || acknowledgements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No acknowledgements recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-700">{stats.acknowledged || 0}</div>
            <div className="text-xs text-emerald-600 mt-0.5">Acknowledged</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
            <div className="text-2xl font-bold text-amber-700">{stats.pending || 0}</div>
            <div className="text-xs text-amber-600 mt-0.5">Pending</div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Acknowledged At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {acknowledgements.map((ack) => (
              <tr key={ack.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {ack.user_name || (ack.user_id != null ? `User #${ack.user_id}` : '—')}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {ack.user_email || '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={ack.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {ack.acknowledged_at
                    ? new Date(ack.acknowledged_at).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { StatusBadge };

