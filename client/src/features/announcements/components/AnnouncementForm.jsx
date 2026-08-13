import { useState, useEffect } from "react";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const [title, setTitle] = useState(initialData?.title || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [type, setType] = useState(initialData?.type || "General");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [status, setStatus] = useState(initialData?.status || "active");
  const [targetRoles, setTargetRoles] = useState(() => parseJsonField(initialData?.target_roles, []));
  const [targetDepartments, setTargetDepartments] = useState(() => parseJsonField(initialData?.target_departments, []));

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setBody(initialData.body || "");
      setType(initialData.type || "General");
      setPriority(initialData.priority || "medium");
      setStatus(initialData.status || "active");
      setTargetRoles(parseJsonField(initialData.target_roles, []));
      setTargetDepartments(parseJsonField(initialData.target_departments, []));
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
      target_roles: targetRoles,
      target_departments: targetDepartments,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Target Roles (optional)</label>
          <input
            type="text"
            value={targetRoles.join(", ")}
            onChange={(e) => setTargetRoles(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            placeholder="e.g. employee, department_head"
          />
          <p className="text-[10px] text-neutral-400 mt-1">Comma-separated. Leave blank for all roles.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Target Departments (optional)</label>
          <input
            type="text"
            value={targetDepartments.join(", ")}
            onChange={(e) => setTargetDepartments(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            placeholder="e.g. OPS, IT"
          />
          <p className="text-[10px] text-neutral-400 mt-1">Comma-separated department codes. Leave blank for all departments.</p>
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

function parseJsonField(value, fallback) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
