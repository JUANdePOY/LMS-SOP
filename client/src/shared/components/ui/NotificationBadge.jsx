import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "bg-red-500 text-white ring-white dark:ring-neutral-900",
  security: "bg-red-600 text-white ring-white dark:ring-neutral-900",
  training: "bg-amber-500 text-white ring-white dark:ring-neutral-900",
  social: "bg-sky-500 text-white ring-white dark:ring-neutral-900",
  marketing: "bg-neutral-400 text-white ring-white dark:ring-neutral-900",
};

export default function NotificationBadge({ count, tone = "default", muted = false, className = "" }) {
  const [pulse, setPulse] = useState(false);
  const prev = useRef(count);

  useEffect(() => {
    if (count > prev.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      prev.current = count;
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);

  if (count <= 0) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`${count} unread notification${count === 1 ? "" : "s"}`}
      className={cn(
        "absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-bold leading-none ring-2",
        TONES[tone] || TONES.default,
        pulse && !muted && "animate-ping-once",
        className
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
