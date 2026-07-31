import { useState } from 'react';

function ApprovalPanel({ approvals = [], onApprove, onReject, loading = false }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);

  const pending = approvals.filter((a) => a.status === 'pending');
  const history = approvals.filter((a) => a.status !== 'pending');

  const handleApprove = async (approvalId) => {
    setActionLoading(approvalId);
    setActionError(null);
    try {
      await onApprove(approvalId);
    } catch (err) {
      const message = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Approve failed';
      setActionError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (approvalId) => {
    setActionLoading(approvalId);
    setActionError(null);
    try {
      await onReject(approvalId);
    } catch (err) {
      const message = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Reject failed';
      setActionError(message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="approval-panel">
      {actionError && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
          {actionError}
        </div>
      )}
      {pending.length > 0 ? (
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Pending</h4>
          {pending.map((approval) => (
            <div key={approval.id} className="flex items-center justify-between border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 bg-white dark:bg-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{approval.approver_name?.[0]?.toUpperCase() || '?'}</span>
                </div>
                <span className="text-sm text-neutral-700 dark:text-neutral-300">{approval.approver_name || 'Unknown'}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleApprove(approval.id)}
                  disabled={actionLoading === approval.id}
                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === approval.id ? '...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(approval.id)}
                  disabled={actionLoading === approval.id}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === approval.id ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">No pending approvals.</p>
      )}
      {history.length > 0 && (
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">History</h4>
          <div className="space-y-2">
            {history.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 dark:text-neutral-400">{approval.approver_name || 'Unknown'}</span>
                <span className={`font-medium ${approval.status === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {approval.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalPanel;
