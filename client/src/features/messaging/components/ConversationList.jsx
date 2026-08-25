import { ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import UserAvatar from "@/shared/components/ui/Avatar";
import {
  getConversationDisplayName,
  getDisplayName,
  timeAgo,
} from "../utils/conversationDisplay";

function PresenceDot({ online }) {
  if (!online) return null;
  return <span className="presence-dot" aria-label="Online" />;
}

function StackedAvatars({ participants, max = 3 }) {
  const shown = participants.slice(0, max);
  const extra = participants.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <span
          key={p.id || i}
          className="ring-2 ring-white dark:ring-neutral-900 rounded-full relative"
          title={getDisplayName(p)}
        >
          <UserAvatar user={p} size="sm" className="h-9 w-9" ring />
          <PresenceDot online={p.online} />
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

export default function ConversationList({ conversations, onSelect, selectedId, currentUserId }) {
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
          const other = !isGroup
            ? ((conv.participants || []).find((p) => p.id !== currentUserId) || null)
            : null;
          return (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-3 rounded-lg p-2.5 transition-colors",
                selectedId === conv.id
                  ? "bg-[rgba(242,92,5,0.08)] dark:bg-[rgba(242,92,5,0.16)]"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <button onClick={() => onSelect(conv)} className="flex flex-1 items-center gap-3 min-w-0 text-left">
                {isGroup ? (
                  <StackedAvatars participants={conv.participants || []} />
                ) : (
                  <span className="relative shrink-0">
                    <UserAvatar
                      user={other || { full_name: name }}
                      size="md"
                      className="h-12 w-12"
                    />
                    <PresenceDot online={other?.online} />
                  </span>
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
                      isUnread ? "text-[var(--color-primary)] dark:text-[var(--color-primary)] font-medium" : "text-neutral-400 dark:text-neutral-500"
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
                      <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 shrink-0 block max-md:block md:hidden group-hover:md:block" />
            </div>
          );
        })
      )}
    </div>
  );
}
