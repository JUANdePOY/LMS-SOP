import { useEffect, useRef } from 'react';

/**
 * Detects clicks (or pointer events) outside the referenced element.
 * Calls `onOutside` when a click occurs outside the ref's element.
 * Uses a ref internally so the subscription effect only runs once,
 * regardless of how often the callback identity changes.
 *
 * @param {function} onOutside - callback invoked when an outside click is detected
 * @returns {React.RefObject} ref to attach to the element that should be protected
 */
export function useClickOutside(onOutside) {
  const ref = useRef(null);
  const callbackRef = useRef(onOutside);

  // Keep the latest callback in the ref without re-subscribing
  callbackRef.current = onOutside;

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) callbackRef.current();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []); // Empty deps — listener attached once, callback read from ref

  return ref;
}
