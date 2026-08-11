import { useEffect } from "react";
import { X, Mail, Phone, MapPin, Briefcase, Calendar, BadgeCheck, MessageSquare } from "lucide-react";
import UserAvatar from "@/shared/components/ui/Avatar";
import { resolveFileUrl } from "@/lib/fileUrl";

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon size={16} className="mt-0.5 shrink-0 text-neutral-400" />
      <div className="min-w-0">
        <p className="text-neutral-800 dark:text-neutral-200 leading-snug break-words">{value}</p>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

export default function EmployeeProfileDrawer({ employee, open, onClose, onMessage }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !employee) return null;

  const name = employee.full_name || employee.display_name || "Unknown";
  const coverBg = employee.cover_photo_url
    ? `url(${resolveFileUrl(employee.cover_photo_url)})`
    : undefined;

  const rows = [
    employee.bio ? { icon: BadgeCheck, label: "Bio", value: employee.bio } : null,
    employee.position_title ? { icon: Briefcase, label: "Works at", value: employee.position_title } : null,
    employee.employee_id ? { icon: BadgeCheck, label: "Employee ID", value: employee.employee_id } : null,
    employee.employment_status ? { icon: BadgeCheck, label: "Employment status", value: employee.employment_status } : null,
    employee.date_hired ? { icon: Calendar, label: "Joined", value: employee.date_hired } : null,
    employee.contact_number ? { icon: Phone, label: "Contact", value: employee.contact_number } : null,
    employee.address ? { icon: MapPin, label: "Lives in", value: employee.address } : null,
    employee.email ? { icon: Mail, label: "Email", value: employee.email } : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Profile of ${name}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-md bg-[var(--bg-surface)] shadow-xl flex flex-col animate-[fadeIn_0.2s_ease]">
        <div className="relative h-40 sm:h-48 w-full bg-gradient-to-r from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-secondary)] bg-cover bg-center"
          style={coverBg ? { backgroundImage: coverBg } : undefined}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/55 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 flex-1 overflow-y-auto">
          <div className="-mt-12 flex items-end gap-4">
            <UserAvatar
              user={employee}
              size="xl"
              className="h-24 w-24 ring-4 ring-white dark:ring-neutral-900 shadow-md"
            />
            <div className="pb-1 min-w-0">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 truncate">{name}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                {employee.position_title || employee.role?.replace("_", " ")}
              </p>
              {employee.department_name && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{employee.department_name}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onMessage(employee)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md btn-primary px-3 py-2 text-sm font-semibold text-white hover-brand"
            >
              <MessageSquare size={15} />
              Message
            </button>
          </div>

          <div className="mt-5">
            <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Intro</h3>
            {rows.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No details shared.</p>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => (
                  <Row key={row.label} {...row} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
