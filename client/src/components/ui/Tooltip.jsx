import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * SidebarTooltip
 * A controlled tooltip that ONLY appears when:
 *   1. `enabled` prop is true (sidebar is collapsed)
 *   2. The trigger element is being hovered
 *
 * Uses a portal so it renders above all stacking contexts.
 *
 * @param {{ label: string, description?: string, enabled: boolean, children: React.ReactNode }} props
 */
export default function SidebarTooltip({ label, description, enabled, children }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const showTimer = useRef(null);

  // Clear timers on unmount
  useEffect(() => () => clearTimeout(showTimer.current), []);

  // Recompute position when becoming visible
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.top + rect.height / 2,
      left: rect.right + 8, // 8px gap from sidebar edge
    });
  };

  const handleMouseEnter = () => {
    if (!enabled) return;
    updatePosition();
    // Small delay prevents flicker on quick passes
    showTimer.current = setTimeout(() => setVisible(true), 80);
  };

  const handleMouseLeave = () => {
    clearTimeout(showTimer.current);
    setVisible(false);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full"
    >
      {children}

      {/* Portal tooltip — only mounted when enabled */}
      {enabled &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
            className={cn(
              // positioning
              "fixed z-[9999] -translate-y-1/2 pointer-events-none",
              // shape
              "flex flex-col gap-0.5 rounded-lg px-3 py-2 shadow-xl",
              // colors — light/dark via Tailwind
              "bg-neutral-900 dark:bg-neutral-800",
              "border border-neutral-700 dark:border-neutral-600",
              // animation
              "transition-all duration-150 ease-out",
              visible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-1 pointer-events-none"
            )}
          >
            <span className="whitespace-nowrap text-[13px] font-semibold text-neutral-50">
              {label}
            </span>
            {description && (
              <span className="whitespace-nowrap text-[11px] text-neutral-400">
                {description}
              </span>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
