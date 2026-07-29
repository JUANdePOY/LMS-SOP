import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { useState } from 'react';
import { useApprovals } from '../../hooks/useApprovals';
import { APPROVAL_STATUS, APPROVAL_STATUS_LABELS } from '../../constants/approvalStatus';
import { useToast } from '@/shared/components/Toast';
import ApproveModal from '../modals/ApproveModal';
import RejectModal from '../modals/RejectModal';

function ApprovalStatusBadge({ status }) {
  const map = {
    [APPROVAL_STATUS.PENDING]: { icon: Clock, class: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900' },
    [APPROVAL_STATUS.APPROVED]: { icon: ThumbsUp, class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900' },
    [APPROVAL_STATUS.REJECTED]: { icon: ThumbsDown, class: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900' },
  };
  const config = map[status] || map.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.class}`}>
      <Icon className="h-3 w-3" />
      {APPROVAL_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function ApprovalsTab({ sopId }) {
  const { approvals, loading, error, refresh, update } = useApprovals(sopId);
  const { success, error: showError } = useToast();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleApprove = async (comments) => {
    if (!selectedApproval) return;
    setSaving(true);
    try {
      await update(selectedApproval.id, { status: APPROVAL_STATUS.APPROVED, comments });
      success('Approval recorded');
      setApproveOpen(false);
      setSelectedApproval(null);
      await refresh();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to approve';
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (reason) => {
    if (!selectedApproval) return;
    setSaving(true);
    try {
      await update(selectedApproval.id, { status: APPROVAL_STATUS.REJECTED, comments: reason });
      success('Rejection recorded');
      setRejectOpen(false);
      setSelectedApproval(null);
      await refresh();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reject';
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const openApprove = (approval) => {
    setSelectedApproval(approval);
    setApproveOpen(true);
  };

  const openReject = (approval) => {
    setSelectedApproval(approval);
    setRejectOpen(true);
  };

  if (loading) {
    return <div className="text-sm text-[var(--text-muted)] py-4">Loading approvals…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--text-muted)]">
        No approvals yet. Submit the SOP for review to start the approval process.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">Approvals ({approvals.length})</h3>

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
           <thead className="bg-[var(--bg-subtle)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
             <tr>
               <th className="px-4 py-3">Approver</th>
               <th className="px-4 py-3">Status</th>
               <th className="px-4 py-3">Comments</th>
               <th className="px-4 py-3">Date</th>
               <th className="px-4 py-3">Actions</th>
             </tr>
           </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
             {approvals.map((approval) => (
               <tr key={approval.id} className="hover:bg-[var(--bg-hover)]">
                 <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                   {approval.approver_name || (approval.approver_user_id != null ? `User #${approval.approver_user_id}` : '—')}
                 </td>
                 <td className="px-4 py-3">
                   <ApprovalStatusBadge status={approval.status} />
                 </td>
                 <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate">
                   {approval.comments || '—'}
                 </td>
                 <td className="px-4 py-3 text-[var(--text-muted)]">
                   {approval.created_at ? new Date(approval.created_at).toLocaleDateString() : '—'}
                 </td>
                 {approval.status === APPROVAL_STATUS.PENDING && (
                   <td className="px-4 py-3">
                     <div className="flex items-center gap-2">
                       <button
                         onClick={() => openApprove(approval)}
                         className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                       >
                         <ThumbsUp className="h-3 w-3" />
                         Approve
                       </button>
                       <button
                         onClick={() => openReject(approval)}
                         className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                       >
                         <ThumbsDown className="h-3 w-3" />
                         Reject
                       </button>
                     </div>
                   </td>
                 )}
               </tr>
             ))}
          </tbody>
        </table>
       </div>

       <ApproveModal
         open={approveOpen}
         onClose={() => { setApproveOpen(false); setSelectedApproval(null); }}
         onApprove={handleApprove}
         saving={saving}
       />

       <RejectModal
         open={rejectOpen}
         onClose={() => { setRejectOpen(false); setSelectedApproval(null); }}
         onReject={handleReject}
         saving={saving}
       />
     </div>
   );
 }