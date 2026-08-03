import { useState, useRef, useCallback, useEffect } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Encapsulates the pointer math for dragging a certificate section label
 * around a canvas. Keeps drag state + coordinate conversion out of the
 * component tree per architecture.md ("no business logic inside components").
 *
 * @param {(key: string, patch: { x_percent: number, y_percent: number }) => void} onChange
 */
export default function useSectionPositions(onChange) {
  const containerRef = useRef(null);
  const [draggingKey, setDraggingKey] = useState(null);

  const applyPosition = useCallback((key, clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPercent = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPercent = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    onChange(key, { x_percent: xPercent, y_percent: yPercent });
  }, [onChange]);

  useEffect(() => {
    if (!draggingKey) return undefined;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const handleMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      applyPosition(draggingKey, point.clientX, point.clientY);
    };
    const handleUp = () => setDraggingKey(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [draggingKey, applyPosition]);

  const startDrag = useCallback((key) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Capture the pointer on the label itself so drag events keep firing on
    // it even if the cursor moves fast enough to leave its bounds — without
    // this, quick drags can drop and let the browser fall back to selecting
    // whatever text/element is now under the cursor.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDraggingKey(key);
  }, []);

  return { containerRef, draggingKey, startDrag };
}
