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
const LAST_SESSION_KEY = 'lms_last_session';

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

// The active-session pointer is per-tab (sessionStorage) so each tab keeps
// its own isolated login. The shared localStorage registry only tracks
// sessions across tabs for awareness/switching.
function getActiveSessionId() {
  return sessionStorage.getItem(ACTIVE_KEY);
}

function setActiveSessionId(tabId) {
  if (tabId) {
    sessionStorage.setItem(ACTIVE_KEY, tabId);
  } else {
    sessionStorage.removeItem(ACTIVE_KEY);
  }
}

// Persist a freshly authenticated session for the current tab.
export function saveCurrentSession(token, user, refreshToken) {
  const tabId = getTabId();
  const session = {
    tabId,
    token,
    user,
    refreshToken: refreshToken || null,
    createdAt: Date.now(),
  };
  writeSession(tabId, session);
  setActiveSessionId(tabId);
  localStorage.setItem(LAST_SESSION_KEY, tabId);
  return tabId;
}

// Prefer this tab's session, then resume the most recently used session when
// the browser has discarded its per-tab sessionStorage.
export function getCurrentSession() {
  const tabId = getTabId();
  const ownSession = readSession(tabId);
  if (ownSession) {
    setActiveSessionId(tabId);
    return ownSession;
  }
  const activeId = getActiveSessionId();
  if (activeId) {
    const session = readSession(activeId);
    if (session) return session;
  }

  const lastSessionId = localStorage.getItem(LAST_SESSION_KEY);
  if (lastSessionId) {
    const session = readSession(lastSessionId);
    if (session) {
      setActiveSessionId(lastSessionId);
      return session;
    }
    localStorage.removeItem(LAST_SESSION_KEY);
  }

  return null;
}

export function getCurrentToken() {
  return getCurrentSession()?.token || null;
}

export function getCurrentRefreshToken() {
  return getCurrentSession()?.refreshToken || null;
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
// This logs the current tab out without promoting another tab's session
// as active — each tab keeps its own isolated session.
export function clearCurrentSession(tabId) {
  const id = tabId || getActiveSessionId() || getTabId();
  removeSession(id);
  if (localStorage.getItem(LAST_SESSION_KEY) === id) {
    localStorage.removeItem(LAST_SESSION_KEY);
  }
  if (getActiveSessionId() === id) {
    setActiveSessionId(null);
  }
}

// Drop the whole registry (used by the global logout-all path).
export function clearAllSessions() {
  const registry = readRegistry();
  Object.keys(registry).forEach((id) => localStorage.removeItem(sessionKey(id)));
  localStorage.removeItem(REGISTRY_KEY);
  localStorage.removeItem(LAST_SESSION_KEY);
  sessionStorage.removeItem(ACTIVE_KEY);
}
