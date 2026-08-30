import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Click-to-rename text. Renders as a static label until clicked (when editable),
 * then swaps to an input that commits on Enter/blur and cancels on Escape.
 * Clicks are stopped from propagating so row-level handlers (expand, open) don't fire.
 */
export default function InlineEditableName({
  value,
  onCommit,
  canEdit = true,
  className,
  inputClassName,
  ariaLabel,
  renameSignal,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [inputWidth, setInputWidth] = useState(null);
  const inputRef = useRef(null);
  const measureRef = useRef(null);
  const prevSignal = useRef(renameSignal);

  // Size the editing input to its content by measuring an off-screen mirror
  // span that shares the input's typography. Recomputed on every keystroke.
  useLayoutEffect(() => {
    if (editing && measureRef.current) {
      setInputWidth(measureRef.current.offsetWidth + 16); // + horizontal padding/border
    }
  }, [editing, draft]);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  useEffect(() => {
    if (renameSignal !== undefined && renameSignal !== prevSignal.current) {
      prevSignal.current = renameSignal;
      setDraft(value || '');
      setEditing(true);
    }
  }, [renameSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = (e) => {
    if (!canEdit) return;
    e.stopPropagation();
    setDraft(value || '');
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== (value || '')) {
      onCommit?.(next);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value || '');
  };

  if (editing) {
    return (
      <>
        <span
          ref={measureRef}
          aria-hidden="true"
          className={cn('invisible absolute whitespace-pre text-sm', inputClassName)}
        >
          {draft || ' '}
        </span>
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
          style={inputWidth != null ? { width: `${inputWidth}px`, maxWidth: 'min(80vw, 760px)' } : { width: '100%', maxWidth: 'min(80vw, 760px)' }}
          className={cn(
            'relative z-20 rounded border border-[var(--color-primary)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-sm shadow-md outline-none',
            inputClassName
          )}
          aria-label={ariaLabel}
        />
      </>
    );
  }

  return (
    <span
      onClick={start}
      className={cn(canEdit && 'cursor-text hover:underline', className)}
      title={canEdit ? 'Click to rename' : undefined}
    >
      {value}
    </span>
  );
}
