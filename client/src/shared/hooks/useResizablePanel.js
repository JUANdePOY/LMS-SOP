import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Makes a side panel width resizable by dragging its edge.
 *
 * Returns a ref to attach to the panel element, a width value, an onPointerDown
 * handler for the drag handle, and an isDragging flag (used to suspend CSS
 * transitions during the drag so it tracks the cursor 1:1).
 *
 * Uses Pointer Events so a single code path covers mouse and touch, and
 * setPointerCapture so the drag keeps tracking even when the cursor leaves the
 * handle. Listeners and body overrides are always cleaned up on pointerup.
 */
export function useResizablePanel({
  initialWidth = 320,
  minWidth = 220,
  maxWidth = 480,
  storageKey,
} = {}) {
  const [width, setWidth] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = Number(window.localStorage.getItem(storageKey));
      if (saved >= minWidth && saved <= maxWidth) return saved;
    }
    return initialWidth;
  });
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);
  const widthRef = useRef(width);
  widthRef.current = width;

  const clamp = useCallback(
    (w) => Math.min(maxWidth, Math.max(minWidth, Math.round(w))),
    [minWidth, maxWidth]
  );

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMove = (e) => {
      const panel = panelRef.current;
      if (!panel) return;
      setWidth(clamp(e.clientX - panel.getBoundingClientRect().left));
    };
    const handleUp = () => {
      setIsDragging(false);
      if (storageKey) {
        window.localStorage.setItem(storageKey, String(widthRef.current));
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [isDragging, clamp, storageKey]);

  return { width, isDragging, panelRef, onPointerDown };
}
