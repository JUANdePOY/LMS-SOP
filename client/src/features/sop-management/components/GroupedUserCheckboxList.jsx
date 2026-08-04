import { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

function GroupedUserCheckboxList({
  items,
  selectedIds,
  onToggle,
  onToggleBulk,
  loading = false,
  emptyText = 'Select a department first',
}) {
  const [collapsed, setCollapsed] = useState({});

  const groups = useMemo(() => {
    if (!items.length) return [];

    const businesses = new Map();
    items.forEach((user) => {
      const bizName = user.business_name || 'Unassigned Business';
      const deptName = user.department_name || 'Unassigned Department';

      if (!businesses.has(bizName)) {
        businesses.set(bizName, new Map());
      }
      const deptMap = businesses.get(bizName);
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, []);
      }
      deptMap.get(deptName).push(user);
    });

    const result = [];
    for (const [bizName, deptMap] of businesses) {
      const departments = [];
      for (const [deptName, users] of deptMap) {
        departments.push({ name: deptName, users });
      }
      result.push({ name: bizName, departments });
    }
    return result;
  }, [items]);

  const isDeptAllSelected = (deptUsers) => {
    if (!deptUsers.length) return false;
    return deptUsers.every((u) => selectedIds.includes(u.id));
  };

  const isDeptPartiallySelected = (deptUsers) => {
    const anySelected = deptUsers.some((u) => selectedIds.includes(u.id));
    const allSelected = isDeptAllSelected(deptUsers);
    return anySelected && !allSelected;
  };

  const handleDeptToggle = (deptUsers) => {
    if (isDeptAllSelected(deptUsers)) {
      onToggleBulk(deptUsers.map((u) => u.id));
    } else {
      onToggleBulk(deptUsers.filter((u) => !selectedIds.includes(u.id)).map((u) => u.id));
    }
  };

  const toggleDeptCollapse = (key) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div className="space-y-3">
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
      {groups.map((biz) => (
        <div key={biz.name} className="border-b border-[var(--border)] last:border-0">
          <div className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-hover)]/30">
            {biz.name}
          </div>
          {biz.departments.map((dept) => {
            const deptKey = `${biz.name}::${dept.name}`;
            const isExpanded = collapsed[deptKey] !== false;
            const allSelected = isDeptAllSelected(dept.users);
            const partial = isDeptPartiallySelected(dept.users);

            return (
              <div key={deptKey}>
                <div
                  className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-[var(--bg-hover)]/50 transition-colors"
                  onClick={() => toggleDeptCollapse(deptKey)}
                >
                  <div className="flex items-center gap-2">
                    {onToggleBulk && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeptToggle(dept.users, deptKey);
                        }}
                        className="flex items-center justify-center w-4 h-4 rounded border border-[var(--border)] text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        aria-label={allSelected ? 'Deselect all in department' : 'Select all in department'}
                      >
                        {allSelected ? <Check size={12} /> : partial ? <Check size={12} className="text-blue-600" /> : null}
                      </button>
                    )}
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {dept.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-muted)]">
                    <span className="text-xs">
                      {dept.users.length} user{dept.users.length !== 1 ? 's' : ''}
                    </span>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pl-4 pr-2 pb-1 space-y-0.5">
                    {dept.users.map((user) => {
                      const checked = selectedIds.includes(user.id);
                      return (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--bg-hover)]/30 cursor-pointer rounded text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggle(user.id)}
                            className="rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[var(--text-primary)] truncate">
                            {user.full_name}
                          </span>
                          {user.position_title && (
                            <span className="text-[var(--text-muted)] text-xs">
                              ({user.position_title})
                            </span>
                          )}
                          {checked && <Check size={14} className="ml-auto text-green-600 flex-shrink-0" />}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default GroupedUserCheckboxList;
