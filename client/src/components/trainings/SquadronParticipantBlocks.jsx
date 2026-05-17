import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2, Users, X } from 'lucide-react';
import { searchSquadrons, searchSquadronReservists } from '@/services/organizationService';

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

function formatReservistRow(r) {
  const rank = r.rank ? `${r.rank} ` : '';
  return `${rank}${r.last_name}, ${r.first_name}`;
}

function formatChipLabel(r) {
  const parts = [];
  if (r.rank) parts.push(r.rank);
  parts.push(`${r.last_name}, ${r.first_name}`);
  if (r.service_number) parts.push(r.service_number);
  return parts.join(' · ');
}

function squadronUsedInOtherBlock(blocks, squadronId, localId) {
  if (!squadronId) return null;
  const idx = blocks.findIndex((b) => b.localId !== localId && b.squadronId === squadronId);
  if (idx < 0) return null;
  return idx + 1;
}

function countUniqueReservists(blocks) {
  const ids = new Set();
  for (const b of blocks) {
    for (const r of b.selectedReservists || []) ids.add(r.id);
  }
  return ids.size;
}

function hasDuplicateReservistsAcrossBlocks(blocks) {
  const seen = new Set();
  for (const b of blocks) {
    for (const r of b.selectedReservists || []) {
      if (seen.has(r.id)) return true;
      seen.add(r.id);
    }
  }
  return false;
}

/**
 * @param {{
 *   blocks: Array<{ localId: string, squadronId: number | null, squadronName: string, selectedReservists: Array<{id:number,first_name:string,last_name:string,rank:string,service_number:string}> }>,
 *   onChange: Function,
 *   disabled?: boolean,
 * }} props
 */
export default function SquadronParticipantBlocks({ blocks, onChange, disabled }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [squadEditing, setSquadEditing] = useState({});
  const [squadDropdown, setSquadDropdown] = useState({});
  const [squadSearchQuery, setSquadSearchQuery] = useState({});
  const [memberLists, setMemberLists] = useState({});
  const [memberLoading, setMemberLoading] = useState({});
  const [memberFilter, setMemberFilter] = useState({});
  const [activeSquadOption, setActiveSquadOption] = useState({});

  const reservistCount = countUniqueReservists(blocks);
  const crossBlockDupReservists = hasDuplicateReservistsAcrossBlocks(blocks);

  const summaryLine = useMemo(() => {
    const sq = blocks.filter((b) => b.squadronId).length;
    const parts = [];
    if (sq) parts.push(`${sq} squadron${sq === 1 ? '' : 's'}`);
    if (reservistCount) parts.push(`${reservistCount} reservist${reservistCount === 1 ? '' : 's'}`);
    return parts.length ? `${parts.join(' · ')} selected` : null;
  }, [blocks, reservistCount]);

  const addBlock = () => {
    const localId = `b-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    onChange([
      ...blocks,
      { localId, squadronId: null, squadronName: '', selectedReservists: [] },
    ]);
    setExpandedIds((prev) => new Set([...prev, localId]));
  };

  const updateBlock = (localId, patch) => {
    onChange(blocks.map((b) => (b.localId === localId ? { ...b, ...patch } : b)));
  };

  const removeBlock = (localId) => {
    onChange(blocks.filter((b) => b.localId !== localId));
    setExpandedIds((prev) => {
      const n = new Set(prev);
      n.delete(localId);
      return n;
    });
    const scrub = (setter) =>
      setter((d) => {
        const n = { ...d };
        delete n[localId];
        return n;
      });
    scrub(setSquadEditing);
    scrub(setSquadDropdown);
    scrub(setSquadSearchQuery);
    scrub(setMemberLists);
    scrub(setMemberFilter);
    scrub(setActiveSquadOption);
  };

  const toggleExpanded = (localId) => {
    setExpandedIds((prev) => {
      const n = new Set(prev);
      if (n.has(localId)) n.delete(localId);
      else n.add(localId);
      return n;
    });
  };

  const loadMembers = useCallback(async (localId, squadronId) => {
    if (!squadronId) return;
    setMemberLoading((d) => ({ ...d, [localId]: true }));
    const r = await searchSquadronReservists(squadronId, '', 50);
    setMemberLoading((d) => ({ ...d, [localId]: false }));
    if (r.success) setMemberLists((d) => ({ ...d, [localId]: r.reservists || [] }));
  }, []);

  const debouncedSquadronSearch = useDebouncedCallback(async (localId, q) => {
    const r = await searchSquadrons(q || '', 40);
    if (r.success) {
      setSquadDropdown((d) => ({ ...d, [localId]: r.squadrons || [] }));
      setActiveSquadOption((d) => ({ ...d, [localId]: 0 }));
    }
  }, 300);

  const debouncedMemberSearch = useDebouncedCallback(async (localId, squadronId, q) => {
    if (!squadronId) return;
    setMemberLoading((d) => ({ ...d, [localId]: true }));
    const r = await searchSquadronReservists(squadronId, q || '', 50);
    setMemberLoading((d) => ({ ...d, [localId]: false }));
    if (r.success) setMemberLists((d) => ({ ...d, [localId]: r.reservists || [] }));
  }, 300);

  useEffect(() => {
    if (!blocks.length) return;
    setExpandedIds(new Set(blocks.map((b) => b.localId)));
  }, [blocks.map((b) => b.localId).join('|')]);

  useEffect(() => {
    for (const block of blocks) {
      if (
        block.squadronId &&
        memberLists[block.localId] === undefined &&
        !memberLoading[block.localId]
      ) {
        loadMembers(block.localId, block.squadronId);
      }
    }
  }, [blocks, memberLists, memberLoading, loadMembers]);

  const selectSquadron = (localId, s) => {
    if (squadronUsedInOtherBlock(blocks, s.id, localId)) return;
    updateBlock(localId, {
      squadronId: s.id,
      squadronName: s.name + (s.code ? ` (${s.code})` : ''),
      selectedReservists: [],
    });
    setSquadEditing((d) => ({ ...d, [localId]: false }));
    setSquadDropdown((d) => ({ ...d, [localId]: [] }));
    setSquadSearchQuery((d) => ({ ...d, [localId]: '' }));
    setMemberLists((d) => {
      const n = { ...d };
      delete n[localId];
      return n;
    });
    setMemberFilter((d) => ({ ...d, [localId]: '' }));
    setExpandedIds((prev) => new Set([...prev, localId]));
    loadMembers(localId, s.id);
  };

  const startChangeSquadron = (block) => {
    if (block.selectedReservists.length > 0) {
      const ok = window.confirm(
        'Changing the squadron will clear selected reservists for this block. Continue?'
      );
      if (!ok) return;
    }
    updateBlock(block.localId, {
      squadronId: null,
      squadronName: '',
      selectedReservists: [],
    });
    setSquadEditing((d) => ({ ...d, [block.localId]: true }));
    setMemberLists((d) => {
      const n = { ...d };
      delete n[block.localId];
      return n;
    });
  };

  const toggleReservist = (block, r, checked) => {
    if (checked) {
      if (block.selectedReservists.some((x) => x.id === r.id)) return;
      updateBlock(block.localId, {
        selectedReservists: [
          ...block.selectedReservists,
          {
            id: r.id,
            first_name: r.first_name,
            last_name: r.last_name,
            rank: r.rank,
            service_number: r.service_number,
          },
        ],
      });
    } else {
      updateBlock(block.localId, {
        selectedReservists: block.selectedReservists.filter((x) => x.id !== r.id),
      });
    }
  };

  const selectAllInBlock = (block, list) => {
    const existing = new Map(block.selectedReservists.map((r) => [r.id, r]));
    for (const r of list) {
      if (!existing.has(r.id)) {
        existing.set(r.id, {
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          rank: r.rank,
          service_number: r.service_number,
        });
      }
    }
    updateBlock(block.localId, { selectedReservists: [...existing.values()] });
  };

  const clearBlockSelection = (block) => {
    updateBlock(block.localId, { selectedReservists: [] });
  };

  const handleSquadronListKeyDown = (e, localId, options) => {
    if (!options.length) return;
    const cur = activeSquadOption[localId] ?? 0;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSquadOption((d) => ({
        ...d,
        [localId]: Math.min(cur + 1, options.length - 1),
      }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSquadOption((d) => ({
        ...d,
        [localId]: Math.max(cur - 1, 0),
      }));
    } else if (e.key === 'Enter' && options[cur]) {
      e.preventDefault();
      selectSquadron(localId, options[cur]);
    } else if (e.key === 'Escape') {
      setSquadDropdown((d) => ({ ...d, [localId]: [] }));
    }
  };

  return (
    <div className="space-y-3">
      <SectionHeader summaryLine={summaryLine} disabled={disabled} onAdd={addBlock} />

      {crossBlockDupReservists && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2">
          The same reservist appears in multiple squadrons. They will be saved once per training.
        </p>
      )}

      {blocks.length === 0 ? (
        <EmptyState disabled={disabled} onAdd={addBlock} />
      ) : (
        blocks.map((block, blockIndex) => (
          <SquadronBlock
            key={block.localId}
            block={block}
            blockIndex={blockIndex}
            blocks={blocks}
            disabled={disabled}
            expanded={expandedIds.has(block.localId)}
            onToggle={() => toggleExpanded(block.localId)}
            onRemove={() => removeBlock(block.localId)}
            squadEditing={!!squadEditing[block.localId]}
            squadDropdown={squadDropdown[block.localId] || []}
            squadSearchQuery={squadSearchQuery[block.localId] || ''}
            activeSquadOption={activeSquadOption[block.localId] ?? 0}
            memberList={memberLists[block.localId]}
            memberLoading={!!memberLoading[block.localId]}
            memberFilter={memberFilter[block.localId] || ''}
            onSquadSearchChange={(q) => {
              setSquadSearchQuery((d) => ({ ...d, [block.localId]: q }));
              debouncedSquadronSearch(block.localId, q);
            }}
            onSquadronListKeyDown={(e, opts) => handleSquadronListKeyDown(e, block.localId, opts)}
            onSelectSquadron={(s) => selectSquadron(block.localId, s)}
            onStartChangeSquadron={() => startChangeSquadron(block)}
            onMemberFilterChange={(q) => {
              setMemberFilter((d) => ({ ...d, [block.localId]: q }));
              if (!String(q || '').trim()) {
                loadMembers(block.localId, block.squadronId);
              } else {
                debouncedMemberSearch(block.localId, block.squadronId, q);
              }
            }}
            onToggleReservist={(r, checked) => toggleReservist(block, r, checked)}
            onSelectAll={(list) => selectAllInBlock(block, list)}
            onClear={() => clearBlockSelection(block)}
            updateBlock={(patch) => updateBlock(block.localId, patch)}
          />
        ))
      )}
    </div>
  );
}

function SectionHeader({ summaryLine, disabled, onAdd }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
      <div>
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Target participants</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Optional. Add squadrons and select reservists expected to attend. Leave empty to target all units.
          Attendance is recorded separately.
        </p>
        {summaryLine && (
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">{summaryLine}</p>
        )}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 shrink-0"
      >
        <Plus size={14} aria-hidden /> Add squadron
      </button>
    </div>
  );
}

function EmptyState({ disabled, onAdd }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/30 px-4 py-5 text-center space-y-3">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto">
        <Users size={20} aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">No squadrons targeted</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
          This training is not limited to specific units unless you add squadrons here.
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
      >
        <Plus size={14} aria-hidden /> Add first squadron
      </button>
    </div>
  );
}

function SquadronBlock({
  block,
  blockIndex,
  blocks,
  disabled,
  expanded,
  onToggle,
  onRemove,
  squadEditing,
  squadDropdown,
  squadSearchQuery,
  activeSquadOption,
  memberList,
  memberLoading,
  memberFilter,
  onSquadSearchChange,
  onSquadronListKeyDown,
  onSelectSquadron,
  onStartChangeSquadron,
  onMemberFilterChange,
  onToggleReservist,
  onSelectAll,
  onClear,
}) {
  const showSquadronPicker = !block.squadronId || squadEditing;
  const headerTitle = block.squadronName || `Squadron ${blockIndex + 1}`;
  const selectedCount = block.selectedReservists.length;
  const list = memberList || [];
  const filteredDropdown = squadDropdown.filter(
    (s) => !squadronUsedInOtherBlock(blocks, s.id, block.localId)
  );
  const duplicateSquadronIndex = squadronUsedInOtherBlock(blocks, block.squadronId, block.localId);

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 border-l-4 border-l-indigo-500 bg-neutral-50/50 dark:bg-neutral-900/40 overflow-visible">
      <div className="flex items-center gap-2 px-3 py-2 bg-white/60 dark:bg-neutral-900/60">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 min-w-0 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <ChevronDown
            size={16}
            className={`shrink-0 text-neutral-500 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
            aria-hidden
          />
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
            {headerTitle}
          </span>
          {block.squadronId && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
              · {selectedCount} selected
            </span>
          )}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="shrink-0 p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          title="Remove squadron block"
          aria-label={`Remove ${headerTitle}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-3 border-t border-neutral-200/80 dark:border-neutral-800">
          {showSquadronPicker ? (
            <div className="space-y-1.5 relative z-50">
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">
                Squadron
              </label>
              <input
                type="text"
                role="combobox"
                aria-expanded={filteredDropdown.length > 0}
                aria-autocomplete="list"
                aria-controls={`squad-list-${block.localId}`}
                disabled={disabled}
                placeholder="Search by name or code…"
                value={squadSearchQuery}
                onChange={(e) => onSquadSearchChange(e.target.value)}
                onKeyDown={(e) => onSquadronListKeyDown(e, filteredDropdown)}
                className={inputCls}
              />
              {filteredDropdown.length > 0 && !disabled && (
                <ul
                  id={`squad-list-${block.localId}`}
                  role="listbox"
                  className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg text-sm"
                >
                  {filteredDropdown.map((s, i) => (
                    <li key={s.id} role="option" aria-selected={i === activeSquadOption}>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 ${
                          i === activeSquadOption
                            ? 'bg-indigo-50 dark:bg-indigo-950/50'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                        onClick={() => onSelectSquadron(s)}
                      >
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                        {s.code && <span className="text-neutral-500 text-xs ml-1">{s.code}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1.5 text-xs font-medium text-indigo-900 dark:text-indigo-100">
                {block.squadronName}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={onStartChangeSquadron}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
              >
                Change
              </button>
            </div>
          )}

          {duplicateSquadronIndex && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5">
              This squadron is already added in block {duplicateSquadronIndex}. Remove the duplicate or change
              squadron.
            </p>
          )}

          {block.squadronId && (
            <ReservistChecklistPanel
              block={block}
              disabled={disabled}
              list={list}
              loading={memberLoading}
              filter={memberFilter}
              onFilterChange={onMemberFilterChange}
              onToggle={onToggleReservist}
              onSelectAll={() => onSelectAll(list)}
              onClear={onClear}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReservistChecklistPanel({
  block,
  disabled,
  list,
  loading,
  filter,
  onFilterChange,
  onToggle,
  onSelectAll,
  onClear,
}) {
  const selectedIds = new Set(block.selectedReservists.map((r) => r.id));
  const panelTitle = block.squadronName
    ? `Members in ${block.squadronName.split(' (')[0]}`
    : 'Members';

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/80 p-3 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
          {panelTitle}
          {list.length > 0 && (
            <span className="font-normal text-neutral-500 dark:text-neutral-400"> ({list.length})</span>
          )}
        </p>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            disabled={disabled || !list.length}
            onClick={onSelectAll}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
          >
            Select all
          </button>
          <span className="text-neutral-300 dark:text-neutral-600">|</span>
          <button
            type="button"
            disabled={disabled || !selectedIds.size}
            onClick={onClear}
            className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:underline disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <input
        type="search"
        disabled={disabled}
        placeholder="Filter name, service number, or rank…"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        className={inputCls}
        aria-label="Filter reservists"
      />

      {loading ? (
        <p className="text-xs text-neutral-500 py-3 text-center">Loading members…</p>
      ) : list.length === 0 ? (
        <p className="text-xs text-neutral-500 py-3 text-center">No reservists found for this squadron.</p>
      ) : (
        <ul className="max-h-48 overflow-auto rounded-lg border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
          {list.map((r) => {
            const checked = selectedIds.has(r.id);
            return (
              <li key={r.id}>
                <label className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={checked}
                    onChange={(e) => onToggle(r, e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="flex-1 min-w-0 text-xs">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 block truncate">
                      {formatReservistRow(r)}
                    </span>
                    {r.service_number && (
                      <span className="text-neutral-500 dark:text-neutral-400">{r.service_number}</span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
        Selected: {block.selectedReservists.length}
        {list.length > 0 ? ` of ${list.length}` : ''}
      </p>

      {block.selectedReservists.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
          {block.selectedReservists.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 max-w-full rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-[11px] text-indigo-900 dark:text-indigo-100"
            >
              <span className="truncate">{formatChipLabel(r)}</span>
              <button
                type="button"
                disabled={disabled}
                className="p-0.5 rounded hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 shrink-0"
                aria-label={`Remove ${r.first_name} ${r.last_name} from ${block.squadronName || 'squadron'}`}
                onClick={() => onToggle(r, false)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
