import { useState, useEffect } from "react";
import { Megaphone, Calendar, X, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEFAULT_BANNERS = [
  {
    id: "1",
    type: "announcement",
    title: "New Course Available: Advanced Safety Protocols",
    description: "Enroll now to complete the mandatory safety training by end of month.",
    link: "/courses/library",
    priority: "high",
  },
  {
    id: "2",
    type: "event",
    title: "Annual Training Expo — August 15",
    description: "Join us for the annual training expo. Register before seats fill up.",
    link: "/events",
    priority: "medium",
  },
];

export default function BannerSection({ items = DEFAULT_BANNERS, onDismiss }) {
  const [visible, setVisible] = useState(items.slice(0, 1));
  const navigate = useNavigate();

  useEffect(() => {
    setVisible(items.slice(0, 1));
  }, [items]);

  const dismiss = (id) => {
    setVisible((prev) => prev.filter((b) => b.id !== id));
    onDismiss?.(id);
  };

  if (!visible.length) return null;

  const banner = visible[0];
  const isEvent = banner.type === "event";

  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-200/80 dark:border-blue-500/40 bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-blue-900/20 dark:via-neutral-900 dark:to-indigo-900/20 px-4 py-3 sm:px-5 sm:py-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_60%)]" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
          {isEvent ? <Calendar size={16} /> : <Megaphone size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {isEvent ? "Event" : "Announcement"}: {banner.title}
          </p>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">{banner.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => banner.link && navigate(banner.link)}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-200 hover:border-blue-300 dark:hover:border-blue-400 transition-colors"
          >
            {isEvent ? "View Event" : "Read More"}
            <ChevronRight size={12} />
          </button>
          <button
            type="button"
            onClick={() => dismiss(banner.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
