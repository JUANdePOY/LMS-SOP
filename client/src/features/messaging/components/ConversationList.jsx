import { ChevronRight, Users, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getInitials,
  getConversationDisplayName,
  timeAgo,
} from "../utils/conversationDisplay";

function Avatar({ name, isGroup, className = "h-12 w-12" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-sm font-medium",
        isGroup
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        className
      )}
    >
      {isGroup ? <Users size={20} /> : getInitials(name || "?")}
    </span>
  );
}

function StackedAvatars({ participants, max = 3 }) {
  const shown = participants.slice(0, max);
  const extra = participants.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <span
          key={p.id || i}
          className="ring-2 ring-white dark:ring-neutral-900 rounded-full"
          title={p.full_name || p.email}
        >
          <Avatar name={p.full_name || p.email} className="h-9 w-9 text-[11px]" />
        </span>
      ))}
      {extra > 0 && (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-[11px] font-medium text-neutral-600 dark:text-neutral-200 ring-2 ring-white dark:ring-neutral-900">
          +{extra}
        </span>
      )}
    </div>
  );
}

export default function ConversationList({ conversations, onSelect, selectedId, currentUserId, onDelete }) {
  return (
    <div className="space-y-0.5 p-2">
      {conversations.length === 0 ? (
        <div className="text-center py-10 text-neutral-500 text-sm">
          No chats found.
        </div>
      ) : (
        conversations.map((conv) => {
          const unread = conv.unread_count || 0;
          const preview = conv.last_message_body || "No messages yet";
          const isUnread = unread > 0;
          const isGroup = conv.type === "group_forum";
          const name = getConversationDisplayName(conv, currentUserId);
          return (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-3 rounded-lg p-2.5 transition-colors",
                selectedId === conv.id
                  ? "bg-blue-50 dark:bg-blue-500/10"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
              )}
            >
              <button onClick={() => onSelect(conv)} className="flex flex-1 items-center gap-3 min-w-0 text-left">
                {isGroup ? (
                  <StackedAvatars participants={conv.participants || []} />
                ) : (
                  <Avatar name={name} isGroup={false} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      "text-sm truncate flex items-center gap-1",
                      isUnread ? "font-semibold text-neutral-900 dark:text-neutral-100" : "font-medium text-neutral-700 dark:text-neutral-300"
                    )}>
                      {isGroup && <Users size={12} className="text-neutral-400 shrink-0" />}
                      {name}
                    </p>
                    <span className={cn(
                      "text-[10px] shrink-0",
                      isUnread ? "text-blue-600 dark:text-blue-400 font-medium" : "text-neutral-400 dark:text-neutral-500"
                    )}>
                      {timeAgo(conv.last_message_at || conv.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={cn(
                      "text-[12px] line-clamp-1 truncate",
                      isUnread ? "text-neutral-700 dark:text-neutral-300 font-medium" : "text-neutral-500"
                    )}>
                      {preview}
                    </p>
                    {isUnread && (
                      <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <button
                onClick={() => onDelete && onDelete(conv.id)}
                title="Delete conversation"
                className="shrink-0 hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 size={15} />
              </button>
              <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 shrink-0 hidden group-hover:block" />
            </div>
          );
        })
      )}
    </div>
  );
}
