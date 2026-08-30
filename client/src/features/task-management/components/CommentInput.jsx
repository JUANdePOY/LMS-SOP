import { memo, useCallback } from 'react';
import RichComposer from './RichComposer';
import { MAX_COMMENT_LENGTH } from '../constants/taskConstants';
import { getUsers } from '@/services/api';

/**
 * Task comment composer. Delegates the rich editing experience (emoji,
 * @mentions, file attachments) to the shared <RichComposer/> so the same UX
 * is reused by the chat messenger. Mentions are forwarded to the parent so
 * they can be persisted with the comment.
 */
const CommentInput = memo(function CommentInput({
  onAddComment,
  canComment = true,
  replyingTo = null, // { id, user_name } | null
  onCancelReply,
}) {
  const mentionSearch = useCallback(async (q) => {
    const res = await getUsers({ search: q || '', limit: 8, page: 1 });
    const payload = res?.data?.data;
    const rows = Array.isArray(payload) ? payload : payload?.rows;
    return Array.isArray(rows) ? rows : [];
  }, []);

  return (
    <RichComposer
      disabled={!canComment}
      placeholder={replyingTo ? `Reply to ${replyingTo.user_name}...` : 'Write a comment... use @ to mention'}
      replyingTo={replyingTo}
      onCancelReply={onCancelReply}
      mentionSearch={mentionSearch}
      maxLength={MAX_COMMENT_LENGTH}
      onSend={({ text, mentions, files }) => onAddComment(text, replyingTo?.id ?? null, files, mentions)}
    />
  );
});

export default CommentInput;
