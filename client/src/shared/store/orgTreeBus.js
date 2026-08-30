import { useEffect, useState } from 'react';

/**
 * Tiny cross-panel pub/sub for the org tree (SOP businesses, clients, and their
 * business units / projects). The secondary sidebar, the Tasks page tree, and
 * the project workspace each load this data from different endpoints, so a
 * create/delete in one place didn't refresh the others.
 *
 * Any mutation that changes the org tree calls `notifyOrgTreeChanged()`; every
 * consumer subscribes via `useOrgTreeVersion()` and re-fetches, so a new client
 * (or a deletion) appears/removes everywhere without a manual page reload.
 */

let version = 0;
const listeners = new Set();

export function notifyOrgTreeChanged() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOrgTreeVersion() {
  const [current, setCurrent] = useState(version);
  useEffect(() => subscribe(() => setCurrent(version)), []);
  return current;
}
