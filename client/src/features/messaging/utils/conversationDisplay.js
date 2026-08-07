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
