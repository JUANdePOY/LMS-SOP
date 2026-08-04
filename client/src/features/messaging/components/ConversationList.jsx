import { MessageSquare, Plus, ChevronRight } from "lucide-react";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function ConversationList({ conversations, onSelect, selectedId, onCreate }) {

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Conversations</h2>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus size={14} />
          New
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-10 text-neutral-500 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
          No conversations yet.
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => {
            const unread = conv.unread_count || 0;
            const preview = conv.last_message_body || "No messages yet";
            const isUnread = unread > 0;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selectedId === conv.id
                    ? "border-blue-300 dark:border-blue-500/60 bg-blue-50 dark:bg-blue-500/10"
                    : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300">
                  <MessageSquare size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${isUnread ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-600 dark:text-neutral-400"}`}>
                      {conv.subject || "Conversation"}
                    </p>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0">
                      {timeAgo(conv.last_message_at || conv.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={`text-[11px] line-clamp-1 truncate ${isUnread ? "text-neutral-700 dark:text-neutral-300 font-medium" : "text-neutral-500"}`}>
                      {preview}
                    </p>
                    {isUnread && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} className="text-neutral-400 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
