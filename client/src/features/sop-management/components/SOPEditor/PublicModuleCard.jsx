import { useState } from 'react';
import { ChevronDown, ChevronRight, Hash, Calendar, User, Building2, Tag, Clock, FileText } from 'lucide-react';
import SOP_CONTENT_STYLES from '../../utils/sopContentStyles';

const STATUS_STYLES = {
  Draft: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300',
  'In Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'For Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Published: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Archived: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function PublicModuleCard({ module, index }) {
  const [expanded, setExpanded] = useState(true);
  const hasContent = module.content && module.content.replace(/<[^>]*>/g, '').trim();
  const statusClass = STATUS_STYLES[module.status] || STATUS_STYLES.Draft;

  return (
    <div className="module-card group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors rounded-t-xl"
        aria-expanded={expanded}
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold shrink-0">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm truncate">
              {module.title}
            </h3>
            {module.status && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border border-transparent ${statusClass}`}>
                {module.status}
              </span>
            )}
          </div>
          {!expanded && hasContent && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">
              {module.content.replace(/<[^>]*>/g, '').slice(0, 120)}...
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {module.sort_order !== undefined && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
              <Hash size={10} />
              {module.sort_order}
            </span>
          )}
          {expanded ? (
            <ChevronDown size={16} className="text-neutral-400 dark:text-neutral-500" />
          ) : (
            <ChevronRight size={16} className="text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-neutral-100 dark:border-neutral-700/60 pt-4">
            {hasContent ? (
              <div
                className={`break-words [&_img]:max-w-full [&_img]:h-auto ${SOP_CONTENT_STYLES}`}
                dangerouslySetInnerHTML={{ __html: module.content }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText size={28} className="text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">No content in this module yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicModuleCard;
