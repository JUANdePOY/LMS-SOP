import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Hash, FileText, Lock, CheckCircle2, PlayCircle, ExternalLink, Download } from 'lucide-react';
import SOP_CONTENT_STYLES from '../../utils/sopContentStyles';
import { resolveFileUrl } from '@/lib/fileUrl';

const SOP_IMAGE_STYLES = `
  .sop-image-figure[data-align="center"] { margin-left: auto; margin-right: auto; }
  .sop-image-figure[data-align="left"] { margin-right: auto; }
  .sop-image-figure[data-align="right"] { margin-left: auto; }
  .sop-image-figure img { display: block; max-width: 100%; height: auto; }
`;

function PublicModuleCard({ module, index, isActive = false, isLocked = false, isCompleted = false, onActivate, onMarkComplete }) {
  const [expanded, setExpanded] = useState(isActive);
  const contentRef = useRef(null);
  const hasContent = module.content && module.content.replace(/<[^>]*>/g, '').trim();

  useEffect(() => {
    if (isActive) {
      setExpanded(true);
    }
  }, [isActive]);

  useEffect(() => {
    if (!hasContent) return;
    const container = contentRef.current;
    if (!container) return;
    const figures = container.querySelectorAll('figure.sop-image-figure');
    figures.forEach((fig) => {
      const align = fig.getAttribute('data-align');
      fig.style.marginLeft = '';
      fig.style.marginRight = '';
      if (align === 'center') {
        fig.style.marginLeft = 'auto';
        fig.style.marginRight = 'auto';
      } else if (align === 'right') {
        fig.style.marginLeft = 'auto';
      } else if (align === 'left') {
        fig.style.marginRight = 'auto';
      }
    });
  }, [hasContent, module.content]);

  const handleToggle = () => {
    if (isLocked) return;
    if (!onActivate) return;
    if (expanded && isActive) {
      setExpanded(false);
      return;
    }
    onActivate();
    setExpanded(true);
  };

  const statusBadge = isCompleted ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
      <CheckCircle2 size={12} />
      Completed
    </span>
  ) : isLocked ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600">
      <Lock size={12} />
      Locked
    </span>
  ) : isActive ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
      <PlayCircle size={12} />
      In Progress
    </span>
  ) : null;

  return (
    <div className={`module-card group rounded-xl border bg-white dark:bg-neutral-800 shadow-sm hover:shadow-md transition-all duration-200 ${
      isActive
        ? 'border-blue-300 dark:border-blue-700'
        : isLocked
          ? 'border-neutral-200 dark:border-neutral-700 opacity-75'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-200 dark:hover:border-indigo-800'
    }`}>
      <style>{SOP_IMAGE_STYLES}</style>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLocked}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors rounded-t-xl ${
          isLocked ? 'cursor-not-allowed opacity-70' : 'hover:bg-neutral-50 dark:hover:bg-neutral-750'
        }`}
        aria-expanded={expanded}
      >
        <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
          isCompleted
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
            : isLocked
              ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500'
              : isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
        }`}>
          {isCompleted ? <CheckCircle2 size={16} /> : isLocked ? <Lock size={14} /> : index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-sm truncate ${
              isLocked ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'
            }`}>
              {module.title}
            </h3>
            {statusBadge}
          </div>
          {!expanded && hasContent && !isLocked && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">
              {module.content.replace(/<[^>]*>/g, '').slice(0, 120)}...
            </p>
          )}
          {isLocked && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Complete previous modules to unlock
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {module.sort_order !== undefined && !isLocked && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
              <Hash size={10} />
              {module.sort_order}
            </span>
          )}
          {!isLocked && (
            expanded ? (
              <ChevronDown size={16} className="text-neutral-400 dark:text-neutral-500" />
            ) : (
              <ChevronRight size={16} className="text-neutral-400 dark:text-neutral-500" />
            )
          )}
        </div>
      </button>

      {expanded && !isLocked && (
        <div ref={contentRef} className="px-5 pb-5 pt-0 overflow-hidden">
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
            {module.attachments?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Attachments</p>
                <div className="space-y-2">
                    {module.attachments.map((att) => {
                      const isLink = !!att.link_url;
                      const fileUrl = isLink ? att.link_url : resolveFileUrl(att.file_name, { download: true });
                      const label = att.original_name || att.file_name || (isLink ? 'Link' : 'File');
                      return (
                        <a
                          key={att.id}
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={!isLink ? true : undefined}
                          className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        >
                          {isLink ? <ExternalLink size={14} className="text-blue-600 dark:text-blue-400" /> : <Download size={14} className="text-amber-600 dark:text-amber-400" />}
                          <span className="flex-1 truncate">{label}</span>
                          {!isLink && att.file_extension && (
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase">{att.file_extension}</span>
                          )}
                        </a>
                      );
                    })}
                </div>
              </div>
            )}
            {onMarkComplete && isActive && !isCompleted && (
              <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-700/60">
                <button
                  type="button"
                  onClick={onMarkComplete}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[rgba(242,92,5,0.20)] transition-all hover:shadow-md active:bg-[var(--color-primary-active)]"
                >
                  <CheckCircle2 size={16} />
                  Mark Module Complete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicModuleCard;
