import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { useConversations, useMessages } from "../hooks/useMessages";
import ConversationList from "../components/ConversationList";
import MessageThread from "../components/MessageThread";
import NewConversationModal from "../components/NewConversationModal";

export default function MessagingPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { conversations, loading: convLoading, error, refresh: refreshConversations, create: createConversation } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewConversation, setShowNewConversation] = useState(false);

  const { messages, loading: msgLoading, send, markAllAsRead } = useMessages(selectedConversation?.id);

  useEffect(() => {
    if (!selectedConversation || !messages || !messages.length || !user?.id) return;
    const unread = messages.filter((m) => !m.read_at && m.sender_id !== user?.id);
    if (unread.length > 0) {
      markAllAsRead(user.id).then(() => {
        refreshConversations();
      }).catch(() => {});
    }
  }, [selectedConversation, messages, user?.id, markAllAsRead, refreshConversations]);

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
  };

  const handleSend = async (body) => {
    try {
      await send(body);
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
  };

  const handleCreateConversation = async (payload) => {
    try {
      const created = await createConversation(payload);
      toast.success("Conversation created");
      setShowNewConversation(false);
      setSelectedConversation(created);
      refreshConversations();
    } catch (err) {
      toast.error(err.message || "Failed to create conversation");
    }
  };

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <MessageSquare size={20} className="text-neutral-400 dark:text-neutral-500" />
          Messaging
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Communicate with your team members</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
        <div className="md:col-span-1 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900">
          {convLoading && !selectedConversation ? (
            <div className="flex items-center justify-center py-8 text-neutral-500 text-xs">
              Loading conversations...
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              onSelect={handleSelectConversation}
              selectedId={selectedConversation?.id}
              onCreate={() => setShowNewConversation(true)}
            />
          )}
        </div>
        <div className="md:col-span-2 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <MessageThread
            conversation={{ ...selectedConversation, messages, current_user_id: user?.id }}
            onSend={handleSend}
            loading={msgLoading}
            onMarkAllRead={() => {
              markAllAsRead(user?.id).then(() => refreshConversations()).catch(() => {});
            }}
          />
        </div>
      </div>

      <NewConversationModal
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        currentUserId={user?.id}
        onCreateSuccess={handleCreateConversation}
      />
    </div>
  );
}
