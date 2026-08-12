import { useState, memo } from 'react';
import { Send } from 'lucide-react';
import { MAX_COMMENT_LENGTH } from '../constants/taskConstants';

const CommentInput = memo(function CommentInput({ onAddComment, canComment = true }) {
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const remaining = MAX_COMMENT_LENGTH - commentText.length;
  const nearLimit = remaining <= 40;

  const handleAddComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setCommentError(`Comment must not exceed ${MAX_COMMENT_LENGTH} characters`);
      return;
    }
    setCommentError('');
    setSubmitting(true);
    try {
      await onAddComment(trimmed, null);
      setCommentText('');
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div>
      {commentError && <p className="text-xs text-red-500 mb-1.5">{commentError}</p>}
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <textarea
            value={commentText}
            onChange={(e) => { setCommentText(e.target.value); if (commentError) setCommentError(''); }}
            placeholder={canComment ? 'Write a comment...' : 'You cannot comment on this task.'}
            rows={1}
            disabled={!canComment || submitting}
            onKeyDown={handleKeyDown}
            className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-[var(--text-muted)] disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-hidden transition-colors"
          />
          {canComment && commentText.length > 0 && (
            <span className={`absolute bottom-1.5 right-2.5 text-[10px] tabular-nums ${nearLimit ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
              {remaining}
            </span>
          )}
        </div>
        <button
          onClick={handleAddComment}
          disabled={!canComment || submitting || !commentText.trim()}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full border border-[var(--border)] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Send comment"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
});

export default CommentInput;
