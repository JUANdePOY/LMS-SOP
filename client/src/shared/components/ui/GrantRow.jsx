import { Toggle } from '@/shared/components/ui/toggle';
import { ActionChipGroup } from '@/shared/components/ui/ActionChipGroup';

function GrantRow({ label, granted, onToggleGrant, actions, selectedActions, onToggleAction, showActions = true, disabled, subtitle }) {
  return (
    <div className={`rounded-lg border p-2.5 transition-colors ${granted ? 'bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30' : 'bg-neutral-50 dark:bg-neutral-700/30 border-neutral-200 dark:border-neutral-700'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Toggle
            checked={granted}
            onCheckedChange={onToggleGrant}
            disabled={disabled}
            size="sm"
          />
          <span className={`text-xs font-medium truncate ${granted ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>
            {label}
          </span>
        </div>
        {showActions && (
          <button
            type="button"
            onClick={onToggleGrant}
            disabled={disabled}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              granted
                ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/30'
                : 'text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {granted ? 'Revoke' : 'Grant'}
          </button>
        )}
      </div>
      {subtitle && (
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 pl-[42px]">{subtitle}</p>
      )}
      {granted && showActions && actions && (
        <div className="mt-2 pl-[42px]">
          <ActionChipGroup
            actions={actions}
            selectedActions={selectedActions}
            onToggleAction={onToggleAction}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

export { GrantRow };
