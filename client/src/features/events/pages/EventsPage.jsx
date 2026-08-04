import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { useEvents } from "../hooks/useEvents";
import CalendarGrid from "../components/CalendarGrid";
import EventDayDetail from "../components/EventDayDetail";
import EventForm from "../components/EventForm";
import { Modal } from "@/shared/components/ui/modal";

export default function EventsPage() {
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin'].includes(user?.role);
  const { toast } = useToast();
  const { items, error, refresh, create, update, remove } = useEvents({ status: "active" });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

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
    </div>
  );
}
