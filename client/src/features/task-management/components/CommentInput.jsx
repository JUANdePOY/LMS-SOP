import { useState, useRef, useEffect, memo } from 'react';
import { Send, X, Reply } from 'lucide-react';
import { MAX_COMMENT_LENGTH } from '../constants/taskConstants';

/**
 * Single composer used for both new top-level comments and replies.
 * When `replyingTo` is set, a dismissible "Replying to X" banner is shown
 * and submissions are sent with that comment's id as the parent.
 */
const CommentInput = memo(function CommentInput({
  onAddComment,
  canComment = true,
  replyingTo = null, // { id, user_name } | null
  onCancelReply,
}) {
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const remaining = MAX_COMMENT_LENGTH - commentText.length;
  const nearLimit = remaining <= 40 && remaining >= 0;
  const overLimit = remaining < 0;

  // Auto-grow the textarea as the user types, capped so it doesn't take over the screen.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [commentText]);

  // Jump focus into the field the moment a reply target is chosen.
  useEffect(() => {
    if (replyingTo) textareaRef.current?.focus();
  }, [replyingTo]);

  const handleSubmit = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || submitting) return;
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setCommentError(`Comment must not exceed ${MAX_COMMENT_LENGTH} characters`);
      return;
    }
    setCommentError('');
    setSubmitting(true);
    try {
      await onAddComment(trimmed, replyingTo ? replyingTo.id : null);
      setCommentText('');
      onCancelReply?.();
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && replyingTo) {
      onCancelReply?.();
    }
  };

  return (
    <div>
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 mb-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 animate-in fade-in slide-in-from-bottom-1 duration-150">
          <span className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-200 min-w-0">
            <Reply size={12} className="shrink-0" />
            <span className="truncate">
              Replying to <strong className="font-medium">{replyingTo.user_name}</strong>
            </span>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 p-0.5 rounded-full text-blue-600 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
            aria-label="Cancel reply"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {commentError && <p className="text-xs text-red-500 mb-1.5">{commentError}</p>}

      <div className="flex gap-2 items-center">
         <div className="flex-1 relative overflow-hidden">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => {
              setCommentText(e.target.value);
              if (commentError) setCommentError('');
            }}
            placeholder={
              !canComment
                ? 'You cannot comment on this task.'
                : replyingTo
                ? `Reply to ${replyingTo.user_name}...`
                : 'Write a comment...'
            }
            rows={1}
            disabled={!canComment || submitting}
            onKeyDown={handleKeyDown}
            className="w-full min-h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-3.5 py-2.5 pr-11 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-[var(--text-muted)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
          {canComment && commentText.length > 0 && (
            <span
              className={`absolute bottom-2 right-3 text-[10px] tabular-nums ${
                overLimit ? 'text-red-500' : nearLimit ? 'text-amber-500' : 'text-[var(--text-muted)]'
              }`}
            >
              {remaining}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canComment || submitting || !commentText.trim() || overLimit}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full border border-[var(--border)] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={replyingTo ? 'Send reply' : 'Send comment'}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
});

export default CommentInput;