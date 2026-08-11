import { useState, useEffect } from "react";

const EVENT_TYPE_OPTIONS = [
  { value: "Training", label: "Training" },
  { value: "Deployment", label: "Deployment" },
  { value: "Meeting", label: "Meeting" },
  { value: "Emergency", label: "Emergency" },
  { value: "Other", label: "Other" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function EventForm({ initialData, onSubmit, onCancel, saving }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [eventType, setEventType] = useState(initialData?.event_type || "Training");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [status, setStatus] = useState(initialData?.status || "active");
  const [eventDate, setEventDate] = useState(initialData?.event_date ? initialData.event_date.slice(0, 16) : "");
  const [endDate, setEndDate] = useState(initialData?.end_date ? initialData.end_date.slice(0, 16) : "");
  const [location, setLocation] = useState(initialData?.location || "");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setEventType(initialData.event_type || "Training");
      setPriority(initialData.priority || "medium");
      setStatus(initialData.status || "active");
      setEventDate(initialData.event_date ? initialData.event_date.slice(0, 16) : "");
      setEndDate(initialData.end_date ? initialData.end_date.slice(0, 16) : "");
      setLocation(initialData.location || "");
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      event_type: eventType,
      priority,
      status,
      event_date: eventDate,
      end_date: endDate || null,
      location: location || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          placeholder="Event title"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          placeholder="Event description..."
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Event Type</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Start Date & Time</label>
          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">End Date & Time</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            placeholder="Event location"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm btn-primary disabled:opacity-50">
          {saving ? "Saving..." : initialData ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
