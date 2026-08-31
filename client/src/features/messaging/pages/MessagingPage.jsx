import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { FadeIn } from "@/shared/motion";

const FILTER = {
  ALL: "all",
  DIRECT: "direct",
  GROUP: "group_forum",
};

export default function MessagingPage() {
  const { toast } = useToast();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { conversations, loading: convLoading, error, refresh: refreshConversations, create: createConversation } = useConversations();
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

  // On initial load (no deep-link), auto-open the conversation with the most
  // recent message so the user lands on live activity rather than the Saved
  // Messages self-chat. Only runs once.
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || selectedConversation) return undefined;
    const targetId = searchParams.get("conversation");
    const toId = searchParams.get("to");
    if (targetId || toId || convLoading || !conversations.length || !user?.id) {
      return undefined;
    }
    const isSelfChat = (c) =>
      c.type !== "group_forum" &&
      (c.participants || []).filter((p) => p.id !== user.id).length === 0;
    const sorted = [...conversations]
      .filter((c) => !isSelfChat(c) && c.last_message_at)
      .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    const latest = sorted[0];
    if (latest) {
      handleSelectConversation(latest);
      autoSelectedRef.current = true;
    }
    return undefined;
  }, [conversations, convLoading, searchParams, selectedConversation, user?.id, handleSelectConversation]);

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

  // Keep the conversation list fresh so a newly received direct message
  // (e.g. an employee messaging an admin) shows up for the recipient without
  // requiring a manual page refresh.
  useEffect(() => {
    const id = setInterval(() => {
      refreshConversations();
    }, 10000);
    return () => clearInterval(id);
  }, [refreshConversations]);

  const handleSend = async ({ text, mentions, files }) => {
    try {
      await send({ text, mentions, files });
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

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  const filters = [
    { key: FILTER.ALL, label: "All" },
    { key: FILTER.DIRECT, label: "Direct" },
    { key: FILTER.GROUP, label: "Group Forum" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-0">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <MessageSquare size={20} className="text-neutral-400 dark:text-neutral-500" />
          Messaging
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Communicate with your team members</p>
      </div>

      <div className="grid h-[calc(100dvh-12rem)] grid-cols-1 gap-0 sm:gap-4 md:h-[calc(100vh-12rem)] md:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        <div className={cn(
          "fb-card flex min-h-0 flex-col overflow-hidden rounded-xl",
          selectedConversation ? "hidden md:flex" : "flex"
        )}>
          <MessengerHeader
            filters={filters}
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
            onNew={() => setShowNewConversation(true)}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {convLoading && !selectedConversation ? (
              <div className="flex items-center justify-center py-8 text-neutral-500 text-xs">
                Loading conversations...
              </div>
            ) : (
              <FadeIn>
                <ConversationList
                  conversations={filteredConversations}
                  onSelect={handleSelectConversation}
                  selectedId={selectedConversation?.id}
                  currentUserId={user?.id}
                />
              </FadeIn>
            )}
          </div>
        </div>
        <div className={cn(
          "fb-card flex min-h-0 flex-col overflow-hidden rounded-xl",
          selectedConversation ? "flex" : "hidden md:flex"
        )}>
          <MessageThread
            conversation={{ ...selectedConversation, messages, current_user_id: user?.id }}
            onSend={handleSend}
            loading={msgLoading}
            onBack={() => setSelectedConversation(null)}
            onMarkAllRead={() => {
              markAllAsRead(user?.id).then(() => refreshConversations()).catch(() => {});
            }}
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
