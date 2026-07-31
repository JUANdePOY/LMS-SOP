function AuditTimeline({ logs = [], loading = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-l-2 border-neutral-200 dark:border-neutral-700 pl-3 py-1 animate-pulse">
            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-1"></div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-neutral-500 dark:text-neutral-400 text-sm">No audit entries.</p>;
  }

  function renderDetails(log) {
    if (log.old_values && log.new_values) {
      return (
        <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          <span className="line-through text-neutral-400">{typeof log.old_values === 'object' ? JSON.stringify(log.old_values) : log.old_values}</span>{' '}
          <span className="text-green-600 dark:text-green-400">{typeof log.new_values === 'object' ? JSON.stringify(log.new_values) : log.new_values}</span>
        </div>
      );
    }

    if (log.metadata) {
      const meta = typeof log.metadata === 'string' ? (() => { try { return JSON.parse(log.metadata); } catch { return null; } })() : log.metadata;
      if (meta) {
        return (
          <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
            {Object.entries(meta).map(([key, val]) => (
              <span key={key} className="mr-2"><span className="font-medium">{key}:</span> {typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
            ))}
          </div>
        );
      }
    }

    return null;
  }

  return (
    <div className="audit-timeline">
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="relative border-l-2 border-neutral-200 dark:border-neutral-700 pl-4 py-1">
            <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"></div>
            <div className="flex justify-between items-start">
              <span className="font-medium text-xs text-neutral-900 dark:text-neutral-100">{log.action}</span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {log.created_at ? new Date(log.created_at).toLocaleString() : 'Invalid date'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">by {log.user_name || 'Unknown'}</p>
            {renderDetails(log)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuditTimeline;
