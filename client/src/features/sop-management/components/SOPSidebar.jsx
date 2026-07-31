import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import ApprovalPanel from '@/features/sop-management/components/ApprovalPanel';
import VersionTimeline from '@/features/sop-management/components/VersionTimeline';
import AuditTimeline from '@/features/sop-management/components/AuditTimeline';
import { useVersions } from '@/features/sop-management/hooks/useVersions';
import api from '@/lib/api';

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

export default function SOPSidebar({ sopId, approvals, setApprovals, auditLogs, versions, versionsLoading, versionsError, onVersionRestore }) {
  const [showVersionTimeline, setShowVersionTimeline] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  return (
    <>
      <SidebarCard title="Approvals">
        <ApprovalPanel
          approvals={approvals}
          onApprove={async (id) => {
            await api.post(`/sops/approvals/${id}/approve`);
            const { data } = await api.get(`/sops/${sopId}/approvals`);
            setApprovals(data?.data || []);
          }}
          onReject={async (id) => {
            await api.post(`/sops/approvals/${id}/reject`, { comments: 'Rejected by reviewer' });
            const { data } = await api.get(`/sops/${sopId}/approvals`);
            setApprovals(data?.data || []);
          }}
        />
      </SidebarCard>
      <SidebarCard title="Version History">
        <button onClick={() => { setShowVersionTimeline(true); }} className="w-full text-left text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
          View All Versions
        </button>
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
              <VersionTimeline versions={versions} onRestore={onVersionRestore} />
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
              <AuditTimeline logs={auditLogs} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
