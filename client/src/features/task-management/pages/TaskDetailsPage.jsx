import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, MessageSquare, Paperclip, BarChart3 } from 'lucide-react';
import { useToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskDetails } from '../hooks/useTaskDetails';
import { MAX_ATTACHMENT_SIZE_BYTES, ALLOWED_ATTACHMENT_MIME_TYPES, MAX_COMMENT_LENGTH } from '../constants/taskConstants';
import { formatDate } from '../utils/taskDateUtils';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import AssignmentSection from '../components/AssignmentSection';
import AttachmentSection from '../components/AttachmentSection';
import CommentSection from '../components/CommentSection';
import ProgressModal from '../components/ProgressModal';
import { PRIORITY_STYLES, STATUS_STYLES } from '../constants/taskConstants';

const TABS = [
  { id: 'info', label: 'Info', icon: BarChart3 },
  { id: 'assignments', label: 'Assignments', icon: Users },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
];

export default function TaskDetailsPage() {
  const { id } = useParams();
  const { isAnyAdmin } = useAuth();
  const { toast } = useToast();
  const { task, loading, error, saving, load, updateProgress, addComment, uploadFile, removeAttachment } = useTaskDetails(id);

  useEffect(() => {
    load();
  }, [load]);

  const [activeTab, setActiveTab] = useState('info');
  const [showProgress, setShowProgress] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [pendingAttachmentId, setPendingAttachmentId] = useState(null);

  if (loading && !task) {
    return <div className="text-center py-12 text-sm text-[var(--text-muted)]">Loading task...</div>;
  }

  if (error && !task) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  if (!task) {
    return <div className="text-sm text-[var(--text-muted)]">Task not found.</div>;
  }

  const handleCommentSubmit = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setCommentError(`Comment must not exceed ${MAX_COMMENT_LENGTH} characters`);
      return;
    }
    setCommentError('');
    try {
      await addComment(task.id, trimmed);
      setCommentText('');
    } catch {
      // handled in hook
    }
  };

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
      toast.success('Attachment uploaded successfully');
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
    try {
      await removeAttachment(task.id, pendingAttachmentId);
    } catch {
      // handled in hook
    } finally {
      setPendingAttachmentId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link to="/tasks" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
          <ArrowLeft size={16} /> Back to Tasks
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">{task.title}</h1>
            {task.description && <p className="mt-1 text-sm text-[var(--text-muted)]">{task.description}</p>}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium}`}>{task.priority}</span>
              <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status] || STATUS_STYLES.Pending}`}>{task.status}</span>
              {task.category && <span className="text-xs text-[var(--text-muted)]">{task.category}</span>}
            </div>
          </div>
          <button onClick={() => setShowProgress(true)} className="shrink-0 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-xs font-medium text-white dark:text-neutral-900 hover:bg-neutral-800">
            Update Progress
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><span className="text-[var(--text-muted)]">Start:</span> <span className="font-medium">{formatDate(task.start_datetime)}</span></div>
          <div><span className="text-[var(--text-muted)]">Deadline:</span> <span className="font-medium">{formatDate(task.deadline_datetime)}</span></div>
          <div><span className="text-[var(--text-muted)]">Est. Hours:</span> <span className="font-medium">{task.estimated_hours || '—'}</span></div>
          <div><span className="text-[var(--text-muted)]">Created By:</span> <span className="font-medium">{task.created_by_name || '—'}</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
        <div className="flex border-b border-[var(--border)] overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Description</h3>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[var(--text-muted)]">Priority:</span> <span className="font-medium">{task.priority}</span></div>
                <div><span className="text-[var(--text-muted)]">Status:</span> <span className="font-medium">{task.status}</span></div>
                <div><span className="text-[var(--text-muted)]">Start:</span> <span className="font-medium">{formatDate(task.start_datetime)}</span></div>
                <div><span className="text-[var(--text-muted)]">Deadline:</span> <span className="font-medium">{formatDate(task.deadline_datetime)}</span></div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && <AssignmentSection assignments={task.assignments} />}

          {activeTab === 'progress' && (
            <div className="space-y-3">
              {(task.progress || []).length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No progress updates yet.</p>
              ) : (
                task.progress.map((p) => (
                  <div key={p.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{p.user_name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{formatDate(p.updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.completion_rate}%` }} />
                      </div>
                      <span className="text-xs font-medium">{p.completion_rate}%</span>
                    </div>
                    {p.status && <span className="text-xs text-[var(--text-muted)]">Status: {p.status}</span>}
                    {p.notes && <p className="text-xs text-[var(--text-secondary)] mt-1">{p.notes}</p>}
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
                ))
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <CommentSection comments={task.comments} />
              <div className="flex gap-2">
                <div className="flex-1">
                  <textarea value={commentText} onChange={(e) => { setCommentText(e.target.value); if (commentError) setCommentError(''); }} placeholder="Write a comment..." rows={2} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]" />
                  {commentError && <p className="text-xs text-red-500 mt-1">{commentError}</p>}
                </div>
                <button onClick={handleCommentSubmit} className="shrink-0 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-xs font-medium text-white dark:text-neutral-900 hover:bg-neutral-800">Send</button>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div>
                <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
                  <Paperclip size={14} /> Upload Attachment
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                {uploading && <span className="ml-2 text-xs text-[var(--text-muted)]">Uploading...</span>}
                {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
              </div>
              <AttachmentSection attachments={task.attachments} onDelete={handleDeleteAttachment} canManage={isAnyAdmin} />
            </div>
          )}
        </div>
      </div>

      <ProgressModal open={showProgress} onClose={() => setShowProgress(false)} onSubmit={updateProgress} saving={saving} />

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
