import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, Search, PenSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { useConversations, useMessages } from "../hooks/useMessages";
import { getConversation } from "../api/message.api";
import { getConversationDisplayName } from "../utils/conversationDisplay";
import ConversationList from "../components/ConversationList";
import MessageThread from "../components/MessageThread";
import NewConversationModal from "../components/NewConversationModal";
import { cn } from "@/lib/utils";

const FILTER = {
  ALL: "all",
  DIRECT: "direct",
  GROUP: "group_forum",
};

export default function MessagingPage() {
  const { toast } = useToast();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { conversations, loading: convLoading, error, refresh: refreshConversations, create: createConversation, remove: removeConversation } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [filter, setFilter] = useState(FILTER.ALL);
  const [search, setSearch] = useState("");

  const canCreateGroup = isSuperAdmin || isAdmin;

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const targetId = searchParams.get("conversation");
    if (!targetId || selectedConversation) return;
    const target = conversations.find((c) => c.id === targetId);
    if (target) {
      setSelectedConversation(target);
      getConversation(target.id)
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setSelectedConversation({ ...target, ...res.data.data });
          }
        })
        .catch(() => {});
    }
  }, [searchParams, conversations, selectedConversation]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter !== FILTER.ALL && c.type !== filter) return false;
      if (!q) return true;
      const name = getConversationDisplayName(c, user?.id).toLowerCase();
      const preview = (c.last_message_body || "").toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, filter, search, user?.id]);

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

  const handleSelectConversation = async (conv) => {
    setSelectedConversation(conv);
    try {
      const res = await getConversation(conv.id);
      if (res.data?.success && res.data.data) {
        setSelectedConversation({ ...conv, ...res.data.data });
      }
    } catch {
      /* keep list data if detail fetch fails */
    }
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
      setFilter(created.type === "group_forum" ? FILTER.GROUP : FILTER.DIRECT);
      refreshConversations();
    } catch (err) {
      toast.error(err.message || "Failed to create conversation");
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await removeConversation(id);
      toast.success("Conversation deleted");
      if (selectedConversation?.id === id) setSelectedConversation(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete conversation");
    }
  };

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  const filters = [
    { key: FILTER.ALL, label: "All" },
    { key: FILTER.DIRECT, label: "Direct" },
    { key: FILTER.GROUP, label: "Group Forum" },
  ];

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
        <div className="md:col-span-1 overflow-hidden border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 flex flex-col">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Chats</h2>
              <button
                onClick={() => setShowNewConversation(true)}
                title="New message"
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <PenSquare size={14} />
                New
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats"
                className="w-full rounded-full border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="inline-flex w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 p-0.5 text-xs">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "flex-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                    filter === f.key
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convLoading && !selectedConversation ? (
              <div className="flex items-center justify-center py-8 text-neutral-500 text-xs">
                Loading conversations...
              </div>
            ) : (
              <ConversationList
                conversations={filteredConversations}
                onSelect={handleSelectConversation}
                selectedId={selectedConversation?.id}
                currentUserId={user?.id}
                onDelete={handleDeleteConversation}
              />
            )}
          </div>
        </div>
        <div className="md:col-span-2 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <MessageThread
            conversation={{ ...selectedConversation, messages, current_user_id: user?.id }}
            onSend={handleSend}
            loading={msgLoading}
            onMarkAllRead={() => {
              markAllAsRead(user?.id).then(() => refreshConversations()).catch(() => {});
            }}
            onDelete={() => selectedConversation && handleDeleteConversation(selectedConversation.id)}
          />
        </div>
      </div>

      <NewConversationModal
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        currentUserId={user?.id}
        canCreateGroup={canCreateGroup}
        onCreateSuccess={handleCreateConversation}
      />
    </div>
  );
}
