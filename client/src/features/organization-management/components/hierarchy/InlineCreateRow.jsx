import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

const MAX_NAME_LENGTH = 100;
const DEFAULT_PLACEHOLDER = 'Enter a name…';

/**
 * InlineCreateRow
 *
 * A folder-style inline "new item" row rendered as a nested child of a
 * parent node inside the organization hierarchy tree. The user types a name,
 * then confirms (Enter / Check) or cancels (Esc / X). This replaces the
 * modal-based create Department / Category flows with inline naming.
 *
 * Props:
 *  - icon:        lucide icon used for the item type
 *  - label:       accessible label for the created item (e.g. "Department", "Category")
 *  - defaultValue: pre-filled name
 *  - loading:     submission in progress
 *  - onConfirm(name): called with the trimmed name
 *  - onCancel():      called on cancel / Escape
 */
export default function InlineCreateRow({
  icon: Icon,
  label = 'item',
  defaultValue = 'Untitled',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [name, setName] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    const node = inputRef.current;
    if (node) {
      node.focus();
      node.select();
    }
  }, []);

  const handleNameChange = (event) => {
    setName(event.target.value.slice(0, MAX_NAME_LENGTH));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;
    onConfirm(trimmed);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  const isConfirmedDisabled = !name.trim() || loading;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-1 py-1.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/10">
        {Icon ? <Icon className="h-3.5 w-3.5 text-indigo-500" /> : null}
      </span>

      <input
        ref={inputRef}
        value={name}
        onChange={handleNameChange}
        onKeyDown={handleKeyDown}
        disabled={loading}
        maxLength={MAX_NAME_LENGTH}
        aria-label={`${label} name`}
        placeholder={DEFAULT_PLACEHOLDER}
        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 placeholder:text-[var(--text-muted)]"
      />

      <button
        type="submit"
        disabled={isConfirmedDisabled}
        className="rounded-md p-1 text-emerald-600 opacity-60 transition-colors hover:opacity-100 hover:bg-emerald-500/10 disabled:opacity-50"
        aria-label={`Create ${label}`}
        title={`Create ${label}`}
      >
        <Check className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
        aria-label={`Cancel ${label} creation`}
        title="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}
