export default function OverviewTab({ sop }) {
  if (!sop) return null;

  return (
    <div className="space-y-6">
      {/* Basic details */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{sop.status || 'Draft'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Code</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{sop.code || '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Version</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{sop.version || '1.0'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Department</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {sop.department_name || sop.department_id || '—'}
          </div>
        </div>
      </div>

      {/* Description */}
      {sop.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Description</div>
          <p className="mt-2 text-sm leading-6 text-gray-700">{sop.description}</p>
        </div>
      )}

      {/* Meta */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</div>
          <div className="mt-1 text-sm text-gray-700">
            {sop.created_at ? new Date(sop.created_at).toLocaleString() : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Owner</div>
          <div className="mt-1 text-sm text-gray-700">
            {sop.owner_name || `User #${sop.owner_user_id}` || '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

