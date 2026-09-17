import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SOP_STATUSES } from '@/features/sop-management/constants/sopConstants';

function ApprovalPanel({ sop, onApprove, onReject, onSubmitForReview, onPublish, onArchive, onRestore, loading = false }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const { user, isSuperAdmin, isAdmin, isDepartmentHead } = useAuth();

  const isApprover = isSuperAdmin || isAdmin;
  const canSubmit = isSuperAdmin || isAdmin || isDepartmentHead;

  const handleApprove = async () => {
    setActionLoading('approve');
    setActionError(null);
    try {
      if (sop?.status === SOP_STATUSES.DRAFT && onSubmitForReview) {
        await onSubmitForReview({ sopId: sop.id, comments: '' });
      } else if (sop?.status === SOP_STATUSES.APPROVED && onPublish) {
        await onPublish({ sopId: sop.id, comments: '' });
      } else if (sop?.status === SOP_STATUSES.PUBLISHED && onArchive) {
        await onArchive({ sopId: sop.id, comments: '' });
      } else if (onApprove) {
        await onApprove({ sopId: sop.id, comments: '' });
      }
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

  const handleRestore = async () => {
    setActionLoading('restore');
    setActionError(null);
    try {
      await onRestore({ sopId: sop.id });
    } catch (err) {
      const message = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Restore failed';
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

  if (!isApprover && !canSubmit) {
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
        {sop?.status === SOP_STATUSES.ARCHIVED ? (
          <button
            onClick={handleRestore}
            disabled={actionLoading === 'restore'}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {actionLoading === 'restore' ? 'Restoring...' : 'Restore to Draft'}
          </button>
        ) : (
          <>
            {canSubmit && sop?.status === SOP_STATUSES.DRAFT && (
              <button
                onClick={handleApprove}
                disabled={actionLoading === 'approve'}
                className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'approve' ? 'Submitting...' : 'Submit for Review'}
              </button>
            )}
            {isApprover && sop?.status === SOP_STATUSES.FOR_REVIEW && (
              <button
                onClick={handleApprove}
                disabled={actionLoading === 'approve'}
                className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'approve' ? 'Approving...' : 'Approve SOP'}
              </button>
            )}
            {isApprover && sop?.status === SOP_STATUSES.APPROVED && (
              <button
                onClick={handleApprove}
                disabled={actionLoading === 'approve'}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'approve' ? 'Publishing...' : 'Publish SOP'}
              </button>
            )}
            {isApprover && sop?.status === SOP_STATUSES.PUBLISHED && (
              <button
                onClick={handleApprove}
                disabled={actionLoading === 'approve'}
                className="w-full px-3 py-2 bg-neutral-500 text-white rounded text-sm font-medium hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'approve' ? 'Archiving...' : 'Archive SOP'}
              </button>
            )}
            {isApprover && sop?.status !== SOP_STATUSES.APPROVED && sop?.status !== SOP_STATUSES.PUBLISHED && (
              <button
                onClick={handleReject}
                disabled={actionLoading === 'reject'}
                className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'reject' ? 'Rejecting...' : 'Reject SOP'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ApprovalPanel;
