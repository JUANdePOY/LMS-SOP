import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Check, CheckCheck } from "lucide-react";

function formatTime(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default function MessageThread({ conversation, onSend, loading, onMarkAllRead }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      <div className="flex h-full items-center justify-center text-neutral-500 text-sm">
        Select a conversation to start messaging
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {conversation.subject || "Conversation"}
        </h3>
        {hasUnread && onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <CheckCheck size={12} />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 size={18} className="animate-spin text-neutral-400" />
          </div>
        )}
        {!loading && conversation.messages?.length === 0 ? (
          <div className="text-center text-neutral-500 text-xs py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          !loading && conversation.messages?.map((msg) => {
            const isMine = msg.sender_id === conversation.current_user_id;
            const isRead = !!msg.read_at;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                  isMine
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-none"
                }`}>
                  {!isMine && (
                    <p className="text-[10px] font-medium mb-1 opacity-70">{msg.sender_name || "User"}</p>
                  )}
                  <p>{msg.body}</p>
                  <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? "text-blue-100" : "text-neutral-500"}`}>
                    {formatTime(msg.sent_at)}
                    {isMine && (
                      isRead ? <CheckCheck size={10} /> : <Check size={10} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-neutral-200 dark:border-neutral-700 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
