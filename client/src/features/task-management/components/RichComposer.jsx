import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Reply, Smile, AtSign, Paperclip, Loader2 } from 'lucide-react';

// Curated emoji set — keeps the bundle dependency-free while covering the
// common reactions people reach for in a work chat.
const EMOJI_SET = [
  '😀','😁','😂','🤣','😊','😍','😎','🤔','🙂','😉','😢','😭','😡','👍','👎','👏',
  '🙏','💪','🎉','🔥','✅','❌','⚠️','💡','📌','👀','💯','🚀','✨','❤️','🧠','⏰',
  '📝','📎','📁','📷','🐱','🐶','🌟','💼','🤝','👋','😴','🥳','😅','🤩','🙌','💬',
];

/**
 * Reusable rich-text composer used by both task comments and chat messages.
 * Supports three productivity additions on top of plain text:
 *  - @mentions (searchable via the injected `mentionSearch` prop)
 *  - inline file/image attachments
 *  - an emoji picker
 *
 * Emits a single `onSend({ text, mentions, files })` payload on submit.
 */
export default function RichComposer({
  onSend,
  disabled = false,
  placeholder = 'Type a message…',
  replyingTo = null,
  onCancelReply,
  mentionSearch,
  maxLength = 0,
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null); // null = closed
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [activeMention, setActiveMention] = useState(0);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mentionFetchTimer = useRef(null);
  const objectUrls = useRef([]);

  const mentionsRef = useRef([]);
  const mentions = mentionsRef.current;

  const remaining = maxLength > 0 ? maxLength - text.length : 0;
  const overLimit = maxLength > 0 && remaining < 0;
  const canSubmit = !disabled && !submitting && !overLimit && (text.trim().length > 0 || pendingFiles.length > 0);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (replyingTo) textareaRef.current?.focus();
  }, [replyingTo]);

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const fetchMentions = useCallback(async (q) => {
    if (typeof mentionSearch !== 'function') {
      setMentionResults([]);
      return;
    }
    setMentionLoading(true);
    try {
      const rows = await mentionSearch(q || '');
      setMentionResults(Array.isArray(rows) ? rows : []);
    } catch {
      setMentionResults([]);
    } finally {
      setMentionLoading(false);
    }
  }, [mentionSearch]);

  useEffect(() => {
    if (mentionQuery === null) return undefined;
    if (mentionFetchTimer.current) clearTimeout(mentionFetchTimer.current);
    mentionFetchTimer.current = setTimeout(() => {
      fetchMentions(mentionQuery);
      setActiveMention(0);
    }, 200);
    return () => {
      if (mentionFetchTimer.current) clearTimeout(mentionFetchTimer.current);
    };
  }, [mentionQuery, fetchMentions]);

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
    const caret = e.target.selectionStart;
    const before = value.slice(0, caret);
    const match = /@([^\s@]*)$/.exec(before);
    if (match) {
      setMentionStart(caret - match[0].length);
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (user) => {
    const caret = textareaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart);
    const after = text.slice(caret);
    const insert = `@${user.full_name} `;
    const next = before + insert + after;
    setText(next);
    if (!mentions.some((m) => m.id === user.id)) {
      mentions.push({ id: user.id, name: user.full_name });
    }
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = before.length + insert.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  };

  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? text.length;
    const next = text.slice(0, caret) + emoji + text.slice(caret);
    setText(next);
    requestAnimationFrame(() => {
      const pos = caret + emoji.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const mapped = files.map((f) => {
      const isImage = f.type.startsWith('image/');
      const url = isImage ? URL.createObjectURL(f) : null;
      if (url) objectUrls.current.push(url);
      return { file: f, name: f.name, size: f.size, type: f.type, url, isImage };
    });
    setPendingFiles((prev) => [...prev, ...mapped]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setPendingFiles((prev) => {
      const target = prev[index];
      if (target?.url) URL.revokeObjectURL(target.url);
      objectUrls.current = objectUrls.current.filter((u) => u !== target?.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if ((!trimmed && pendingFiles.length === 0) || submitting) return;
    if (maxLength > 0 && trimmed.length > maxLength) return;
    setSubmitting(true);
    try {
      await onSend({
        text: trimmed,
        mentions: [...mentions],
        files: pendingFiles.map((p) => p.file),
      });
      setText('');
      mentionsRef.current = [];
      setPendingFiles((prev) => {
        prev.forEach((p) => p.url && URL.revokeObjectURL(p.url));
        return [];
      });
      objectUrls.current = [];
      setMentionQuery(null);
      setEmojiOpen(false);
      onCancelReply?.();
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveMention((i) => (i + 1) % mentionResults.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveMention((i) => (i - 1 + mentionResults.length) % mentionResults.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionResults[activeMention]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && replyingTo) {
      onCancelReply?.();
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="relative">
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 mb-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/10 dark:bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 dark:border-[var(--color-primary)]/20">
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] dark:text-[var(--color-primary)] min-w-0">
            <Reply size={12} className="shrink-0" />
            <span className="truncate">
              Replying to <strong className="font-medium">{replyingTo.user_name}</strong>
            </span>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 p-0.5 rounded-full text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 dark:hover:bg-[var(--color-primary)]/10 transition-colors"
            aria-label="Cancel reply"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingFiles.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="relative flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5 max-w-[12rem]"
            >
              {p.isImage && p.url ? (
                <img src={p.url} alt={p.name} className="h-9 w-9 rounded object-cover shrink-0" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-neutral-200 dark:bg-neutral-700 text-[var(--text-muted)]">
                  <Paperclip size={14} />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{formatSize(p.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-600 text-white hover:bg-red-500 transition-colors"
                aria-label={`Remove ${p.name}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-2 pt-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled || submitting}
            className="w-full min-h-10 bg-transparent px-1.5 py-2 text-sm outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />

          {mentionQuery !== null && (
            <div className="absolute bottom-full left-0 mb-2 w-64 max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg z-20">
              {mentionLoading && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-muted)]">
                  <Loader2 size={12} className="animate-spin" /> Searching…
                </div>
              )}
              {!mentionLoading && mentionResults.length === 0 && (
                <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No people found</div>
              )}
              {mentionResults.map((u, i) => (
                <button
                  key={u.id}
                  type="button"
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    insertMention(u);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    i === activeMention ? 'bg-[var(--color-primary)]/10' : 'hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-[11px] font-medium text-[var(--text-secondary)]">
                    {(u.full_name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-[var(--text-primary)]">{u.full_name}</span>
                    {u.role && <span className="block truncate text-[10px] text-[var(--text-muted)]">{u.role.replace(/_/g, ' ')}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {emojiOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg p-2 z-20">
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {EMOJI_SET.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      insertEmoji(emoji);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-[var(--bg-hover)] transition-colors"
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pb-1.5 pt-1">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              disabled={disabled}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                emojiOpen ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
              } disabled:opacity-40`}
              aria-label="Insert emoji"
              title="Emoji"
            >
              <Smile size={17} />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
              aria-label="Attach file"
              title="Attach file or image"
            >
              <Paperclip size={17} />
            </button>
            <button
              type="button"
              onClick={() => {
                const caret = textareaRef.current?.selectionStart ?? text.length;
                setText((t) => t.slice(0, caret) + '@' + t.slice(caret));
                setMentionQuery('');
                textareaRef.current?.focus();
              }}
              disabled={disabled}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
              aria-label="Mention someone"
              title="Mention"
            >
              <AtSign size={17} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              className="hidden"
              onChange={handleFiles}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      {maxLength > 0 && text.length > 0 && (
        <div className="mt-1 text-right">
          <span
            className={`text-[10px] tabular-nums ${
              overLimit ? 'text-red-500' : remaining <= 40 ? 'text-amber-500' : 'text-[var(--text-muted)]'
            }`}
          >
            {remaining}
          </span>
        </div>
      )}
    </div>
  );
}
