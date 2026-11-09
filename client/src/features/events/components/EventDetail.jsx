import { Calendar, MapPin, User, Clock, Tag, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";

const PRIORITY_STYLES = {
  low: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  medium: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  high: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  critical: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
};

const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const STATUS_STYLES = {
  active: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  inactive: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  completed: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  cancelled: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
};

const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TYPE_LABELS = {
  Training: "Training",
  Deployment: "Deployment",
  Meeting: "Meeting",
  Emergency: "Emergency",
  Other: "Other",
};

function formatDateOnly(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("default", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTimeOnly(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function Chip({ children, className = "" }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300", className)}>
      {children}
    </span>
  );
}

function FactCard({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} className="text-neutral-400 dark:text-neutral-500" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SectionCard({ label, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-neutral-400 dark:text-neutral-500" />}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

export default function EventDetail({ event, onClose }) {
  const endDate = event?.end_date ? new Date(event.end_date) : null;
  const priority = event?.priority || "medium";
  const status = event?.status || "active";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          <Calendar size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-snug tracking-tight text-neutral-900 dark:text-neutral-50">
            {event?.title || "Untitled Event"}
          </h2>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <Clock size={14} className="shrink-0 text-neutral-400" />
            <span>{formatDateOnly(event?.event_date)}</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FactCard icon={Tag} label="Type">
          <Chip className="bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
            <Tag size={12} />
            {TYPE_LABELS[event?.event_type] || event?.event_type || "—"}
          </Chip>
        </FactCard>

        <FactCard icon={CheckCircle2} label="Priority">
          <Chip className={PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}>
            {PRIORITY_LABELS[priority] || priority}
          </Chip>
        </FactCard>

        <FactCard icon={CheckCircle2} label="Status">
          <Chip className={STATUS_STYLES[status] || STATUS_STYLES.active}>
            <CheckCircle2 size={12} />
            {STATUS_LABELS[status] || status}
          </Chip>
        </FactCard>

        <FactCard icon={Clock} label="Date & Time">
          <div className="space-y-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-neutral-400" />
              <span>{formatTimeOnly(event?.event_date)}</span>
            </div>
            {endDate ? (
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                <span className="pl-[21px] text-xs text-neutral-400">to</span>
                <span>{formatTimeOnly(event?.end_date)}</span>
              </div>
            ) : null}
          </div>
        </FactCard>
      </div>

      {event?.location && (
        <SectionCard label="Location" icon={MapPin}>
          <p className="text-[15px] leading-7 text-neutral-700 dark:text-neutral-200">{event.location}</p>
        </SectionCard>
      )}

      {event?.organizer && (
        <SectionCard label="Organizer" icon={User}>
          <p className="text-[15px] leading-7 text-neutral-700 dark:text-neutral-200">{event.organizer}</p>
        </SectionCard>
      )}

      {event?.description && (
        <SectionCard label="Description">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-neutral-700 dark:text-neutral-200">
            {event.description}
          </p>
        </SectionCard>
      )}

      {Array.isArray(event?.target_roles) && event.target_roles.length > 0 && (
        <SectionCard label="Target Roles" icon={CheckCircle2}>
          <p className="text-[15px] leading-7 text-neutral-700 dark:text-neutral-200">
            {event.target_roles.join(", ")}
          </p>
        </SectionCard>
      )}

      {Array.isArray(event?.target_departments) && event.target_departments.length > 0 && (
        <SectionCard label="Target Departments" icon={CheckCircle2}>
          <p className="text-[15px] leading-7 text-neutral-700 dark:text-neutral-200">
            {event.target_departments.join(", ")}
          </p>
        </SectionCard>
      )}

      <footer className="flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </footer>
    </div>
  );
}
