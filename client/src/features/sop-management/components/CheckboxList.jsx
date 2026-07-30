import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Check } from 'lucide-react';

function CheckboxList({ items, selectedIds, onToggle, labelKey, valueKey, placeholder }) {
  const [open, setOpen] = useState(false);
  const selectedCount = selectedIds.length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-sm text-[var(--text-primary)] hover:border-[var(--border)] transition-colors flex items-center justify-between"
      >
        <span className={selectedCount > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
          {selectedCount > 0 ? `${selectedCount} selected` : placeholder}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-sm">
          {items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--text-muted)]">No options</p>
          ) : (
            items.map((item) => {
              const id = valueKey ? item[valueKey] : item;
              const label = labelKey ? item[labelKey] : item;
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(id)}
                    className="rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[var(--text-primary)]">{label}</span>
                  {checked && <Check size={14} className="ml-auto text-green-600" />}
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
