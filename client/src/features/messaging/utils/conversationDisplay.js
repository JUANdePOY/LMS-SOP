export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getConversationDisplayName(conv, currentUserId) {
  if (conv?.type === "group_forum") return conv.subject || "Group Forum";
  const others = (conv?.participants || []).filter((p) => p.id !== currentUserId);
  if (others.length === 0) return "Saved Messages";
  if (others.length === 1) return others[0].full_name || others[0].email || "Unknown";
  return others.map((p) => p.full_name || p.email).join(", ");
}

export function getOtherParticipants(conv, currentUserId) {
  if (conv?.type === "group_forum") return [];
  return (conv?.participants || []).filter((p) => p.id !== currentUserId);
}

export function normalizeName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function getDisplayName(user) {
  return user?.full_name || user?.display_name || user?.email || "Unknown";
}

/**
 * Builds display labels for a list of users, appending a disambiguator
 * whenever two or more share the same normalized name. Prefers employee_id,
 * then role, then a numeric suffix as a last resort.
 *
 * Returns a Map<userId, string> so callers can label chips and the
 * resulting conversation title without re-deriving the logic.
 */
export function getDedupedDisplayNames(users) {
  const safe = Array.isArray(users) ? users : [];
  const groups = new Map();
  safe.forEach((u) => {
    const key = normalizeName(getDisplayName(u));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(u);
  });

  const labels = new Map();
  groups.forEach((members) => {
    if (members.length === 1) {
      const u = members[0];
      labels.set(u.id, getDisplayName(u));
      return;
    }
    members.forEach((u, i) => {
      const base = getDisplayName(u);
      const disambiguator =
        u.employee_id ? `(${u.employee_id})`
        : u.role ? `(${u.role.replace(/_/g, " ")})`
        : `(${i + 1})`;
      labels.set(u.id, `${base} ${disambiguator}`);
    });
  });
  return labels;
}

/**
 * Returns the existing 1:1 conversation for a counterpart user id, if present
 * in the supplied conversation list. Used to prevent creating duplicate DMs.
 */
export function findExistingDirectConversation(conversations, counterpartId) {
  if (!Array.isArray(conversations) || !counterpartId) return null;
  return conversations.find((c) => {
    if (c.type === "group_forum") return false;
    const others = (c.participants || []).filter((p) => p.id !== c.current_user_id);
    return others.length === 1 && String(others[0].id) === String(counterpartId);
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}
