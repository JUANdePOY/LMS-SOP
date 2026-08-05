import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function ApprovalPanel({ sop, onApprove, onReject, loading = false }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const handleApprove = async () => {
    setActionLoading('approve');
    setActionError(null);
    try {
      await onApprove({ sopId: sop.id, comments: '' });
    } catch (err) {
      const message = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Approve failed';
      setActionError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    setActionError(null);
    try {
      await onReject({ sopId: sop.id, comments: 'Rejected by admin' });
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

  if (!sop) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">No SOP data.</p>;
  }

  if (!isAdmin) {
    return (
      <div className="text-sm text-neutral-500 dark:text-neutral-400">
        Only admins and super admins can approve or reject this SOP.
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
      <div className="space-y-2">
        <button
          onClick={handleApprove}
          disabled={actionLoading === 'approve'}
          className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {actionLoading === 'approve' ? 'Approving...' : 'Approve SOP'}
        </button>
        <button
          onClick={handleReject}
          disabled={actionLoading === 'reject'}
          className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {actionLoading === 'reject' ? 'Rejecting...' : 'Reject SOP'}
        </button>
      </div>
    </div>
  );
}

export default ApprovalPanel;
