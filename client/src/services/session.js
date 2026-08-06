// Session storage layer that supports multiple concurrent, isolated sessions
// so an admin can stay logged in while a separate user session is open
// (e.g. in another browser tab) without the two overriding each other.
//
// Each browser tab gets a stable per-tab id. A session is stored under
// `lms_session_<tabId>` so writes never clobber another session. A registry
// `lms_sessions` keeps track of every active session across tabs, and
// `lms_active_session` points at which session the current tab uses.

const SESSION_PREFIX = 'lms_session_';
const REGISTRY_KEY = 'lms_sessions';
const ACTIVE_KEY = 'lms_active_session';

function getTabId() {
  let tabId = sessionStorage.getItem('lms_tab_id');
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('lms_tab_id', tabId);
  }
  return tabId;
}

function readRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeRegistry(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

function sessionKey(tabId) {
  return `${SESSION_PREFIX}${tabId}`;
}

function readSession(tabId) {
  try {
    const raw = localStorage.getItem(sessionKey(tabId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(tabId, session) {
  localStorage.setItem(sessionKey(tabId), JSON.stringify(session));
  const registry = readRegistry();
  registry[tabId] = {
    tabId,
    userId: session.user?.id,
    email: session.user?.email,
    role: session.user?.role,
    fullName: session.user?.full_name,
    createdAt: session.createdAt,
  };
  writeRegistry(registry);
}

function removeSession(tabId) {
  localStorage.removeItem(sessionKey(tabId));
  const registry = readRegistry();
  delete registry[tabId];
  writeRegistry(registry);
}

export function listSessions() {
  return Object.values(readRegistry());
}

export function getActiveSessionId() {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveSessionId(tabId) {
  if (tabId) {
    localStorage.setItem(ACTIVE_KEY, tabId);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

// Persist a freshly authenticated session for the current tab.
export function saveCurrentSession(token, user) {
  const tabId = getTabId();
  const session = {
    tabId,
    token,
    user,
    createdAt: Date.now(),
  };
  writeSession(tabId, session);
  setActiveSessionId(tabId);
  return tabId;
}

// Read the session currently active in this tab. Falls back to the
// session owned by this tab, then to any available session.
export function getCurrentSession() {
  const activeId = getActiveSessionId();
  if (activeId) {
    const session = readSession(activeId);
    if (session) return session;
  }
  const tabId = getTabId();
  const ownSession = readSession(tabId);
  if (ownSession) {
    setActiveSessionId(tabId);
    return ownSession;
  }
  return null;
}

export function getCurrentToken() {
  return getCurrentSession()?.token || null;
}

export function getCurrentUser() {
  return getCurrentSession()?.user || null;
}

export function switchSession(tabId) {
  const session = readSession(tabId);
  if (!session) return false;
  setActiveSessionId(tabId);
  return true;
}

// Remove the session for the current tab (or a specific tab id).
export function clearCurrentSession(tabId) {
  const id = tabId || getTabId();
  removeSession(id);
  if (getActiveSessionId() === id) {
    const remaining = Object.keys(readRegistry());
    setActiveSessionId(remaining.length ? remaining[0] : null);
  }
}

// Drop the whole registry (used by the global logout-all path).
export function clearAllSessions() {
  const registry = readRegistry();
  Object.keys(registry).forEach((id) => localStorage.removeItem(sessionKey(id)));
  localStorage.removeItem(REGISTRY_KEY);
  localStorage.removeItem(ACTIVE_KEY);
}
