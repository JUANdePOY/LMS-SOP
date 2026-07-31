import { useState, useEffect } from 'react';
import { X, Plus, Share2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/shared/components/ui/Toast';
import ApprovalPanel from '@/features/sop-management/components/ApprovalPanel';
import VersionTimeline from '@/features/sop-management/components/VersionTimeline';
import AuditTimeline from '@/features/sop-management/components/AuditTimeline';
import ShareLinkDrawer from '@/features/sop-management/components/ShareLinkDrawer';
import { useVersions } from '@/features/sop-management/hooks/useVersions';
import { createVersion } from '@/features/sop-management/services/versionService';
import { approveApproval, rejectApproval, getApprovals } from '@/features/sop-management/services/sopService';

function SidebarCard({ title, children, className }) {
  return (
    <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm ${className || ''}`}>
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function SOPSidebar({ sopId, approvals, setApprovals, auditLogs, versions, versionsLoading, versionsError, approvalsLoading = false, auditLogsLoading = false, onVersionRestore, onAuditRefresh, onSopRefresh, refetchVersions }) {
  const [showVersionTimeline, setShowVersionTimeline] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [showShareDrawer, setShowShareDrawer] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [creatingVersion, setCreatingVersion] = useState(false);
  const { toast } = useToast();

  return (
    <>
      <SidebarCard title="Approvals">
        <ApprovalPanel
          approvals={approvals}
          loading={approvalsLoading}
          onApprove={async (id) => {
            try {
              await approveApproval(sopId, id);
              const { data } = await getApprovals(sopId);
              setApprovals(data?.data || []);
              if (onAuditRefresh) onAuditRefresh();
              if (onSopRefresh) onSopRefresh();
              toast.success('Approval recorded successfully');
            } catch (err) {
              const message = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Approve failed';
              toast.error(message);
            }
          }}
          onReject={async (id) => {
            try {
              await rejectApproval(sopId, id, 'Rejected by reviewer');
              const { data } = await getApprovals(sopId);
              setApprovals(data?.data || []);
              if (onAuditRefresh) onAuditRefresh();
              if (onSopRefresh) onSopRefresh();
              toast.success('Rejection recorded successfully');
            } catch (err) {
              const message = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Reject failed';
              toast.error(message);
            }
          }}
        />
      </SidebarCard>
      <SidebarCard title="Version History">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => { setShowVersionTimeline(true); }} className="flex-1 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
            View All Versions
          </button>
          <button onClick={() => { setShowNewVersionForm(!showNewVersionForm); setNewVersion(''); setChangeSummary(''); }} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" title="Create new version">
            <Plus size={16} className="text-indigo-600 dark:text-indigo-400" />
          </button>
        </div>
        {showNewVersionForm && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newVersion.trim()) return;
              setCreatingVersion(true);
              try {
                await createVersion(sopId, { version: newVersion, change_summary: changeSummary || null, status: 'Draft' });
                setShowNewVersionForm(false);
                setNewVersion('');
                setChangeSummary('');
                if (refetchVersions) await refetchVersions();
                if (onSopRefresh) onSopRefresh();
              } catch (err) {
                console.error('Failed to create version:', err);
              } finally {
                setCreatingVersion(false);
              }
            }}
            className="mt-2 space-y-2 p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg"
          >
            <input
              type="text"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder="Version (e.g. 1.1)"
              className="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              required
            />
            <textarea
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Change summary (optional)"
              className="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button type="submit" disabled={creatingVersion} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md disabled:opacity-50">
                {creatingVersion ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowNewVersionForm(false); setNewVersion(''); setChangeSummary(''); }} className="px-3 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-700 dark:text-neutral-300">
                Cancel
              </button>
            </div>
          </form>
        )}
        {versionsLoading && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">Loading...</p>}
        {versionsError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">Failed to load versions</p>}
        {!versionsLoading && !versionsError && versions.length > 0 && (
          <div className="mt-3 space-y-2">
            {versions.slice(0, 3).map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 dark:text-neutral-300">v{v.version}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${v.status === 'Published' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-neutral-300'}`}>{v.status}</span>
              </div>
            ))}
          </div>
        )}
        {!versionsLoading && versions.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">No versions yet.</p>}
      </SidebarCard>
      <SidebarCard title="Audit Trail">
        <button onClick={() => { setShowAuditTrail(true); }} className="w-full text-left text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
          View Full Audit Trail
        </button>
        {auditLogs.length > 0 ? (
          <div className="mt-3 space-y-2">
            {auditLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="text-xs text-neutral-500 dark:text-neutral-400 border-l-2 border-neutral-200 dark:border-neutral-700 pl-2">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{log.action}</span>
                <span className="ml-2 text-neutral-400">{new Date(log.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">No audit entries.</p>
        )}
        <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setShowShareDrawer(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors min-h-[44px]"
          >
            <Share2 size={18} />
            Share
          </button>
        </div>
      </SidebarCard>

      {showVersionTimeline && (
        <div className="fixed inset-0 z-40 hidden lg:flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowVersionTimeline(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Version History</h3>
              <button onClick={() => setShowVersionTimeline(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X size={20} className="text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>
            <div className="p-4">
              <VersionTimeline versions={versions} onRestore={onVersionRestore} sopId={sopId} />
            </div>
          </div>
        </div>
      )}

      {showAuditTrail && (
        <div className="fixed inset-0 z-40 hidden lg:flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowAuditTrail(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Audit Trail</h3>
              <button onClick={() => setShowAuditTrail(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X size={20} className="text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>
            <div className="p-4">
              <AuditTimeline logs={auditLogs} loading={auditLogsLoading} />
            </div>
          </div>
        </div>
      )}

      <ShareLinkDrawer open={showShareDrawer} onClose={() => setShowShareDrawer(false)} sopId={sopId} />
    </>
  );
}
