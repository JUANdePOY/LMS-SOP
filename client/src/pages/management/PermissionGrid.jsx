import React, { useMemo } from 'react';
import { Toggle } from '@/shared/components/ui/toggle';
import { groupByCategory, CATEGORY_LABELS } from './rolesPermissionHelpers';

export function PermissionGrid({ permStates, onToggleAction, links = [] }) {
  const grouped = useMemo(() => groupByCategory(permStates), [permStates]);
  const categories = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {links.length > 0 && (
        <div className="flex gap-5 text-xs">
          {links.map(link => (
            <a
              key={link.label}
              href="#"
              onClick={(e) => { e.preventDefault(); link.onClick(); }}
              className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      {categories.map(category => {
        const perms = grouped[category];
        return (
          <div key={category} className="space-y-0.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {CATEGORY_LABELS[category] || category}
            </h4>
            {perms.map(perm => (
              <div
                key={perm.name}
                className="flex items-center justify-between gap-2 py-1.5 border-b border-neutral-200/30 dark:border-neutral-700/30 last:border-0"
              >
                <span
                  className={`text-xs truncate max-w-[200px]`}
                  title={perm.display_name}
                >
                  {perm.display_name}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {perm.definedActions.map(action => (
                    <React.Fragment key={action}>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 capitalize min-w-[40px] text-right">
                        {action}
                      </span>
                      <Toggle
                        checked={perm.selectedActions.includes(action)}
                        onCheckedChange={() => onToggleAction(perm, action)}
                        size="sm"
                      />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
