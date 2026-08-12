import { useState, useEffect } from "react";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const TYPE_OPTIONS = [
  { value: "General", label: "General" },
  { value: "Training", label: "Training" },
  { value: "Deployment", label: "Deployment" },
  { value: "Administrative", label: "Administrative" },
  { value: "Emergency", label: "Emergency" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function AnnouncementForm({ initialData, onSubmit, onCancel, saving }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [type, setType] = useState(initialData?.type || "General");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [status, setStatus] = useState(initialData?.status || "active");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setBody(initialData.body || "");
      setType(initialData.type || "General");
      setPriority(initialData.priority || "medium");
      setStatus(initialData.status || "active");
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      type,
      priority,
      status,
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
          placeholder="Announcement title"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Content</label>
        <RichTextEditor
          value={body}
          onChange={(html) => setBody(html)}
          placeholder="Enter announcement content..."
          onImageUpload={async (file) => {
            const dataUrl = await fileToDataUrl(file);
            return dataUrl;
          }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((opt) => (
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
