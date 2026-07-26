import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Send, Archive, FileText, Layout, ListOrdered, Paperclip, Users, ThumbsUp, GitBranch, History, Pencil } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useSOPContext } from '../context/SOPContext';
import { useSOPPermission } from '../context/SOPPermissionContext';
import { useSOPDetails } from '../hooks/useSOPDetails';
import { usePublishSOP } from '../hooks/usePublishSOP';
import { useArchiveSOP } from '../hooks/useArchiveSOP';
import { useToast } from '@/shared/components/Toast';
import OverviewTab from '../components/tabs/OverviewTab';
import SectionsTab from '../components/tabs/SectionsTab';
import ProcedureTab from '../components/tabs/ProcedureTab';
import AttachmentsTab from '../components/tabs/AttachmentsTab';
import AssignmentsTab from '../components/tabs/AssignmentsTab';
import ApprovalsTab from '../components/tabs/ApprovalsTab';
import VersionsTab from '../components/tabs/VersionsTab';
import AuditTab from '../components/tabs/AuditTab';
import ApproveModal from '../components/modals/ApproveModal';
import RejectModal from '../components/modals/RejectModal';
import PublishModal from '../components/modals/PublishModal';
import ArchiveModal from '../components/modals/ArchiveModal';
import EditBasicInfoModal from '../components/modals/EditBasicInfoModal';
import { useUpdateSOP } from '../hooks/useUpdateSOP';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'sections', label: 'Sections', icon: Layout },
  { id: 'procedure', label: 'Procedure', icon: ListOrdered },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
  { id: 'assignments', label: 'Assignments', icon: Users },
  { id: 'approvals', label: 'Approvals', icon: ThumbsUp },
  { id: 'versions', label: 'Versions', icon: GitBranch },
  { id: 'audit', label: 'Audit', icon: History },
];

export default function SOPDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedSopId } = useSOPContext();
  const { canPublish, canApprove, canArchive } = useSOPPermission();
  const { sop, loading, error, refresh } = useSOPDetails(id);
  const { publish, loading: publishing } = usePublishSOP();
  const { archive, loading: archiving } = useArchiveSOP();
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showEditBasicInfoModal, setShowEditBasicInfoModal] = useState(false);

  const { update: updateSop, loading: updating } = useUpdateSOP();

  useEffect(() => { setSelectedSopId(Number(id)); }, [id, setSelectedSopId]);

  const apiCall = async (body) => {
    const r = await fetch('/api/sops/' + id + '/transition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + localStorage.getItem('token'),
      },
      body: JSON.stringify(body),
    });
    return r.json();
  };

  const handleSubmitForReview = async () => {
    try {
      const data = await apiCall({ status: 'For Review' });
      if (data.status === 'success') { success('Submitted for review'); await refresh(); }
      else { showError(data.message || 'Unable to submit for review'); }
    } catch (err) { showError(err?.message || 'Unable to submit for review'); }
  };

  const handleApprove = async (comments) => {
    try {
      const data = await apiCall({ status: 'Approved', comment: comments || null });
      if (data.status === 'success') { success('SOP approved'); setShowApproveModal(false); await refresh(); }
      else { showError(data.message || 'Unable to approve'); }
    } catch (err) { showError(err?.message || 'Unable to approve'); }
  };

  const handleReject = async (reason) => {
    try {
      const data = await apiCall({ status: 'Draft', comment: reason || null });
      if (data.status === 'success') { success('SOP returned to draft'); setShowRejectModal(false); await refresh(); }
      else { showError(data.message || 'Unable to reject'); }
    } catch (err) { showError(err?.message || 'Unable to reject'); }
  };

  const handlePublish = async () => {
    try { await publish(id); success('SOP published'); setShowPublishModal(false); await refresh(); }
    catch (err) { showError(err?.response?.data?.message || err?.message || 'Unable to publish'); }
  };

  const handleArchive = async () => {
    try { await archive(id); success('SOP archived'); setShowArchiveModal(false); await refresh(); }
    catch (err) { showError(err?.response?.data?.message || err?.message || 'Unable to archive'); }
  };

  const handleEditSave = async (data) => {
    try {
      await updateSop(id, data);
      success('SOP updated successfully');
      setShowEditBasicInfoModal(false);
      await refresh();
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || 'Unable to update SOP');
      throw err; // Let modal know the save failed
    }
  };

  if (loading) { return <div className="text-sm text-muted-foreground py-4">Loading SOP details...</div>; }

  if (error || !sop) {
    return <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error || 'SOP not found.'}</div>;
  }

  const isDraft = sop.status === 'Draft';
  const isForReview = sop.status === 'For Review';
  const isApproved = sop.status === 'Approved';
  const isPublished = sop.status === 'Published';
  const isArchived = sop.status === 'Archived';

  return (
    <div className="space-y-6">
      <Button variant="link" onClick={() => navigate('/sops')}>
        <ArrowLeft className="h-4 w-4" /> Back to SOP List
      </Button>

      {/* Header Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">SOP Details</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground truncate">{sop.title || 'Untitled SOP'}</h1>
              <span
                className={'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ' +
                  (isPublished
                    ? 'border-[var(--status-green)]/30 bg-[var(--status-green)]/10 text-[var(--status-green)]'
                    : isArchived
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : isApproved
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : isForReview
                          ? 'border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]'
                          : 'border-[var(--border)] bg-muted text-muted-foreground')}
              >
                {sop.status || 'Draft'}
              </span>
            </div>
            {sop.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{sop.description}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex shrink-0 flex-wrap gap-2">
            {isDraft && (
              <>
                <Button variant="outline" onClick={() => setShowEditBasicInfoModal(true)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="default" onClick={handleSubmitForReview}>
                  <Send className="h-4 w-4" /> Submit for Review
                </Button>
              </>
            )}
            {isForReview && canApprove && (
              <>
                <Button variant="default" onClick={() => setShowApproveModal(true)}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => setShowRejectModal(true)}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {isApproved && canPublish && (
              <Button variant="default" onClick={() => setShowPublishModal(true)} disabled={publishing}>
                <CheckCircle2 className="h-4 w-4" /> {publishing ? 'Publishing...' : 'Publish'}
              </Button>
            )}
            {isPublished && canArchive && (
              <Button variant="destructive" onClick={() => setShowArchiveModal(true)} disabled={archiving}>
                <Archive className="h-4 w-4" /> {archiving ? 'Archiving...' : 'Archive'}
              </Button>
            )}
          </div>
        </div>

        {/* Metadata Chips */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Code: <strong className="text-foreground">{sop.code || '-'}</strong></span>
          <span>Version: <strong className="text-foreground">{sop.version || '1.0'}</strong></span>
          <span>Department: <strong className="text-foreground">{sop.department_name || sop.department_id || '-'}</strong></span>
          <span>Owner: <strong className="text-foreground">{sop.owner_name || '-'}</strong></span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="overflow-x-auto">
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-muted p-1 w-fit min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition whitespace-nowrap ' +
                    (activeTab === tab.id
                      ? 'bg-[var(--bg-surface)] text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground')
                  }
                >
                  <Icon className="h-4 w-4" /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && <OverviewTab sop={sop} />}
          {activeTab === 'sections' && <SectionsTab sopId={Number(id)} />}
          {activeTab === 'procedure' && <ProcedureTab sopId={Number(id)} />}
          {activeTab === 'attachments' && <AttachmentsTab sopId={Number(id)} />}
          {activeTab === 'assignments' && <AssignmentsTab sopId={Number(id)} />}
          {activeTab === 'approvals' && <ApprovalsTab sopId={Number(id)} />}
          {activeTab === 'versions' && <VersionsTab sopId={Number(id)} />}
          {activeTab === 'audit' && <AuditTab sopId={Number(id)} />}
        </div>
      </div>

      {/* Modals */}
      <ApproveModal open={showApproveModal} onClose={() => setShowApproveModal(false)} onApprove={handleApprove} saving={false} />
      <RejectModal open={showRejectModal} onClose={() => setShowRejectModal(false)} onReject={handleReject} saving={false} />
      <PublishModal open={showPublishModal} onClose={() => setShowPublishModal(false)} onPublish={handlePublish} saving={publishing} />
      <ArchiveModal open={showArchiveModal} onClose={() => setShowArchiveModal(false)} onArchive={handleArchive} saving={archiving} />
      <EditBasicInfoModal
        open={showEditBasicInfoModal}
        onClose={() => setShowEditBasicInfoModal(false)}
        onSave={handleEditSave}
        sop={sop}
        saving={updating}
      />
    </div>
  );
}