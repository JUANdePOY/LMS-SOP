
function ActionChipGroup({ actions, selectedActions, onToggleAction, disabled }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => {
        const active = selectedActions.includes(action);
        return (
          <button
            key={action}
            type="button"
            onClick={() => onToggleAction(action)}
            disabled={disabled}
            className={`text-[10px] font-medium px-2 py-1 rounded-md capitalize transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              active
                ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-400/40 text-indigo-800 dark:text-indigo-200'
                : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {action}
          </button>
        );
      })}
    </div>
  );
}

export { ActionChipGroup };
