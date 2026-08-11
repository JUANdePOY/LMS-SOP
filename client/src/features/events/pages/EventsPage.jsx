import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { useEvents } from "../hooks/useEvents";
import { useGoogleCalendar } from "../calendar/hooks/useGoogleCalendar";
import CalendarGrid from "../components/CalendarGrid";
import EventDayDetail from "../components/EventDayDetail";
import EventForm from "../components/EventForm";
import GoogleCalendarModal from "../calendar/components/GoogleCalendarModal";
import EventSyncButton from "../calendar/components/EventSyncButton";
import { Modal } from "@/shared/components/ui/modal";

export default function EventsPage() {
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin'].includes(user?.role);
  const { toast } = useToast();
  const { items, error, refresh, create, update, remove } = useEvents({ status: "active" });
  const calendar = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  // Tracks the initial bulk-sync phase shown in the Google Calendar modal:
  // 'pending' (connected, bulk sync not yet observed), 'syncing' (pushing events), 'done' (finished).
  const [syncPhase, setSyncPhase] = useState("pending");
  const [syncResult, setSyncResult] = useState({ synced: 0, failed: 0 });

  // Once the calendar reports connected, the server has already finished the
  // initial bulk sync — force the summary to "done" so the spinner can never
  // get stuck if the connect promise/callback is delayed, missed, or blocked
  // by Cross-Origin-Opener-Policy (which severs the popup<->opener link and
  // can prevent the connect() promise from resolving in some browsers).
  // Transition from ANY active phase ("syncing"/"pending"), not just "idle",
  // otherwise the summary stays stuck on "Adding your events…".
  useEffect(() => {
    if (calendar.status.connected) {
      setSyncPhase((prev) => (prev === "done" ? prev : "done"));
      setSyncResult((prev) => (prev.synced === 0 ? { synced: items.length, failed: 0 } : prev));
      calendar.markEventsSynced(items.map((i) => i.id));
    }
  }, [calendar.status.connected, items, items.length, calendar]);

  // Reset the sync summary whenever the modal is closed.
  useEffect(() => {
    if (!showCalendarModal) {
      setSyncPhase("pending");
      setSyncResult({ synced: 0, failed: 0 });
    }
  }, [showCalendarModal]);

  const selectedDayEvents = items.filter((item) => {
    if (!item.event_date || !selectedDate) return false;
    const d = new Date(item.event_date);
    return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth() && d.getDate() === selectedDate.getDate();
  });

  const handleSelectDay = (date) => {
    setSelectedDate(date);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
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
          {calendar.status.connected ? (calendar.status.googleEmail || "Google Calendar") : "Connect Google Calendar"}
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
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          title={editingItem ? "Edit Event" : "New Event"}
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowForm(false); setEditingItem(null); }}
                className="rounded-lg px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600"
              >
                Cancel
              </button>
            </div>
          }
        >
          <EventForm
            initialData={editingItem}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
            saving={saving}
          />
        </Modal>
      )}

      <GoogleCalendarModal
        open={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        calendar={{ ...calendar, onOpenManage: () => setShowCalendarModal(true) }}
        eventsCount={items.length}
        syncPhase={calendar.status.connected ? syncPhase : "unavailable"}
        syncedCount={syncResult.synced}
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
          setSyncResult({ synced: items.length, failed: 0 });
          calendar.markEventsSynced(items.map((i) => i.id));
          toast.success(
            items.length > 0
              ? `${items.length} event${items.length === 1 ? "" : "s"} added to your Google Calendar`
              : "Google Calendar connected"
          );
        }}
        onDisconnect={() => {
            setSyncPhase("pending");
          setSyncResult({ synced: 0, failed: 0 });
          calendar.markEventsSynced([]);
          toast.success("Google Calendar disconnected");
        }}
      />
    </div>
  );
}
