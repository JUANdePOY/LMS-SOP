
function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div role="tablist" aria-label="Tabs" className="flex gap-1.5 overflow-x-auto scrollbar-thin border-b border-neutral-200 dark:border-neutral-700 pb-px">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap transition-all duration-200 border border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isActive
                ? 'bg-white dark:bg-neutral-800 border-indigo-500/60 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500/30'
                : 'text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {tab.icon && <tab.icon size={13} />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.25 rounded-full text-[10px] tabular-nums font-semibold ${
                isActive
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}>
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-indigo-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function TabPanel({ value, activeTab, children, className = '' }) {
  if (value !== activeTab) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}

export { Tabs, TabPanel };
