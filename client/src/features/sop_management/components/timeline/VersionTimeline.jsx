import { Layers, CheckCircle2, Archive, Edit3 } from 'lucide-react';

const STATUS_ICONS = {
  Draft: Edit3,
  'For Review': Edit3,
  Approved: CheckCircle2,
  Published: CheckCircle2,
  Archived: Archive,
};

const STATUS_COLORS = {
  Draft: 'text-gray-600 bg-gray-50 border-gray-200',
  'For Review': 'text-amber-600 bg-amber-50 border-amber-200',
  Approved: 'text-blue-600 bg-blue-50 border-blue-200',
  Published: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Archived: 'text-red-600 bg-red-50 border-red-200',
};

export default function VersionTimeline({ versions, loading, onVersionClick }) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading version timeline…</div>;
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No version history yet.
      </div>
    );
  }

  const sorted = [...versions].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {sorted.map((version, index) => {
          const Icon = STATUS_ICONS[version.status] || Layers;
          const colorClass = STATUS_COLORS[version.status] || 'text-gray-500 bg-gray-100';

          return (
            <div
              key={version.id || index}
              className="relative flex gap-4 cursor-pointer"
              onClick={() => onVersionClick?.(version)}
            >
              <div className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    v{version.version || '1.0'}
                  </span>
                  {version.is_current && (
                    <span className="text-xs font-medium text-blue-600">(current)</span>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    {version.created_at ? new Date(version.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>

                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium mt-1 ${
                  version.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  version.status === 'Archived' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {version.status || 'Draft'}
                </span>

                {version.change_summary && (
                  <p className="mt-2 text-sm text-gray-700">{version.change_summary}</p>
                )}

                {version.published_at && (
                  <p className="mt-1 text-xs text-gray-500">
                    Published: {new Date(version.published_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

