import { memo } from 'react';

const CommentSection = memo(function CommentSection({ comments }) {
  if (!comments || comments.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No comments yet.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">{c.user_name}</span>
            <span className="text-xs text-[var(--text-muted)]">{new Date(c.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{c.comment}</p>
        </div>
      ))}
    </div>
  );
});

export default CommentSection;
