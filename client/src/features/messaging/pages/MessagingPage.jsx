import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { useConversations, useMessages } from "../hooks/useMessages";
import { getConversation } from "../api/message.api";
import { getConversationDisplayName, findExistingDirectConversation } from "../utils/conversationDisplay";
import { getUser } from "@/services/api";
import ConversationList from "../components/ConversationList";
import MessageThread from "../components/MessageThread";
import NewConversationModal from "../components/NewConversationModal";
import MessengerHeader from "../components/MessengerHeader";

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
  const [presetUser, setPresetUser] = useState(null);
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

  // Deep-link from the employee directory: "?to=<userId>" opens an existing
  // 1:1 thread or pre-fills the new-conversation modal with that recipient.
  const handleSelectConversation = useCallback(async (conv) => {
    setSelectedConversation(conv);
    try {
      const res = await getConversation(conv.id);
      if (res.data?.success && res.data.data) {
        setSelectedConversation({ ...conv, ...res.data.data });
      }
    } catch {
      /* keep list data if detail fetch fails */
    }
  }, []);

  const handledToRef = useRef(null);
  useEffect(() => {
    const toId = searchParams.get("to");
    if (!toId) {
      handledToRef.current = null;
      return undefined;
    }
    if (handledToRef.current === toId || convLoading) return undefined;

    const id = Number(toId);
    const existing = findExistingDirectConversation(conversations, id);
    if (existing) {
      handleSelectConversation(existing);
      handledToRef.current = toId;
      return undefined;
    }

    let active = true;
    getUser(toId)
      .then((res) => {
        if (!active) return;
        const u = res.data?.data;
        if (u) {
          setPresetUser({
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            role: u.role,
            employee_id: u.employee_id,
            avatar_url: u.avatar_url,
          });
          setShowNewConversation(true);
          handledToRef.current = toId;
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [searchParams, conversations, convLoading, handleSelectConversation]);

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

  const handleOpenExisting = (conv) => {
    handleSelectConversation(conv);
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
        <div className="md:col-span-1 overflow-hidden fb-card flex flex-col">
          <MessengerHeader
            filters={filters}
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
            onNew={() => setShowNewConversation(true)}
          />
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
        <div className="md:col-span-2 overflow-hidden fb-card">
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
        onClose={() => {
          setShowNewConversation(false);
          setPresetUser(null);
        }}
        currentUserId={user?.id}
        canCreateGroup={canCreateGroup}
        conversations={conversations}
        presetUser={presetUser}
        onCreateSuccess={handleCreateConversation}
        onOpenExisting={handleOpenExisting}
      />
    </div>
  );
}
