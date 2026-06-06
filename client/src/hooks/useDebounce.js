import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useDebounce
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of inactivity. Ideal for search inputs and filter selects.
 *
 * @param {*}      value - The value to debounce (string, object, etc.)
 * @param {number} delay - Milliseconds to wait after the last change (default: 400)
 * @returns {*} The debounced value
 *
 * @example
 * const debouncedSearch = useDebounce(search, 400);
 * useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback
 * Returns a stable debounced version of `fn` that fires only after `delay` ms
 * of inactivity. The returned function is stable across renders (safe to use
 * in event handlers without re-registering listeners).
 *
 * @param {Function} fn    - The function to debounce
 * @param {number}   delay - Milliseconds to wait (default: 400)
 * @returns {Function} Debounced function
 *
 * @example
 * const handleSearch = useDebouncedCallback((val) => fetchResults(val), 400);
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */
export function useDebouncedCallback(fn, delay = 400) {
  const timerRef = useRef(null);
  const fnRef    = useRef(fn);

  // Keep fnRef current so the debounced wrapper always calls the latest fn
  // without needing to be recreated on every render.
  useEffect(() => { fnRef.current = fn; }, [fn]);

  return useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  }, [delay]);
}
