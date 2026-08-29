import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskCommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const run = (cmd) => {
    if (!cmd) return;
    onClose();
    cmd.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(filtered[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <Search size={16} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            aria-label="Command palette"
          />
          <kbd className="hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] sm:inline">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No matching commands</p>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(cmd)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2 text-left text-sm',
                    i === active ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  )}
                >
                  {Icon && <Icon size={16} className="shrink-0 text-[var(--text-muted)]" />}
                  <span className="flex-1 truncate">{cmd.label}</span>
                  {cmd.group && <span className="text-[11px] text-[var(--text-muted)]">{cmd.group}</span>}
                  {i === active && <CornerDownLeft size={13} className="text-[var(--text-muted)]" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
