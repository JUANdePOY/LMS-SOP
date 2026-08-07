import { useEffect, useRef, useState, useCallback } from "react";

function toSignature(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value ?? "");
  }
}

/**
 * Detects when data on the current page has changed in the background.
 *
 * `checkFn` should return a lightweight representation (or the raw data) of the
 * page's current state. It is polled on an interval; when the serialized result
 * differs from the baseline captured on mount, `hasUpdate` becomes true so the UI
 * can show a "new changes" notification.
 */
export function usePageUpdates({ checkFn, intervalMs = 30000, enabled = true }) {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const baselineRef = useRef(null);
  const mountedRef = useRef(true);
  const checkFnRef = useRef(checkFn);
  checkFnRef.current = checkFn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const snapshot = useCallback(async () => toSignature(await checkFnRef.current()), []);

  useEffect(() => {
    if (!enabled || !checkFnRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        baselineRef.current = await snapshot();
      } catch {
        /* ignore baseline errors */
      }
    })();

    const id = setInterval(async () => {
      if (!mountedRef.current || cancelled) return;
      setChecking(true);
      try {
        const current = await snapshot();
        if (baselineRef.current !== null && current !== baselineRef.current) {
          setHasUpdate(true);
        }
      } catch {
        /* ignore transient check errors */
      } finally {
        setChecking(false);
      }
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs, snapshot]);

  const refresh = useCallback(
    async (refetch) => {
      setLoading(true);
      try {
        if (refetch) await refetch();
        baselineRef.current = await snapshot();
        setHasUpdate(false);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    },
    [snapshot]
  );

  const dismiss = useCallback(() => setHasUpdate(false), []);

  return { hasUpdate, loading, checking, refresh, dismiss };
}
