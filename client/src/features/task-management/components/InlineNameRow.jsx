import { useState, useRef, useEffect } from 'react';

/**
 * Inline "add" row: an indented text input that commits on Enter (or blur) and
 * cancels on Escape. Used for quickly creating a business / project / task
 * directly under its parent row without opening a modal.
 */
export default function InlineNameRow({ placeholder, indent = 0, onCommit, onCancel, autoFocus = true }) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const commit = async () => {
    const next = value.trim();
    if (!next) {
      onCancel?.();
      return;
    }
    setSubmitting(true);
    try {
      await onCommit(next);
      setValue('');
    } catch {
      // Parent surfaces its own error toast; keep the row open so the user can retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 border-b border-[var(--border-subtle)]/40 px-2 py-2.5 text-sm h-10"
      style={{ paddingLeft: `${indent + 8}px` }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)] opacity-40" aria-hidden="true" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel?.(); }
        }}
        onBlur={() => { if (value.trim()) commit(); else onCancel?.(); }}
        placeholder={placeholder}
        className="flex-1 rounded border border-[var(--color-primary)] bg-[var(--bg-surface)] px-2 py-1 text-sm outline-none"
      />
      {submitting && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-blue-500" />
      )}
    </div>
  );
}
