import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Users, Search, X, Building2, Layers, Shield, User } from 'lucide-react';

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

function HierarchyNode({ node, level, selectedIds, onToggle, expandedIds, onExpand, renderBadge }) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const icons = [Building2, Layers, Shield, User];
  const Icon = icons[Math.min(level, icons.length - 1)];

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300'
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand(node.id);
            }}
            className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4.5" />
        )}
        <Icon className="h-4 w-4 flex-shrink-0 text-neutral-400" />
        <span className="flex-1 text-sm truncate">{node.name}</span>
        {node.count !== undefined && (
          <span className="text-xs text-neutral-400">({node.count})</span>
        )}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(node, level)}
          className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
        />
        {renderBadge && renderBadge(node)}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <HierarchyNode
              key={`${child.type}-${child.id}`}
              node={child}
              level={level + 1}
              selectedIds={selectedIds}
              onToggle={onToggle}
              expandedIds={expandedIds}
              onExpand={onExpand}
              renderBadge={renderBadge}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParticipantSelector({ value = [], onChange, disabled = false }) {
  const [hierarchy, setHierarchy] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedReservistIds, setSelectedReservistIds] = useState(new Set());

  useEffect(() => {
    loadHierarchy();
  }, []);

  useEffect(() => {
    const ids = new Set();
    for (const block of value) {
      for (const rid of (block.reservist_ids || [])) {
        ids.add(Number(rid));
      }
    }
    setSelectedReservistIds(ids);
  }, [value]);

  const loadHierarchy = async () => {
    try {
      const api = (await import('@/services/api')).default;
      const response = await api.get('/hierarchy');
      setHierarchy(response.data?.data || []);
    } catch (err) {
      console.error('Failed to load hierarchy:', err);
    }
  };

  const searchReservists = useDebouncedCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    try {
      const api = (await import('@/services/api')).default;
      const response = await api.get('/reservists', { params: { search: query, limit: 20 } });
      setSearchResults(response.data?.data?.reservists || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, 300);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    searchReservists(q);
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collectReservistIds = (node) => {
    const ids = [];
    if (node.type === 'reservist') {
      ids.push(node.id);
    }
    if (node.children) {
      for (const child of node.children) {
        ids.push(...collectReservistIds(child));
      }
    }
    return ids;
  };

  const handleToggle = (node, level) => {
    const newSelected = new Set(selectedReservistIds);
    const reservistIds = collectReservistIds(node);
    const allSelected = reservistIds.every((id) => newSelected.has(id));

    for (const rid of reservistIds) {
      if (allSelected) {
        newSelected.delete(rid);
      } else {
        newSelected.add(rid);
      }
    }

    setSelectedReservistIds(newSelected);
    rebuildBlocks(newSelected, node, level);
  };

  const rebuildBlocks = (selectedIds, toggledNode, level) => {
    const blocks = [];
    const hierarchyMap = new Map();

    const buildMap = (nodes, parentSquadronId = null) => {
      for (const node of nodes) {
        if (node.type === 'squadron') {
          hierarchyMap.set(node.id, { ...node, parentSquadronId });
          if (node.children) {
            buildMap(node.children, node.id);
          }
        } else {
          hierarchyMap.set(node.id, { ...node, parentSquadronId });
          if (node.children) buildMap(node.children, parentSquadronId);
        }
      }
    };
    buildMap(hierarchy);

    const squadronReservists = new Map();
    for (const id of selectedIds) {
      const node = hierarchyMap.get(id);
      if (node && node.type === 'reservist') {
        const squadronId = node.parentSquadronId || findSquadronForReservist(hierarchy, id);
        if (squadronId) {
          if (!squadronReservists.has(squadronId)) {
            squadronReservists.set(squadronId, []);
          }
          squadronReservists.get(squadronId).push(id);
        }
      }
    }

    for (const [squadronId, reservistIds] of squadronReservists) {
      blocks.push({ squadron_id: squadronId, reservist_ids: reservistIds });
    }

    onChange(blocks);
  };

  const findSquadronForReservist = (nodes, reservistId) => {
    for (const node of nodes) {
      if (node.type === 'squadron') {
        if (node.children) {
          for (const child of node.children) {
            if (child.id === reservistId && child.type === 'reservist') {
              return node.id;
            }
          }
        }
      }
      if (node.children && node.type !== 'squadron') {
        const found = findSquadronForReservist(node.children, reservistId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleSearchResultSelect = (reservist) => {
    const newSelected = new Set(selectedReservistIds);
    if (newSelected.has(reservist.id)) {
      newSelected.delete(reservist.id);
    } else {
      newSelected.add(reservist.id);
    }
    setSelectedReservistIds(newSelected);
    rebuildBlocksFromSelection(newSelected);
    setSearchQuery('');
    setSearchResults(null);
  };

  const rebuildBlocksFromSelection = (selectedIds) => {
    const blocks = [];
    const squadronReservists = new Map();

    for (const id of selectedIds) {
      const squadronId = findSquadronForReservist(hierarchy, id);
      if (squadronId) {
        if (!squadronReservists.has(squadronId)) {
          squadronReservists.set(squadronId, []);
        }
        squadronReservists.get(squadronId).push(id);
      }
    }

    for (const [squadronId, reservistIds] of squadronReservists) {
      blocks.push({ squadron_id: squadronId, reservist_ids: reservistIds });
    }

    onChange(blocks);
  };

  const totalSelected = selectedReservistIds.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Select Participants by Hierarchy
        </h3>
        <span className="text-xs text-neutral-500">
          {totalSelected} reservist{totalSelected !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search reservists by name or service number..."
          className={`${inputCls} pl-10`}
          disabled={disabled}
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setSearchResults(null); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {searchResults && (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-neutral-500">Searching...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((r) => {
              const isSelected = selectedReservistIds.has(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => handleSearchResultSelect(r)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                    isSelected ? 'bg-indigo-50 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-4 w-4 rounded border-neutral-300 text-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {r.rank ? `${r.rank} ` : ''}{r.last_name}, {r.first_name}
                    </span>
                    <span className="text-neutral-400 ml-2">{r.service_number}</span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-sm text-neutral-500">No results found</div>
          )}
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg max-h-96 overflow-y-auto">
        {hierarchy.length > 0 ? (
          hierarchy.map((arsen) => (
            <HierarchyNode
              key={`arsen-${arsen.id}`}
              node={{ ...arsen, type: 'arsen', children: arsen.groups?.map(g => ({
                ...g,
                type: 'group',
                children: g.squadrons?.map(s => ({
                  ...s,
                  type: 'squadron',
                  children: s.reservists?.map(r => ({ ...r, type: 'reservist' })) || []
                })) || []
              })) || [] }}
              level={0}
              selectedIds={selectedReservistIds}
              onToggle={handleToggle}
              expandedIds={expandedIds}
              onExpand={toggleExpand}
            />
          ))
        ) : (
          <div className="p-4 text-center text-sm text-neutral-500">Loading hierarchy...</div>
        )}
      </div>
    </div>
  );
}
