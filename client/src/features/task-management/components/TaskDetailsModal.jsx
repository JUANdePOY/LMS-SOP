import { useState, useEffect } from 'react';
import { Users, MessageSquare, Paperclip, BarChart3, X, Plus, TrendingUp, CalendarDays, Clock, User } from 'lucide-react';
import { useToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskDetails } from '../hooks/useTaskDetails';
import { MAX_ATTACHMENT_SIZE_BYTES, ALLOWED_ATTACHMENT_MIME_TYPES } from '../constants/taskConstants';
import { formatDate, formatDateTime } from '../utils/taskDateUtils';
import AssignmentSection from '../components/AssignmentSection';
import AttachmentSection from '../components/AttachmentSection';
import CommentSection from '../components/CommentSection';
import ProgressModal from '../components/ProgressModal';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import { PRIORITY_STYLES, STATUS_STYLES } from '../constants/taskConstants';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'info', label: 'Info', icon: BarChart3 },
  { id: 'assignments', label: 'Assignments', icon: Users },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
];

const DETAIL_GRID_ITEMS = [
  { label: 'Start', field: 'start_datetime', icon: CalendarDays },
  { label: 'Deadline', field: 'deadline_datetime', icon: CalendarDays },
  { label: 'Est. Hours', field: 'estimated_hours', icon: Clock },
  { label: 'Created By', field: 'created_by_name', icon: User },
];

function StatBadge({ label, value, icon: Icon }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-center min-w-[90px]">
      <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
        {Icon && <Icon size={10} className="opacity-70" />}
        {label}
      </span>
      <span className="text-sm font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function QuickProgressEdit({ task, saving, onUpdateProgress }) {
  const [localRate, setLocalRate] = useState(0);

  const latestProgress = task.progress && task.progress.length > 0 ? task.progress[0] : null;
  const currentRate = latestProgress ? Number(latestProgress.completion_rate) : 0;

  useEffect(() => {
    setLocalRate(currentRate);
  }, [currentRate]);

  const handleChange = (e) => {
    const val = Number(e.target.value);
    setLocalRate(val);
    if (onUpdateProgress) {
      const payload = { task_id: task.id, completion_rate: val };
      if (val === 100) {
        payload.status = 'Completed';
      }
      onUpdateProgress(payload);
    }
  };

  const sliderColor = localRate === 100 ? '#10b981' : '#3b82f6';

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--text-muted)]" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Current Progress</h3>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {task.progress && task.progress.length > 0 ? formatDate(task.progress[0].updated_at) : 'No updates yet'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={localRate}
          onChange={handleChange}
          disabled={saving}
          className="flex-1 h-2 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 appearance-none"
          style={{ background: `linear-gradient(to right, ${sliderColor} ${localRate}%, var(--bg-hover) ${localRate}%)` }}
        />
        <span
          className="text-sm font-semibold tabular-nums w-12 text-right px-1.5 py-0.5 rounded-md"
          style={{ color: sliderColor, backgroundColor: `${sliderColor}1a` }}
        >
          {localRate}%
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] min-h-[1rem]">
        {saving && (
          <span className="flex items-center gap-1.5 text-blue-500">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
            Saving…
          </span>
        )}
      </div>
    </div>
  );
}

export default function TaskDetailsModal({ taskId, open, onClose }) {
  const { isAnyAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const { task, loading, error, saving, load, updateProgress, addComment, uploadFile, removeAttachment } = useTaskDetails(taskId);

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open, load]);

  const [activeTab, setActiveTab] = useState('info');
  const [showProgress, setShowProgress] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingAttachmentId, setPendingAttachmentId] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    const maxSizeMB = (MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)).toFixed(0);

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setUploadError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      e.target.value = '';
      return;
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Allowed: images, PDF, Word, Excel, ZIP.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await uploadFile(task.id, formData);
    } catch (err) {
      toast.error(err.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = (attachmentId) => {
    setPendingAttachmentId(attachmentId);
  };

  const confirmDeleteAttachment = async () => {
    if (pendingAttachmentId == null) return;
    await removeAttachment(task.id, pendingAttachmentId);
  };

  const handleQuickProgress = async (payload) => {
    try {
      await updateProgress(payload);
    } catch {
      // handled in hook
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 flex w-full max-w-4xl max-h-[90vh] min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-[var(--text-primary)] truncate">{task?.title}</h1>
            {task?.description && <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">{task.description}</p>}
            {task && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium', PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium)}>
                  {task.priority}
                </span>
                <span className={cn('inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[task.status] || STATUS_STYLES.Pending)}>
                  {task.status}
                </span>
                {task.category && (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                    {task.category}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border)] overflow-x-hidden px-2 sm:px-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-500" />}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4">
          {loading && !task ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-blue-500" />
              Loading task details…
            </div>
          ) : error && !task ? (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</div>
          ) : !task ? (
            <div className="text-sm text-[var(--text-muted)]">Task not found.</div>
          ) : (
            <>
              {activeTab === 'info' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Description</h3>
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                      {task.description || 'No description provided.'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DETAIL_GRID_ITEMS.map((item) => (
                        <div key={item.field} className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg-hover)]">
                            <item.icon size={13} className="text-[var(--text-muted)]" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[11px] text-[var(--text-muted)]">{item.label}</span>
                            <span className="block font-medium text-[var(--text-secondary)] truncate">
                              {task[item.field] || task[item.field] === 0 ? (
                                item.field === 'start_datetime' || item.field === 'deadline_datetime'
                                  ? formatDateTime(task[item.field])
                                  : task[item.field]
                              ) : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'assignments' && <AssignmentSection assignments={task.assignments} />}

              {activeTab === 'progress' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">Progress Tracking</h3>
                    <button
                      type="button"
                      onClick={() => setShowProgress(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <Plus size={12} /> Update Progress
                    </button>
                  </div>

                  {task.progress && task.progress.length > 0 ? (
                    <div className="space-y-3">
                      <QuickProgressEdit task={task} saving={saving} onUpdateProgress={handleQuickProgress} />

                      <div className="border-t border-[var(--border)] pt-3">
                        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">History</h4>
                        {task.progress.map((p) => {
                          const barColor = Number(p.completion_rate) === 100 ? 'bg-emerald-500' : 'bg-blue-500';
                          return (
                            <div key={p.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 mb-2 last:mb-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium text-[var(--text-primary)]">{p.user_name}</span>
                                <span className="text-xs text-[var(--text-muted)]">{formatDate(p.updated_at)}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                  <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${p.completion_rate}%` }} />
                                </div>
                                <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">{p.completion_rate}%</span>
                              </div>
                              {p.status && (
                                <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] mt-0.5">
                                  Status: <span className="font-medium text-[var(--text-secondary)]">{p.status}</span>
                                </span>
                              )}
                              {p.notes && <p className="text-xs text-[var(--text-secondary)] mt-1.5">{p.notes}</p>}
                              {p.attachments?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {p.attachments.map((att) => (
                                    <a key={att.id} href={att.view_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                      <Paperclip size={10} /> {att.original_name || att.file_name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-hover)]">
                        <TrendingUp size={18} className="text-[var(--text-muted)] opacity-70" />
                      </div>
                      <p className="text-sm text-[var(--text-muted)] mb-3">No progress updates yet.</p>
                      <button
                        type="button"
                        onClick={() => setShowProgress(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-xs font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                      >
                        <Plus size={12} /> Add First Progress Update
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="flex flex-col h-full min-h-0">
                  <CommentSection
                    comments={task.comments}
                    currentUser={currentUser}
                    isAdmin={isAnyAdmin}
                    onAddComment={(comment, parentId) => addComment(task.id, comment, parentId)}
                    canReply
                  />
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  <div>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-page)] px-3.5 py-2 text-xs font-medium cursor-pointer hover:border-blue-400 hover:bg-[var(--bg-hover)] transition-colors">
                      <Paperclip size={14} /> Upload Attachment
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                    {uploading && (
                      <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
                        Uploading…
                      </span>
                    )}
                    {uploadError && <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>}
                  </div>
                  <AttachmentSection attachments={task.attachments} onDelete={handleDeleteAttachment} canManage={isAnyAdmin} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ProgressModal open={showProgress} onClose={() => setShowProgress(false)} onSubmit={updateProgress} saving={saving} taskId={task?.id} initialProgress={task?.progress?.[0]} />

      <ConfirmationDialog
        isOpen={pendingAttachmentId !== null}
        onClose={() => setPendingAttachmentId(null)}
        onConfirm={confirmDeleteAttachment}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment?"
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}