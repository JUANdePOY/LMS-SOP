import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Upload, Trash2, FileText, Image, File, ChevronDown, Users, ClipboardList } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createReport, updateReport, uploadDocumentation } from '@/services/reportsService';
import { getTrainings, getExternalTrainings } from '@/services/trainingsService';
import { searchSquadrons, searchSquadronReservists } from '@/services/organizationService';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all';

const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png';
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_MB = 10;

const str = (v) => (v == null ? '' : String(v));

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

function countUniqueReservists(blocks) {
  const ids = new Set();
  for (const b of blocks) {
    for (const r of b.selectedReservists || []) ids.add(r.id);
  }
  return ids.size;
}

function FormGroup({ label, required, hint, children, error }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function DocumentationUpload({ files, onFilesChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');

  const processFiles = (incoming) => {
    setFileError('');
    const valid = [];
    for (const f of incoming) {
      if (!ACCEPTED_MIME.includes(f.type)) {
        setFileError('Only PDF, JPEG, and PNG files are accepted.');
        continue;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setFileError(`File must be under ${MAX_FILE_MB}MB.`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length) onFilesChange([...files, ...valid]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) processFiles(dropped);
  };

  const removeFile = (idx) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  const getFileIcon = (f) => {
    if (f.type === 'application/pdf') return <FileText size={16} className="text-red-500" />;
    if (f.type.startsWith('image/')) return <Image size={16} className="text-indigo-500" />;
    return <File size={16} className="text-blue-500" />;
  };

  const formatSize = (bytes) => {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Documentations
        </label>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
          PDF, JPG, PNG — max {MAX_FILE_MB}MB each
        </span>
      </div>

      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 flex items-center justify-center shrink-0">
                {getFileIcon(f)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{f.name}</p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">{formatSize(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-lg border-2 border-dashed cursor-pointer transition-all',
          dragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/5 dark:border-indigo-500'
            : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
        )}
      >
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
          dragOver ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-neutral-100 dark:bg-neutral-800'
        )}>
          <Upload size={16} className={dragOver ? 'text-indigo-500' : 'text-neutral-400 dark:text-neutral-500'} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            {dragOver ? 'Drop to attach' : 'Upload documentation photos / files'}
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            Drag & drop or{' '}
            <span className="text-indigo-500 dark:text-indigo-400 font-semibold">browse files</span>
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        multiple
        onChange={(e) => { processFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
      />
      {fileError && <p className="mt-1 text-xs text-red-500">{fileError}</p>}
    </div>
  );
}

function SquadronParticipantBlocks({ blocks, onChange, disabled }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [squadEditing, setSquadEditing] = useState({});
  const [squadDropdown, setSquadDropdown] = useState({});
  const [squadSearchQuery, setSquadSearchQuery] = useState({});
  const [memberLists, setMemberLists] = useState({});
  const [memberLoading, setMemberLoading] = useState({});
  const [memberFilter, setMemberFilter] = useState({});
  const [activeSquadOption, setActiveSquadOption] = useState({});

  const reservistCount = countUniqueReservists(blocks);

  const summaryLine = useMemo(() => {
    const sq = blocks.filter((b) => b.squadronId).length;
    const parts = [];
    if (sq) parts.push(`${sq} squadron${sq === 1 ? '' : 's'}`);
    if (reservistCount) parts.push(`${reservistCount} participant${reservistCount === 1 ? '' : 's'}`);
    return parts.length ? `${parts.join(' · ')} selected` : null;
  }, [blocks, reservistCount]);

  const addBlock = () => {
    const localId = `b-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    onChange([...blocks, { localId, squadronId: null, squadronName: '', selectedReservists: [] }]);
    setExpandedIds((prev) => new Set([...prev, localId]));
  };

  const updateBlock = (localId, patch) => {
    onChange(blocks.map((b) => (b.localId === localId ? { ...b, ...patch } : b)));
  };

  const removeBlock = (localId) => {
    onChange(blocks.filter((b) => b.localId !== localId));
    setExpandedIds((prev) => { const n = new Set(prev); n.delete(localId); return n; });
    const scrub = (setter) => setter((d) => { const n = { ...d }; delete n[localId]; return n; });
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
      if (n.has(localId)) n.delete(localId); else n.add(localId);
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
      if (block.squadronId && memberLists[block.localId] === undefined && !memberLoading[block.localId]) {
        loadMembers(block.localId, block.squadronId);
      }
    }
  }, [blocks, memberLists, memberLoading, loadMembers]);

  const selectSquadron = (localId, s) => {
    updateBlock(localId, { squadronId: s.id, squadronName: s.name + (s.code ? ` (${s.code})` : ''), selectedReservists: [] });
    setSquadEditing((d) => ({ ...d, [localId]: false }));
    setSquadDropdown((d) => ({ ...d, [localId]: [] }));
    setSquadSearchQuery((d) => ({ ...d, [localId]: '' }));
    setMemberLists((d) => { const n = { ...d }; delete n[localId]; return n; });
    setMemberFilter((d) => ({ ...d, [localId]: '' }));
    setExpandedIds((prev) => new Set([...prev, localId]));
    loadMembers(localId, s.id);
  };

  const startChangeSquadron = (block) => {
    if (block.selectedReservists.length > 0) {
      const ok = window.confirm('Changing the squadron will clear selected participants for this block. Continue?');
      if (!ok) return;
    }
    updateBlock(block.localId, { squadronId: null, squadronName: '', selectedReservists: [] });
    setSquadEditing((d) => ({ ...d, [block.localId]: true }));
    setMemberLists((d) => { const n = { ...d }; delete n[block.localId]; return n; });
  };

  const toggleReservist = (block, r, checked) => {
    if (checked) {
      if (block.selectedReservists.some((x) => x.id === r.id)) return;
      updateBlock(block.localId, {
        selectedReservists: [...block.selectedReservists, {
          id: r.id, first_name: r.first_name, last_name: r.last_name, rank: r.rank, service_number: r.service_number,
        }],
      });
    } else {
      updateBlock(block.localId, { selectedReservists: block.selectedReservists.filter((x) => x.id !== r.id) });
    }
  };

  const selectAllInBlock = (block, list) => {
    const existing = new Map(block.selectedReservists.map((r) => [r.id, r]));
    for (const r of list) {
      if (!existing.has(r.id)) {
        existing.set(r.id, { id: r.id, first_name: r.first_name, last_name: r.last_name, rank: r.rank, service_number: r.service_number });
      }
    }
    updateBlock(block.localId, { selectedReservists: [...existing.values()] });
  };

  const clearBlockSelection = (block) => {
    updateBlock(block.localId, { selectedReservists: [] });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Participants</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Add squadrons and select participants who attended the event.
          </p>
          {summaryLine && (
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">{summaryLine}</p>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={addBlock}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 shrink-0"
        >
          <Users size={14} /> Add squadron
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/30 px-4 py-5 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto">
            <Users size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">No participants added</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              Add squadrons and select the reservists who attended this event.
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={addBlock}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            <Users size={14} /> Add first squadron
          </button>
        </div>
      ) : (
        blocks.map((block, blockIndex) => (
          <SquadronBlock
            key={block.localId}
            block={block}
            blockIndex={blockIndex}
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
          />
        ))
      )}
    </div>
  );
}

function SquadronBlock({
  block, blockIndex, disabled, expanded, onToggle, onRemove,
  squadEditing, squadDropdown, squadSearchQuery, activeSquadOption,
  memberList, memberLoading, memberFilter,
  onSquadSearchChange, onSelectSquadron, onStartChangeSquadron,
  onMemberFilterChange, onToggleReservist, onSelectAll, onClear,
}) {
  const showSquadronPicker = !block.squadronId || squadEditing;
  const headerTitle = block.squadronName || `Squadron ${blockIndex + 1}`;
  const selectedCount = block.selectedReservists.length;
  const list = memberList || [];

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 border-l-4 border-l-indigo-500 bg-neutral-50/50 dark:bg-neutral-900/40 overflow-visible">
      <div className="flex items-center gap-2 px-3 py-2 bg-white/60 dark:bg-neutral-900/60">
        <button type="button" onClick={onToggle} className="flex flex-1 min-w-0 items-center gap-2 text-left" aria-expanded={expanded}>
          <ChevronDown size={16} className={cn('shrink-0 text-neutral-500 transition-transform', expanded ? 'rotate-0' : '-rotate-90')} />
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{headerTitle}</span>
          {block.squadronId && <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">· {selectedCount} selected</span>}
        </button>
        <button type="button" disabled={disabled} onClick={onRemove} className="shrink-0 p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
          <Trash2 size={16} />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-3 border-t border-neutral-200/80 dark:border-neutral-800">
          {showSquadronPicker ? (
            <div className="space-y-1.5 relative z-50">
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Squadron</label>
              <input
                type="text" role="combobox" disabled={disabled}
                placeholder="Search by name or code…"
                value={squadSearchQuery}
                onChange={(e) => onSquadSearchChange(e.target.value)}
                className={inputCls}
              />
              {squadDropdown.length > 0 && !disabled && (
                <ul className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg text-sm">
                  {squadDropdown.map((s, i) => (
                    <li key={s.id}>
                      <button type="button" className={cn('w-full text-left px-3 py-2', i === activeSquadOption ? 'bg-indigo-50 dark:bg-indigo-950/50' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800')} onClick={() => onSelectSquadron(s)}>
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
              <button type="button" disabled={disabled} onClick={onStartChangeSquadron} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50">
                Change
              </button>
            </div>
          )}

          {block.squadronId && (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/80 p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Members {list.length > 0 && <span className="font-normal text-neutral-500 dark:text-neutral-400">({list.length})</span>}
                </p>
                <div className="flex gap-1.5 shrink-0">
                  <button type="button" disabled={disabled || !list.length} onClick={() => onSelectAll(list)} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50">Select all</button>
                  <span className="text-neutral-300 dark:text-neutral-600">|</span>
                  <button type="button" disabled={disabled || !block.selectedReservists.length} onClick={onClear} className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:underline disabled:opacity-50">Clear</button>
                </div>
              </div>
              <input type="search" disabled={disabled} placeholder="Filter name, service number, or rank…" value={memberFilter} onChange={(e) => onMemberFilterChange(e.target.value)} className={inputCls} />
              {memberLoading ? (
                <p className="text-xs text-neutral-500 py-3 text-center">Loading members…</p>
              ) : list.length === 0 ? (
                <p className="text-xs text-neutral-500 py-3 text-center">No reservists found for this squadron.</p>
              ) : (
                <ul className="max-h-48 overflow-auto rounded-lg border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {list.map((r) => {
                    const checked = block.selectedReservists.some((x) => x.id === r.id);
                    return (
                      <li key={r.id}>
                        <label className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <input type="checkbox" disabled={disabled} checked={checked} onChange={(e) => onToggleReservist(r, e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="flex-1 min-w-0 text-xs">
                            <span className="font-medium text-neutral-900 dark:text-neutral-100 block truncate">{formatReservistRow(r)}</span>
                            {r.service_number && <span className="text-neutral-500 dark:text-neutral-400">{r.service_number}</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Selected: {block.selectedReservists.length}{list.length > 0 ? ` of ${list.length}` : ''}
              </p>
              {block.selectedReservists.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  {block.selectedReservists.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1 max-w-full rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-[11px] text-indigo-900 dark:text-indigo-100">
                      <span className="truncate">{formatChipLabel(r)}</span>
                      <button type="button" disabled={disabled} className="p-0.5 rounded hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 shrink-0" onClick={() => onToggleReservist(r, false)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportForm({ report, onClose, onSubmit }) {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const eventDropdownRef = useRef(null);

  const [form, setForm] = useState({
    title: str(report?.title || ''),
    event_type: report?.event_type || 'internal',
    event_source_id: report?.event_source_id ? String(report.event_source_id) : '',
    event_date: str(report?.event_date || ''),
    summary: str(report?.summary || ''),
    type: report?.type || 'custom',
    format: report?.format || 'pdf',
    participantBlocks: [],
    documentationFiles: [],
  });

  useEffect(() => {
    if (report?.participants && report.participants.length > 0) {
      const blockMap = new Map();
      for (const p of report.participants) {
        const sid = p.squadron_id;
        if (!blockMap.has(sid)) {
          blockMap.set(sid, {
            localId: `h-${sid}-${Math.random().toString(36).slice(2)}`,
            squadronId: sid,
            squadronName: p.squadron_name || '',
            selectedReservists: [],
          });
        }
        blockMap.get(sid).selectedReservists.push({
          id: p.reservist_id,
          first_name: p.first_name,
          last_name: p.last_name,
          rank: p.rank,
          service_number: p.service_number,
        });
      }
      setForm((prev) => ({ ...prev, participantBlocks: Array.from(blockMap.values()) }));
    }
  }, [report]);

  useEffect(() => {
    setEventsLoading(true);
    Promise.all([
      getTrainings({ status: 'completed', limit: 100 }),
      getExternalTrainings({ status: 'completed', limit: 100 }),
    ]).then(([internalRes, externalRes]) => {
      const internalEvents = (internalRes?.data?.trainings || []).map((t) => ({
        ...t,
        _source: 'internal',
        displayTitle: t.title,
        displayDate: t.start_datetime || t.start_date,
      }));
      const externalEvents = (externalRes?.data?.trainings || []).map((t) => ({
        ...t,
        _source: 'external',
        displayTitle: t.title,
        displayDate: t.start_date || t.start_datetime,
      }));
      const all = [...internalEvents, ...externalEvents].sort((a, b) => {
        const da = new Date(a.displayDate || 0);
        const db = new Date(b.displayDate || 0);
        return db - da;
      });
      setEvents(all);
    }).catch(() => {
      addToast('Failed to load events', 'error');
    }).finally(() => {
      setEventsLoading(false);
    });
  }, []);

  const activeQuery = (eventSearch || form.title || '').trim().toLowerCase();
  const filteredEvents = activeQuery
    ? events.filter((e) => e.displayTitle.toLowerCase().includes(activeQuery))
    : [];

  const selectedEvent = form.event_source_id
    ? events.find((e) => String(e.id) === String(form.event_source_id) && e._source === form.event_type)
    : null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleEventSelect = (evt) => {
    setForm((prev) => ({
      ...prev,
      event_type: evt._source,
      event_source_id: String(evt.id),
      event_date: evt.displayDate ? String(evt.displayDate).slice(0, 10) : prev.event_date,
      title: evt.displayTitle,
    }));
    setEventSearch(evt.displayTitle);
    setShowEventDropdown(false);
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Event name is required.';
    if (!form.event_type) errs.event_type = 'Event type is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const participants = form.participantBlocks
        .filter((b) => b.squadronId && (b.selectedReservists?.length ?? 0) > 0)
        .flatMap((b) =>
          b.selectedReservists.map((r) => ({
            reservist_id: r.id,
            squadron_id: Number(b.squadronId),
            attendance_status: 'present',
          }))
        );

      const payload = {
        title: form.title.trim(),
        event_type: form.event_type,
        event_source_id: form.event_source_id ? Number(form.event_source_id) : null,
        event_date: form.event_date || null,
        summary: form.summary.trim() || null,
        type: form.type,
        format: form.format,
        participants,
      };

      let result;
      if (report?.id) {
        result = await updateReport(report.id, payload);
      } else {
        result = await createReport(payload);
      }

      if (!result?.success) {
        setErrors({ submit: result?.message || 'Failed to save report.' });
        return;
      }

      const reportId = result.data?.id ?? report?.id;

      if (form.documentationFiles.length > 0 && reportId) {
        for (const file of form.documentationFiles) {
          const uploadResult = await uploadDocumentation(reportId, file);
          if (!uploadResult?.success) {
            addToast(`Failed to upload ${file.name}`, 'warning');
          }
        }
      }

      addToast(report ? 'Report updated successfully' : 'Report created successfully', 'success');
      onSubmit?.();
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'Failed to save report.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
              {report ? 'Edit Report' : 'Create Report'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              {report ? 'Update the report details below.' : 'Summarize a completed training or event.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <FormGroup label="Event Name" required error={errors.title}>
              <div className="relative" ref={eventDropdownRef}>
                <input
                  type="text"
                  role="combobox"
                  aria-expanded={showEventDropdown && activeQuery.length > 0}
                  value={form.title}
                  onChange={(e) => {
                    handleChange('title', e.target.value);
                    setEventSearch(e.target.value);
                    setShowEventDropdown(true);
                  }}
                  onFocus={() => {
                    if (activeQuery.length > 0) setShowEventDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowEventDropdown(false), 150)}
                  className={inputCls}
                  placeholder="Search completed events or enter a custom title..."
                />
                {showEventDropdown && activeQuery.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg text-sm">
                    {eventsLoading ? (
                      <p className="px-3 py-2 text-xs text-neutral-500">Loading events...</p>
                    ) : filteredEvents.filter((e) => e._source === form.event_type).length === 0 ? (
                      <p className="px-3 py-2 text-xs text-neutral-500">No completed events found.</p>
                    ) : (
                      filteredEvents
                        .filter((e) => e._source === form.event_type)
                        .map((evt) => (
                          <button
                            key={`name-${evt._source}-${evt.id}`}
                            type="button"
                            className={cn(
                              'w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                              String(evt.id) === String(form.event_source_id) && evt._source === form.event_type && 'bg-indigo-50 dark:bg-indigo-950/50'
                            )}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleEventSelect(evt)}
                          >
                            <span className="font-medium text-neutral-900 dark:text-neutral-100 block">{evt.displayTitle}</span>
                            {evt.displayDate && (
                              <span className="text-neutral-500 text-xs">{new Date(evt.displayDate).toLocaleDateString()}</span>
                            )}
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>
            </FormGroup>

            <FormGroup label="Event Source" hint="Select a completed training or event">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('event_type', 'internal')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                      form.event_type === 'internal'
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    )}
                  >
                    Internal Training
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('event_type', 'external')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                      form.event_type === 'external'
                        ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    )}
                  >
                    External Training
                  </button>
                </div>

                {selectedEvent && (
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <ClipboardList size={14} className="text-indigo-500 shrink-0" />
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 truncate">{selectedEvent.displayTitle}</span>
                    <button
                      type="button"
                      onClick={() => { handleChange('event_source_id', ''); handleChange('event_date', ''); }}
                      className="ml-auto p-0.5 rounded hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 text-indigo-500 shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </FormGroup>

            <FormGroup label="Event Date" hint="Actual date the event started">
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => handleChange('event_date', e.target.value)}
                className={inputCls}
              />
            </FormGroup>

            <FormGroup label="Summary">
              <textarea
                value={form.summary}
                onChange={(e) => handleChange('summary', e.target.value)}
                rows={3}
                className={cn(inputCls, 'resize-none')}
                placeholder="Summarize the event outcomes, key points, or notes..."
              />
            </FormGroup>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Report Type">
                <select value={form.type} onChange={(e) => handleChange('type', e.target.value)} className={inputCls}>
                  <option value="attendance">Attendance</option>
                  <option value="readiness">Readiness</option>
                  <option value="logistics">Logistics</option>
                  <option value="custom">Custom</option>
                </select>
              </FormGroup>
              <FormGroup label="Format">
                <select value={form.format} onChange={(e) => handleChange('format', e.target.value)} className={inputCls}>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </FormGroup>
            </div>

            <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <SquadronParticipantBlocks
                blocks={form.participantBlocks}
                onChange={(blocks) => handleChange('participantBlocks', blocks)}
                disabled={submitting}
              />
            </div>

            <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <DocumentationUpload
                files={form.documentationFiles}
                onFilesChange={(files) => handleChange('documentationFiles', files)}
              />
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                {errors.submit}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-indigo-500/20">
              {submitting ? 'Saving...' : report ? 'Update Report' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
