import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { useConversations, useMessages } from "../hooks/useMessages";
import ConversationList from "../components/ConversationList";
import MessageThread from "../components/MessageThread";
import { Modal } from "@/shared/components/ui/modal";
import { getUsers } from "@/features/organization-management/api/users.api";

export default function MessagingPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { conversations, loading: convLoading, error, refresh: refreshConversations, create: createConversation } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");

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

  useEffect(() => {
    if (showNewConversation) {
      getUsers({ limit: 50 })
        .then((res) => {
          const list = res.data?.data || res.data || [];
          setUsers(Array.isArray(list) ? list : []);
        })
        .catch(() => setUsers([]));
    }
  }, [showNewConversation]);

  const filteredUsers = userSearch
    ? users.filter((u) => (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  const handleSelectConversation = async (conv) => {
    setSelectedConversation(conv);
  };

  const handleSend = async (body) => {
    try {
      await send(body);
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
  };

  const handleCreateConversation = async () => {
    if (!newBody.trim()) return;
    try {
      await createConversation({
        subject: newSubject.trim() || null,
        body: newBody.trim(),
        participantIds: selectedUserIds,
      });
      toast.success("Conversation created");
      setShowNewConversation(false);
      setNewSubject("");
      setNewBody("");
      setSelectedUserIds([]);
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

      <Modal
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        title="New Conversation"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewConversation(false)} className="rounded-lg px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600">
              Cancel
            </button>
            <button onClick={handleCreateConversation} className="rounded-lg px-3 py-1.5 text-xs bg-blue-600 text-white">
              Create
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Subject</label>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              placeholder="Conversation subject"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Message</label>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              placeholder="Type your message..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Recipients</label>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm mb-2"
            />
            <div className="max-h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
              {filteredUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => {
                      setSelectedUserIds((prev) =>
                        prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                      );
                    }}
                  />
                  <span className="text-xs text-neutral-700 dark:text-neutral-300">{u.full_name || u.email}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
