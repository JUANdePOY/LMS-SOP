import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inline "+ Add" affordance that expands into a single-line title input.
 * Enter (or blur with content) commits via `onQuickAdd`; Escape cancels.
 * Renders nothing functional when no `onQuickAdd` is provided.
 */
export default function QuickAddRow({
  onQuickAdd,
  placeholder = 'Add task',
  label = 'Add task',
  indent = 0,
  autoFocus = true,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && autoFocus) inputRef.current?.focus();
  }, [open, autoFocus]);

  if (!onQuickAdd) return null;

  const commit = () => {
    const value = title.trim();
    if (!value) {
      setOpen(false);
      return;
    }
    onQuickAdd(value);
    setTitle('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-1.5 py-0.5 text-left text-sm text-[var(--ppm-text-muted)] hover:text-[var(--ppm-text)] transition-colors',
          className
        )}
        style={indent ? { paddingLeft: indent } : undefined}
      >
        <Plus size={13} />
        {label}
      </button>
    );
  }

  return (
    <div className={cn('flex items-center', className)} style={indent ? { paddingLeft: indent } : undefined}>
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setTitle('');
          }
        }}
        onBlur={() => {
          if (!title.trim()) {
            setOpen(false);
            setTitle('');
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--color-primary)] bg-[var(--ppm-surface)] px-2 py-1.5 text-sm outline-none placeholder:text-[var(--ppm-text-muted)]"
      />
    </div>
  );
}
