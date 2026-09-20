import { Toggle } from '@/shared/components/ui/toggle';
import { Input } from '@/shared/components/ui/input';
import { ENTITY_TYPE_CONFIG, ENTITY_TYPES } from './rolesPermissionHelpers';

export function ResourceRestrictionPanel({
  entityStates,
  visibleTypes,
  onScopeToggle,
  onRecordToggle,
  onSearch,
}) {
  return (
    <div className="space-y-6">
      {ENTITY_TYPES.map(entityType => {
        if (!visibleTypes.includes(entityType)) return null;
        const config = ENTITY_TYPE_CONFIG[entityType];
        const state = entityStates[entityType];
        if (!state) return null;

        const isDenied = state.scope === 'denied';
        const isSelected = state.scope === 'selected';

        const filteredEntities = state.entities.filter(e => {
          const q = state.search.toLowerCase();
          if (!q) return true;
          return (e.label || '').toLowerCase().includes(q);
        });

        return (
          <div key={entityType} className="space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-700/50 pb-2">
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {config.label}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {isDenied ? 'Denied' : isSelected ? 'Only selected' : 'All'}
                </span>
                <Toggle
                  checked={!isDenied}
                  onCheckedChange={() => onScopeToggle(entityType)}
                  size="sm"
                />
              </div>
            </div>

            {isDenied ? (
              <p className="text-xs text-red-600 dark:text-red-400 py-2">
                Access to all {config.label.toLowerCase()} is denied for this user.
              </p>
            ) : isSelected ? (
              <>
                <Input
                  placeholder={`Search ${config.label.toLowerCase()}…`}
                  value={state.search}
                  onChange={(e) => onSearch(entityType, e.target.value)}
                  className="text-xs h-8 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  {filteredEntities.map(entity => (
                    <div
                      key={entity.id}
                      className="flex items-center justify-between py-1 border-b border-neutral-200/20 dark:border-neutral-700/30 last:border-0"
                    >
                      <span
                        className="text-xs text-neutral-700 dark:text-neutral-300 truncate max-w-[220px]"
                        title={entity.label}
                      >
                        {entity.label || `#${entity.id}`}
                      </span>
                      <Toggle
                        checked={state.selectedIds.has(entity.id)}
                        onCheckedChange={() => onRecordToggle(entityType, entity.id)}
                        size="sm"
                      />
                    </div>
                  ))}
                  {filteredEntities.length === 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 py-2">
                      No {config.label.toLowerCase()} found
                    </p>
                  )}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {state.selectedIds.size} of {state.entities.length} selected
                </p>
              </>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 py-2">
                This user has access to all {config.label.toLowerCase()}.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
