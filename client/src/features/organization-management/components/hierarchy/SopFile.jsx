import { FileText } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

const TOOLTIP_OFFSET = 14; // px beside the cursor

const formatUpdated = (updatedAt) => {
  if (!updatedAt) return null;
  try {
    return new Date(updatedAt).toLocaleDateString();
  } catch {
    return null;
  }
};

/**
 * SopFile
 *
 * Renders a single SOP as a horizontal file-style row (file-explorer look)
 * instead of a card. Clicking the row navigates to the SOP editor. Status and
 * last-updated date are not shown inline; they surface on hover in a tooltip
 * that follows the cursor, keeping the row compact.
 */
export default function SopFile({ sop }) {
  const navigate = useNavigate();
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const status = sop.status || 'active';
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const updatedLabel = formatUpdated(sop.updated_at);
  const tooltipDescription = updatedLabel ? `Updated ${updatedLabel}` : undefined;
  const ariaLabel = `Open ${sop.title} (${statusLabel}${updatedLabel ? `, updated ${updatedLabel}` : ''})`;

  const navigateToSop = () => {
    navigate(`/sops/${sop.id}`);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateToSop();
    }
  };

  const handleMouseMove = (event) => {
    if (!tooltipOpen) return;
    // Viewport coords -> the tooltip is a fixed portal rendered at the cursor.
    setCursorPos({ x: event.clientX, y: event.clientY });
  };

  const handleMouseEnter = () => setTooltipOpen(true);
  const handleMouseLeave = () => setTooltipOpen(false);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={navigateToSop}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center gap-2.5 rounded-lg pl-3 pr-2 py-1.5 text-left transition-colors hover:bg-[var(--bg-hover)] cursor-pointer group border border-transparent hover:border-[var(--border)]"
        aria-label={ariaLabel}
      >
        <FileText className="h-4 w-4 text-blue-500 shrink-0" />

        <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate">
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">{sop.title}</span>
          {sop.version ? (
            <span className="shrink-0 text-xs text-[var(--text-muted)]">v{sop.version}</span>
          ) : null}
        </div>

        {tooltipOpen &&
          createPortal(
            <div
              role="tooltip"
              className={
                'pointer-events-none fixed z-[9999] flex flex-col gap-0.5 rounded-lg px-2.5 py-1.5 shadow-xl ' +
                'bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 dark:border-neutral-600 ' +
                'transition-opacity duration-150'
              }
              style={{
                left: cursorPos.x + TOOLTIP_OFFSET,
                top: cursorPos.y + TOOLTIP_OFFSET,
              }}
            >
              <span className="whitespace-nowrap text-[13px] font-semibold text-neutral-50">
                {statusLabel}
              </span>
              {tooltipDescription ? (
                <span className="whitespace-nowrap text-[11px] text-neutral-400">
                  {tooltipDescription}
                </span>
              ) : null}
            </div>,
            document.body
          )}
      </div>
    </>
  );
}
