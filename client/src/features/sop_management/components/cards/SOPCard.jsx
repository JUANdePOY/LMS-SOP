import { FileText } from 'lucide-react';

function StatusBadge({ status }) {
  const colors = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    'For Review': 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-blue-50 text-blue-700 border-blue-200',
    Published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Archived: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function SOPCard({ sop, onClick }) {
  if (!sop) return null;

  return (
    <button
      type="button"
      onClick={() => onClick?.(sop.id)}
      className="w-full rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 rounded-xl bg-blue-50 p-2 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{sop.title || 'Untitled SOP'}</h2>
            <p className="text-sm text-gray-500">{sop.code || 'No code'}</p>
          </div>
        </div>
        <StatusBadge status={sop.status} />
      </div>

      <p className="mt-4 line-clamp-2 text-sm text-gray-500">
        {sop.description || 'No description provided.'}
      </p>
    </button>
  );
}

