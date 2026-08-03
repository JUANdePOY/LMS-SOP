import { useState, useRef, useCallback, useEffect } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const MIN_WIDTH_PERCENT = 15;
const MAX_WIDTH_PERCENT = 95;

/**
 * Pointer math for the corner "resize handle" on a certificate section
 * label. Dragging the handle grows/shrinks the label's wrap width
 * (max-width, as a percentage of the canvas) — NOT the font size. Kept
 * separate from useSectionPositions (which handles move-drag) so the two
 * gestures never interfere with each other.
 *
 * @param {React.RefObject} containerRef - ref to the canvas container,
 *   used to convert pixel drag distance into a percentage of canvas width.
 * @param {(key: string, patch: { width_percent: number }) => void} onChange
 */
export default function useSectionResize(containerRef, onChange) {
  const [resizingKey, setResizingKey] = useState(null);
  const startRef = useRef({ x: 0, widthPercent: 50 });

  const startResize = useCallback((key, currentWidthPercent) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, widthPercent: currentWidthPercent };
    setResizingKey(key);
  }, []);

  useEffect(() => {
    if (!resizingKey) return undefined;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const handleMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const point = e.touches ? e.touches[0] : e;
      const rect = container.getBoundingClientRect();
      const { x, widthPercent } = startRef.current;
      // Dragging right grows the box, dragging left shrinks it.
      const deltaPercent = ((point.clientX - x) / rect.width) * 100;
      const nextWidthPercent = clamp(
        Math.round(widthPercent + deltaPercent),
        MIN_WIDTH_PERCENT,
        MAX_WIDTH_PERCENT
      );
      onChange(resizingKey, { width_percent: nextWidthPercent });
    };
    const handleUp = () => setResizingKey(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [resizingKey, containerRef, onChange]);

  return { resizingKey, startResize };
}