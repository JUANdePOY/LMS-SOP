import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Check, CheckCheck, Users, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getInitials,
  getConversationDisplayName,
  getOtherParticipants,
} from "../utils/conversationDisplay";

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function dayLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - msgDay) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function Header({ conversation }) {
  const [confirming, setConfirming] = useState(false);
  const isGroup = conversation?.type === "group_forum";
  const name = getConversationDisplayName(conversation, conversation?.current_user_id);
  const others = getOtherParticipants(conversation, conversation?.current_user_id);
  const other = others.length === 1 ? others[0] : null;
  const subtitle = isGroup
    ? `${(conversation?.participants || []).length} members`
    : (other?.role ? other.role.replace("_", " ") : "Member");

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium",
              isGroup
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            )}
          >
            {isGroup ? <Users size={18} /> : getInitials(name)}
          </span>
          {!isGroup && other && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {name}
          </h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1.5">
            {!isGroup && other && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <div className="relative">
          <button
            onClick={() => setConfirming((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            title="Delete conversation"
          >
            <Trash2 size={16} />
          </button>
          {confirming && (
            <div className="absolute right-0 top-11 z-20 w-56 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 shadow-lg">
              <p className="text-xs text-neutral-700 dark:text-neutral-200 mb-2">
                Delete this conversation? This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="rounded-md px-2.5 py-1 text-xs border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                {conversation?.onDelete && (
                  <button
                    onClick={() => {
                      setConfirming(false);
                      conversation.onDelete();
                    }}
                    className="rounded-md px-2.5 py-1 text-xs bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessageThread({ conversation, onSend, loading, onMarkAllRead, onDelete }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const lastMessageId = useRef(null);

  useEffect(() => {
    const msgs = conversation?.messages || [];
    const newestId = msgs.length ? msgs[msgs.length - 1].id : null;
    if (newestId && newestId !== lastMessageId.current) {
      lastMessageId.current = newestId;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText("");
    } finally {
      setSending(false);
    }
  };

  const hasUnread = conversation?.messages?.some(
    (m) => !m.read_at && m.sender_id !== conversation.current_user_id
  );

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-neutral-400 bg-neutral-50/50 dark:bg-neutral-950/30">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Users size={28} className="text-neutral-400" />
        </div>
        <p className="mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">Select a chat to start messaging</p>
        <p className="text-xs text-neutral-400">Your conversations will appear here</p>
      </div>
    );
  }

  const enriched = { ...conversation, onDelete };
  const isGroup = conversation?.type === "group_forum";

  let lastDay = null;

  return (
    <div className="flex h-full flex-col">
      <Header conversation={enriched} />

      {hasUnread && onMarkAllRead && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <CheckCheck size={12} />
            Mark all as read
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-neutral-50/40 dark:bg-neutral-950/20">
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 size={18} className="animate-spin text-neutral-400" />
          </div>
        )}
        {!loading && conversation.messages?.length === 0 ? (
          <div className="text-center text-neutral-500 text-sm py-8">
            No messages yet. Say hello!
          </div>
        ) : (
          !loading && conversation.messages?.map((msg) => {
            const isMine = msg.sender_id === conversation.current_user_id;
            const isRead = !!msg.read_at;
            const day = dayLabel(msg.sent_at);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={msg.id}>
                {showDay && (
                  <div className="flex justify-center my-3">
                    <span className="rounded-full bg-neutral-200/70 dark:bg-neutral-800 px-3 py-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                      {day}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3 py-2 text-sm shadow-sm ${
                    isMine
                      ? "bg-blue-600 text-white rounded-2xl rounded-br-md"
                      : "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-2xl rounded-bl-md border border-neutral-100 dark:border-neutral-700"
                  }`}>
                    {!isMine && isGroup && (
                      <p className="text-[10px] font-semibold mb-1 text-blue-600 dark:text-blue-400">
                        {msg.sender_name || "User"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words leading-snug">{msg.body}</p>
                    <div className={cn(
                      "text-[10px] mt-1 flex items-center gap-1 justify-end",
                      isMine ? "text-blue-100" : "text-neutral-400"
                    )}>
                      {formatTime(msg.sent_at)}
                      {isMine && (isRead ? <CheckCheck size={11} /> : <Check size={11} />)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-neutral-200 dark:border-neutral-700 p-3 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
