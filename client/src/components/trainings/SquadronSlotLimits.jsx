import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2, Users } from 'lucide-react';
import { searchSquadrons } from '@/services/organizationService';

const inputCls =
  'w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all';

function useDebouncedCallback(fn, delayMs) {
  const ref = useRef(null);
  return useCallback(
    (...args) => {
      if (ref.current) clearTimeout(ref.current);
      ref.current = setTimeout(() => {
        ref.current = null;
        fn(...args);
      }, delayMs);
    },
    [fn, delayMs]
  );
}

function createLocalId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function squadronUsedInOtherBlock(blocks, squadronId, localId) {
  if (!squadronId) return false;
  return blocks.some((block) => block.localId !== localId && block.squadronId === squadronId);
}

export default function SquadronSlotLimits({ blocks, onChange, disabled, error }) {
  const [searchQueries, setSearchQueries] = useState({});
  const [dropdownOptions, setDropdownOptions] = useState({});
  const [activeOption, setActiveOption] = useState({});

  const debouncedSearch = useDebouncedCallback(async (localId, query) => {
    const result = await searchSquadrons(query || '', 50);
    if (result.success) {
      setDropdownOptions((prev) => ({ ...prev, [localId]: result.squadrons || [] }));
      setActiveOption((prev) => ({ ...prev, [localId]: 0 }));
    }
  }, 250);

  useEffect(() => {
    blocks.forEach((block) => {
      if (!block.squadronId && searchQueries[block.localId]) {
        debouncedSearch(block.localId, searchQueries[block.localId]);
      }
    });
  }, [blocks, searchQueries, debouncedSearch]);

  const updateBlock = (localId, patch) => {
    onChange(blocks.map((block) => (block.localId === localId ? { ...block, ...patch } : block)));
  };

  const addBlock = () => {
    onChange([...(blocks || []), { localId: createLocalId(), squadronId: null, squadronName: '', slotLimit: '' }]);
  };

  const removeBlock = (localId) => {
    onChange((blocks || []).filter((block) => block.localId !== localId));
    setSearchQueries((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
    setDropdownOptions((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
    setActiveOption((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  };

  const handleSearchChange = (localId, value) => {
    setSearchQueries((prev) => ({ ...prev, [localId]: value }));
    if (!value) {
      setDropdownOptions((prev) => ({ ...prev, [localId]: [] }));
    } else {
      debouncedSearch(localId, value);
    }
  };

  const selectSquadron = (localId, squadron) => {
    if (squadronUsedInOtherBlock(blocks, squadron.id, localId)) return;
    updateBlock(localId, {
      squadronId: squadron.id,
      squadronName: squadron.name + (squadron.code ? ` (${squadron.code})` : ''),
    });
    setSearchQueries((prev) => ({ ...prev, [localId]: '' }));
    setDropdownOptions((prev) => ({ ...prev, [localId]: [] }));
  };

  const clearSquadron = (localId) => {
    updateBlock(localId, { squadronId: null, squadronName: '' });
  };

  const optionLabel = (squadron) => `${squadron.name}${squadron.code ? ` (${squadron.code})` : ''}`;

  const selectedCount = useMemo(() => (blocks || []).filter((b) => b.squadronId).length, [blocks]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Squadron slot limits</p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Select one or more squadrons and set a slot limit for each.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={addBlock}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500 text-white text-[12px] font-semibold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> Add squadron
        </button>
      </div>

      {(blocks || []).map((block) => {
        const dropdown = dropdownOptions[block.localId] || [];
        return (
          <div key={block.localId} className="p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-100">
                <Users size={16} />
                <span>Squadron</span>
              </div>
              <button
                type="button"
                onClick={() => removeBlock(block.localId)}
                disabled={disabled}
                className="text-neutral-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1.8fr_1fr]">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Select Squadron
                </label>
                {block.squadronId ? (
                  <div className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {block.squadronName}
                    </div>
                    <button
                      type="button"
                      onClick={() => clearSquadron(block.localId)}
                      disabled={disabled}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQueries[block.localId] || ''}
                      onChange={(e) => handleSearchChange(block.localId, e.target.value)}
                      disabled={disabled}
                      className={inputCls}
                      placeholder="Search squadrons..."
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <ChevronDown size={16} className="text-neutral-400" />
                    </div>
                    {dropdown.length > 0 && searchQueries[block.localId] && (
                      <div className="mt-1 max-h-60 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-10">
                        {dropdown.map((squadron, index) => (
                          <button
                            key={squadron.id}
                            type="button"
                            disabled={disabled || squadronUsedInOtherBlock(blocks, squadron.id, block.localId)}
                            onClick={() => selectSquadron(block.localId, squadron)}
                            className={`w-full text-left px-3 py-2 text-sm ${
                              squadronUsedInOtherBlock(blocks, squadron.id, block.localId)
                                ? 'text-neutral-400 cursor-not-allowed'
                                : 'text-neutral-700 dark:text-neutral-100 hover:bg-indigo-50 dark:hover:bg-neutral-800'
                            }`}
                          >
                            {optionLabel(squadron)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Slot limit
                </label>
                <input
                  type="number"
                  min={1}
                  value={block.slotLimit}
                  onChange={(e) => updateBlock(block.localId, { slotLimit: e.target.value })}
                  disabled={disabled}
                  className={inputCls}
                  placeholder="Number of slots"
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        {selectedCount ? `${selectedCount} squadron${selectedCount === 1 ? '' : 's'} selected` : 'No squadrons selected.'}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
