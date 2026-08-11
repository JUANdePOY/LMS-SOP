import { Briefcase, MessageSquare } from "lucide-react";
import UserAvatar from "@/shared/components/ui/Avatar";
import { resolveFileUrl } from "@/lib/fileUrl";

function Cover({ profile }) {
  const bg = profile?.cover_photo_url
    ? `url(${resolveFileUrl(profile.cover_photo_url)})`
    : undefined;
  return (
    <div
      className="h-20 w-full bg-gradient-to-r from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-secondary)] bg-cover bg-center"
      style={bg ? { backgroundImage: bg } : undefined}
    />
  );
}

export default function EmployeeCard({ employee, onView, onMessage }) {
  const name = employee?.full_name || employee?.display_name || "Unknown";
  const subtitle = employee?.position_title || employee?.role?.replace("_", " ") || "";
  const dept = employee?.department_name;

  return (
    <div className="fb-card overflow-hidden group">
      <button
        type="button"
        onClick={() => onView(employee)}
        className="block w-full text-left focus:outline-none"
        aria-label={`View profile of ${name}`}
      >
        <Cover profile={employee} />
        <div className="px-4 pb-4">
          <div className="-mt-8 mb-2">
            <UserAvatar
              user={employee}
              size="xl"
              className="h-16 w-16 ring-4 ring-white dark:ring-neutral-900 shadow"
            />
          </div>
          <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {name}
          </h3>
          {subtitle && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{subtitle}</p>
          )}
          {dept && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
              <Briefcase size={12} className="shrink-0" />
              <span className="truncate">{dept}</span>
            </p>
          )}
        </div>
      </button>

      <div className="px-3 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onView(employee)}
          className="flex-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          View Profile
        </button>
        <button
          type="button"
          onClick={() => onMessage(employee)}
          title="Message"
          className="inline-flex items-center justify-center rounded-md btn-primary px-2.5 py-1.5 text-white hover-brand"
          aria-label={`Message ${name}`}
        >
          <MessageSquare size={14} />
        </button>
      </div>
    </div>
  );
}
