import { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

function GroupedCheckboxList({
  items,
  selectedIds,
  onToggle,
  onToggleBulk,
  groupKey = 'business_name',
  subgroupKey,
  labelKey = 'full_name',
  subLabelKey,
  valueKey = 'id',
  loading = false,
  emptyText = 'No options',
}) {
  const [collapsed, setCollapsed] = useState({});

  const resolveValue = (item) => {
    if (typeof valueKey === 'function') return valueKey(item);
    return valueKey ? item[valueKey] : item;
  };

  const resolveLabel = (item) => {
    if (typeof labelKey === 'function') return labelKey(item);
    return labelKey ? item[labelKey] : item;
  };

  const resolveSubLabel = (item) => {
    if (!subLabelKey) return null;
    if (typeof subLabelKey === 'function') return subLabelKey(item);
    return subLabelKey ? item[subLabelKey] : null;
  };

  const resolveKey = (item, key) => {
    if (typeof key === 'function') return key(item);
    const result = key ? item[key] : item;
    return result;
  };

  const groups = useMemo(() => {
    if (!items.length) return [];

    const businesses = new Map();
    items.forEach((item) => {
      const groupName = resolveKey(item, groupKey) || 'Unassigned';
      if (!businesses.has(groupName)) {
        businesses.set(groupName, subgroupKey ? new Map() : []);
      }
      if (subgroupKey) {
        const subgroupName = resolveKey(item, subgroupKey) || 'Unassigned';
        const subgroupMap = businesses.get(groupName);
        if (!subgroupMap.has(subgroupName)) {
          subgroupMap.set(subgroupName, []);
        }
        subgroupMap.get(subgroupName).push(item);
      } else {
        businesses.get(groupName).push(item);
      }
    });

    const result = [];
    for (const [groupName, value] of businesses) {
      if (subgroupKey) {
        const subgroups = [];
        for (const [subgroupName, subgroupItems] of value) {
          subgroups.push({ name: subgroupName, items: subgroupItems });
        }
        result.push({ name: groupName, subgroups });
      } else {
        result.push({ name: groupName, items: value });
      }
    }
    return result;
  }, [items, groupKey, subgroupKey]);

  const isAllSelected = (itemList) => {
    if (!itemList.length) return false;
    return itemList.every((u) => selectedIds.includes(resolveValue(u)));
  };

  const isPartiallySelected = (itemList) => {
    const anySelected = itemList.some((u) => selectedIds.includes(resolveValue(u)));
    const allSelected = isAllSelected(itemList);
    return anySelected && !allSelected;
  };

  const handleBulkToggle = (itemList) => {
    const ids = itemList.map((u) => resolveValue(u));
    if (isAllSelected(itemList)) {
      onToggleBulk(ids);
    } else {
      onToggleBulk(ids.filter((id) => !selectedIds.includes(id)));
    }
  };

  const toggleCollapse = (key) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderItem = (item) => {
    const id = resolveValue(item);
    const label = resolveLabel(item);
    const subLabel = resolveSubLabel(item);
    const checked = selectedIds.includes(id);
    return (
      <label
        key={id}
        className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--bg-hover)]/30 cursor-pointer rounded text-sm"
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(id)}
          className="rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
        />
        <span className="text-[var(--text-primary)] truncate">
          {label}
        </span>
        {subLabel && (
          <span className="text-[var(--text-muted)] text-xs">
            ({subLabel})
          </span>
        )}
        {checked && <Check size={14} className="ml-auto text-green-600 flex-shrink-0" />}
      </label>
    );
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-5 animate-pulse rounded-md bg-[var(--bg-hover)]" />
        ))}
      </div>
    );
  }

  if (!groups.length) {
    return <p className="text-sm text-[var(--text-muted)]">{emptyText}</p>;
  }

  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-page)] overflow-hidden">
      {groups.map((group) => (
        <div key={group.name} className="border-b border-[var(--border)] last:border-0">
          <div className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-hover)]/30">
            {group.name}
          </div>
          {group.subgroups ? (
            group.subgroups.map((sub) => {
              const subKey = group.name + '::' + sub.name;
              const isExpanded = collapsed[subKey] !== false;
              const allSelected = isAllSelected(sub.items);
              const partial = isPartiallySelected(sub.items);

              return (
                <div key={subKey}>
                  <div
                    className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-[var(--bg-hover)]/50 transition-colors"
                    onClick={() => toggleCollapse(subKey)}
                  >
                    <div className="flex items-center gap-2">
                      {onToggleBulk && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBulkToggle(sub.items);
                          }}
                          className="flex items-center justify-center w-4 h-4 rounded border border-[var(--border)] text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          aria-label={allSelected ? 'Deselect all in ' + sub.name : 'Select all in ' + sub.name}
                        >
                          {allSelected ? <Check size={12} /> : partial ? <Check size={12} className="text-blue-600" /> : null}
                        </button>
                      )}
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {sub.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                      <span className="text-xs">
                        {sub.items.length} item{sub.items.length !== 1 ? 's' : ''}
                      </span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="pl-4 pr-2 pb-1 space-y-0.5">
                      {sub.items.map((item) => renderItem(item))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-3 py-1 space-y-0.5">
              {group.items.map((item) => renderItem(item))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default GroupedCheckboxList;
