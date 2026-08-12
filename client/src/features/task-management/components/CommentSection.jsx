import { useState, useMemo, memo } from 'react';
import { MessageCircle, Reply, Send, X, Clock } from 'lucide-react';
import { MAX_COMMENT_LENGTH } from '../constants/taskConstants';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CommentItem({ comment, replies, currentUser, isAdmin, onReply, replyingTo, replyText, onReplyTextChange, onReplySubmit, onCancelReply }) {
  const isOwn = currentUser && comment.user_id === currentUser.id;
  const commenterIsAdmin = comment.user_role && ['super_admin', 'admin', 'department_head'].includes(comment.user_role);

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${
          commenterIsAdmin
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-100 dark:border-blue-500/30'
            : 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700'
        }`}
      >
        {getInitials(comment.user_name)}
      </div>
      <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {comment.user_name}
          </span>
          {commenterIsAdmin && (
            <span className="inline-flex items-center rounded-full border border-transparent px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100">
              Admin
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[11px] text-[var(--text-muted)] shrink-0">
            <Clock size={10} className="opacity-60" />
            {formatTime(comment.created_at)}
          </span>
        </div>
        <div
          className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
            isOwn
              ? 'bg-blue-600 text-white rounded-tr-md'
              : 'bg-[var(--bg-page)] border border-[var(--border)] text-[var(--text-secondary)] rounded-tl-md'
          }`}
        >
          {comment.comment}
        </div>

        {!replyingTo && (
          <button
            type="button"
            onClick={() => onReply(comment.id)}
            className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-blue-600 transition-colors ${
              isOwn ? 'mr-1' : 'ml-1'
            }`}
          >
            <Reply size={12} /> Reply
          </button>
        )}

        {replyingTo && (
          <div className={`mt-2 ${isOwn ? 'text-left' : ''}`}>
            <div className="flex items-center gap-2 bg-[var(--bg-page)] border border-[var(--border)] rounded-full px-3 py-1.5 focus-within:border-blue-500 transition-colors">
              <Reply size={14} className="text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                placeholder={`Reply to ${comment.user_name}...`}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                autoFocus
              />
              <button
                type="button"
                onClick={onReplySubmit}
                disabled={!replyText.trim()}
                className="shrink-0 p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Send reply"
              >
                <Send size={13} />
              </button>
              <button
                type="button"
                onClick={onCancelReply}
                className="shrink-0 p-1.5 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Cancel reply"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {replies && replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-[var(--border)]">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                replies={[]}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onReply={onReply}
                replyingTo={replyingTo}
                replyText={replyText}
                onReplyTextChange={onReplyTextChange}
                onReplySubmit={onReplySubmit}
                onCancelReply={onCancelReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CommentSection = memo(function CommentSection({
  comments = [],
  currentUser,
  isAdmin = false,
  onAddComment,
  canReply = true,
}) {
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const grouped = useMemo(() => {
    const topLevel = [];
    const repliesMap = {};

    for (const c of comments) {
      if (!c.parent_id) {
        topLevel.push(c);
      } else {
        if (!repliesMap[c.parent_id]) {
          repliesMap[c.parent_id] = [];
        }
        repliesMap[c.parent_id].push(c);
      }
    }

    topLevel.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (const key of Object.keys(repliesMap)) {
      repliesMap[key].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return { topLevel, repliesMap };
  }, [comments]);

  const handleReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setReplyError(`Reply must not exceed ${MAX_COMMENT_LENGTH} characters`);
      return;
    }
    setReplyError('');
    setSubmitting(true);
    try {
      await onAddComment(trimmed, replyingTo);
      setReplyText('');
      setReplyingTo(null);
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1" style={{ scrollbarGutter: 'stable' }}>
        {grouped.topLevel.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-hover)]">
              <MessageCircle size={18} className="text-[var(--text-muted)] opacity-70" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">No comments yet.</p>
            <p className="text-xs text-[var(--text-muted)] opacity-70 mt-0.5">Start the conversation below.</p>
          </div>
        )}

        {grouped.topLevel.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            replies={grouped.repliesMap[comment.id] || []}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onReply={(commentId) => { setReplyingTo(commentId); setReplyText(''); setReplyError(''); }}
            replyingTo={replyingTo}
            replyText={replyText}
            onReplyTextChange={(text) => { setReplyText(text); if (replyError) setReplyError(''); }}
            onReplySubmit={handleReply}
            onCancelReply={() => { setReplyingTo(null); setReplyText(''); setReplyError(''); }}
          />
        ))}
      </div>
    </div>
  );
});

export default CommentSection;
