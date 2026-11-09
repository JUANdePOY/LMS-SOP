import { useState, useEffect, useMemo } from "react";
import { Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { useEvents } from "../hooks/useEvents";
import { useGoogleCalendar } from "../calendar/hooks/useGoogleCalendar";
import CalendarGrid from "../components/CalendarGrid";
import EventDayDetail from "../components/EventDayDetail";
import EventDetail from "../components/EventDetail";
import EventForm from "../components/EventForm";
import GoogleCalendarModal from "../calendar/components/GoogleCalendarModal";
import EventSyncButton from "../calendar/components/EventSyncButton";
import { Modal } from "@/shared/components/ui/modal";
import { useNotifications } from "@/shared/stores/notificationStore.js";

export default function EventsPage() {
  const { isSuperAdmin, isAdmin } = useAuth();
  const canManage = isSuperAdmin || isAdmin;
  const { toast } = useToast();
  const { markEntityTypeRead } = useNotifications();
  const { items, error, refresh, create, update, remove } = useEvents({ status: "active" });
  const calendar = useGoogleCalendar();

  useEffect(() => {
    markEntityTypeRead('event');
  }, [markEntityTypeRead]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [creatingForDate, setCreatingForDate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncPhase, setSyncPhase] = useState("pending");
  const [syncResult, setSyncResult] = useState({ synced: 0, failed: 0 });

  // Memoize the form's initial data so its reference stays stable while the
  // same create/edit context is open. Without this, a new object literal is
  // created on every render, which resets the form (wiping title/description)
  // whenever the parent re-renders (e.g. selecting another day).
  const formInitialData = useMemo(() => {
    if (editingItem) return editingItem;
    if (creatingForDate) return { event_date: creatingForDate };
    return null;
  }, [editingItem, creatingForDate]);

  // Reset the sync summary whenever the modal is closed.
  useEffect(() => {
    if (!showCalendarModal) {
      setSyncPhase("pending");
      setSyncResult({ synced: 0, failed: 0 });
    }
  }, [showCalendarModal]);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (!event?.data || event.data.type !== 'google-calendar-connected') return;
      if (event.origin !== window.location.origin) return;
      if (typeof calendar.loadStatus === 'function') {
        try {
          await calendar.loadStatus(true);
        } catch {
          /* ignore */
        }
      }
      setShowCalendarModal(true);
      setSyncPhase('done');
      toast.success('Google Calendar connected');
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [calendar, toast]);

  const selectedDayEvents = items.filter((item) => {
    if (!item.event_date || !selectedDate) return false;
    const d = new Date(item.event_date);
    return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth() && d.getDate() === selectedDate.getDate();
  });

  const handleSelectDay = (date) => {
    setSelectedDate(date);
  };

  const handleCreate = (date) => {
    setEditingItem(null);
    setCreatingForDate(date || null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setCreatingForDate(null);
    setEditingItem(item);
    setShowForm(true);
  };

  const handleView = (item) => {
    setViewingItem(item);
    setShowDetail(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editingItem) {
        await update(editingItem.id, payload);
        toast.success("Event updated");
      } else {
        await create(payload);
        toast.success("Event created");
      }
      setShowForm(false);
      setEditingItem(null);
      setCreatingForDate(null);
      refresh();
    } catch (err) {
      toast.error(err.message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await remove(id);
      toast.success("Event deleted");
      refresh();
    } catch (err) {
      toast.error(err.message || "Failed to delete event");
    }
  };

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Events</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">View upcoming events and company calendar</p>
        </div>
        <button
          onClick={() => setShowCalendarModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          <Calendar size={14} />
          {calendar.status.connected ? "Manage Google Calendar" : "Connect Google Calendar"}
          {calendar.status.connected && calendar.status.googleEmail ? (
            <span className="ml-1 text-[10px] text-neutral-500 dark:text-neutral-400">({calendar.status.googleEmail})</span>
          ) : null}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CalendarGrid items={items} onSelectDay={handleSelectDay} onCreate={handleCreate} selectedDate={selectedDate} canManage={canManage} />
        </div>
        <div>
          <EventDayDetail
            date={selectedDate}
            events={selectedDayEvents}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            onCreate={handleCreate}
            canManage={canManage}
            renderSync={(evt) => (
              <EventSyncButton
                eventId={evt.id}
                calendar={calendar}
                onOpenManage={() => setShowCalendarModal(true)}
                onSynced={() => toast.success("Added to your Google Calendar")}
                onUnsynced={() => toast.success("Removed from your Google Calendar")}
              />
            )}
          />
        </div>
      </div>

      {canManage && (
        <Modal
           open={showForm}
           onClose={() => { setShowForm(false); setEditingItem(null); setCreatingForDate(null); }}
           title={editingItem ? "Edit Event" : "New Events"}
         >
            <EventForm
              initialData={formInitialData}
              onSubmit={handleSubmit}
             onCancel={() => { setShowForm(false); setEditingItem(null); }}
             saving={saving}
           />
         </Modal>
       )}

       {viewingItem && (
         <Modal
           open={showDetail}
           onClose={() => { setShowDetail(false); setViewingItem(null); }}
           title="Event Details"
         >
           <EventDetail event={viewingItem} onClose={() => { setShowDetail(false); setViewingItem(null); }} />
         </Modal>
       )}

       <GoogleCalendarModal
        open={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        calendar={{ ...calendar, onOpenManage: () => setShowCalendarModal(true) }}
        eventsCount={items.length}
        syncPhase={calendar.status.connected ? syncPhase : "unavailable"}
        syncedCount={Object.values(calendar.syncingIds).filter((s) => s === "synced").length}
        failedCount={syncResult.failed}
        onConnectStart={() => setSyncPhase("syncing")}
        onConnect={async () => {
          if (typeof calendar.loadStatus === "function") {
            try {
              await calendar.loadStatus(true);
            } catch {
              /* ignore */
            }
          }
          setSyncPhase("done");
          toast.success("Google Calendar connected");
        }}
        onDisconnect={() => {
          setSyncPhase("pending");
          setSyncResult({ synced: 0, failed: 0 });
          toast.success("Google Calendar disconnected");
        }}
      />
    </div>
  );
}
