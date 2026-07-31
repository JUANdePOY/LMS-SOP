import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

function CheckboxList({ items, selectedIds, onToggle, labelKey, valueKey, placeholder, loading = false, emptyText = 'No options' }) {
  const [open, setOpen] = useState(false);
  const selectedCount = selectedIds.length;
  const resolvedLabel = (item) => (typeof labelKey === 'function' ? labelKey(item) : (labelKey ? item[labelKey] : item));
  const resolvedValue = (item) => (typeof valueKey === 'function' ? valueKey(item) : (valueKey ? item[valueKey] : item));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full text-left px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-sm text-[var(--text-primary)] hover:border-[var(--border)] transition-colors flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
      >
        <span className={selectedCount > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
          {selectedCount > 0 ? `${selectedCount} selected` : placeholder}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-sm">
          {loading ? (
            <div className="space-y-1 p-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-md bg-[var(--bg-hover)]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--text-muted)]">{emptyText}</p>
          ) : (
            items.map((item) => {
              const id = resolvedValue(item);
              const label = resolvedLabel(item);
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={typeof id === 'string' || typeof id === 'number' ? id : JSON.stringify(id)}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(id)}
                    className="rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[var(--text-primary)] truncate">{label}</span>
                  {checked && <Check size={14} className="ml-auto text-green-600 flex-shrink-0" />}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default CheckboxList;
