import { useState, useMemo, memo } from 'react';
import { MessageCircle, Reply, Clock, Paperclip, Download } from 'lucide-react';
import CommentInput from './CommentInput';
import UserAvatar from "@/shared/components/ui/Avatar";

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Highlights stored @mentions inside the comment body so the reader can see
// who was pinged. Mentions are matched by display name recorded at send time.
function renderBody(text, mentions) {
  const list = Array.isArray(mentions) ? mentions : [];
  if (list.length === 0 || !text) return text;

  const names = list
    .map((m) => m.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  if (names.length === 0) return text;

  const re = new RegExp(`@(${names.join('|')})`, 'g');
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span
        key={`mention-${key++}`}
        className="rounded bg-[var(--color-primary)]/10 px-1 font-medium text-[var(--color-primary)]"
      >
        {match[0]}
      </span>
    );
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
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

function CommentItem({ comment, currentUser, isReplyTarget, onReply, depth = 0 }) {
  const isOwn = currentUser && comment.user_id === currentUser.id;
  const commenterIsAdmin = comment.user_role && ['super_admin', 'admin', 'department_head'].includes(comment.user_role);

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`} style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <UserAvatar
        user={{
          full_name: comment.user_name,
          avatar_url: comment.user_avatar_url || comment.avatar_url,
        }}
        size="sm"
        className="shrink-0 mt-0.5"
      />
      <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">{comment.user_name}</span>
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
          className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm transition-shadow ${
            isOwn
              ? 'bg-blue-600 text-white rounded-tr-md'
              : 'bg-[var(--bg-page)] border border-[var(--border)] text-[var(--text-secondary)] rounded-tl-md'
          } ${isReplyTarget ? 'ring-2 ring-blue-400/60 ring-offset-1 ring-offset-[var(--bg-page)]' : ''}`}
        >
          <p className="whitespace-pre-wrap break-words">{renderBody(comment.comment, comment.mentions)}</p>

          {Array.isArray(comment.attachments) && comment.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {comment.attachments.map((att) => {
                const isImage = att.mime_type && att.mime_type.startsWith('image/');
                if (isImage) {
                  return (
                    <a
                      key={att.id}
                      href={att.view_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-white/20"
                    >
                      <img
                        src={att.view_url}
                        alt={att.original_name || att.file_name}
                        className="max-h-56 w-auto max-w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  );
                }
                return (
                  <a
                    key={att.id}
                    href={att.view_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                      isOwn
                        ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                        : 'border-[var(--border)] text-[var(--color-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <Paperclip size={13} className="shrink-0" />
                    <span className="truncate">{att.original_name || att.file_name}</span>
                    <Download size={12} className="shrink-0 opacity-70" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onReply(comment)}
          className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
            isReplyTarget ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--color-primary)]'
          } ${isOwn ? 'mr-1' : 'ml-1'}`}
        >
          <Reply size={12} /> {isReplyTarget ? 'Replying…' : 'Reply'}
        </button>
      </div>
    </div>
  );
}

const CommentSection = memo(function CommentSection({
  comments = [],
  currentUser,
  onAddComment,
  canReply = true,
}) {
  const [replyingTo, setReplyingTo] = useState(null); // full comment object, or null

  const grouped = useMemo(() => {
    const topLevel = [];
    const repliesMap = {};

    for (const c of comments) {
      if (!c.parent_id) {
        topLevel.push(c);
      } else {
        if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
        repliesMap[c.parent_id].push(c);
      }
    }

    topLevel.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (const key of Object.keys(repliesMap)) {
      repliesMap[key].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return { topLevel, repliesMap };
  }, [comments]);

  // Every comment (top-level or reply) can be replied to; replies are still filed
  // under the same top-level thread since repliesMap keys off parent_id.
  const allById = useMemo(() => {
    const map = {};
    for (const c of comments) map[c.id] = c;
    return map;
  }, [comments]);

  const handleReply = (comment) => setReplyingTo(comment);
  const handleCancelReply = () => setReplyingTo(null);

  const handleAdd = async (text, parentId, files, mentions) => {
    // If replying, comments should thread under the top-level ancestor.
    let effectiveParentId = parentId;
    if (parentId && allById[parentId]?.parent_id) {
      effectiveParentId = allById[parentId].parent_id;
    }
    await onAddComment(text, effectiveParentId, files, mentions);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-3" style={{ scrollbarGutter: 'stable' }}>
        {grouped.topLevel.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
             <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-hover)]">
               <MessageCircle size={18} className="text-[var(--text-muted)] opacity-70" />
             </div>
             <p className="text-sm text-[var(--text-muted)]">No comments yet.</p>
             <p className="text-xs text-[var(--text-muted)] opacity-70 mt-0.5">Start the conversation below.</p>
           </div>
         )}

        {grouped.topLevel.map((comment) => {
          const replies = grouped.repliesMap[comment.id] || [];
          return (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUser={currentUser}
                isReplyTarget={replyingTo?.id === comment.id}
                onReply={handleReply}
                depth={0}
              />
              {replies.length > 0 && (
                <div className="mt-3 space-y-3 pl-4 border-l-2 border-[var(--border)]">
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUser={currentUser}
                      isReplyTarget={replyingTo?.id === reply.id}
                      onReply={handleReply}
                      depth={1}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canReply && (
        <div className="pt-2 border-t border-[var(--border)]">
          <CommentInput
            onAddComment={handleAdd}
            canComment={canReply}
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
          />
        </div>
      )}
    </div>
  );
});

export default CommentSection;