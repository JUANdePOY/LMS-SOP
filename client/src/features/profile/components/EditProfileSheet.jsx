import { Modal } from "@/shared/components/ui/modal";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

function toDateInputValue(value) {
  if (!value) return "";
  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return value || "";
  }
}

function FieldInput({ field, value, onChange }) {
  const base = cn(
    "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
    "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
    "focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] focus:border-[var(--color-primary)]"
  );
  if (field.type === "select") {
    return (
      <select value={value || ""} onChange={(e) => onChange(field.key, e.target.value)} className={base}>
        <option value="">Select...</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea rows={2} value={value || ""} onChange={(e) => onChange(field.key, e.target.value)} className={cn(base, "resize-none")} placeholder={`Enter ${field.label.toLowerCase()}`} />
    );
  }
  return (
    <input
      type={field.type === "date" ? "date" : field.type}
      value={field.type === "date" ? toDateInputValue(value) : (value || "")}
      onChange={(e) => onChange(field.key, e.target.value)}
      className={base}
      placeholder={field.type === "date" ? "" : `Enter ${field.label.toLowerCase()}`}
    />
  );
}

export default function EditProfileSheet({ open, onClose, fields, profile, onChange, onSave, saving }) {
  const footer = (
    <div className="flex justify-end gap-2">
      <button onClick={onClose} disabled={saving} className="rounded-lg px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800">
        Cancel
      </button>
      <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs btn-primary text-white disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Changes
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile" footer={footer}>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              {field.label}
            </label>
            <FieldInput field={field} value={profile?.[field.key]} onChange={onChange} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
