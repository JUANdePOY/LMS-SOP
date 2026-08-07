import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function NotificationBadge({ count, className = "" }) {
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
        "absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none ring-2 ring-white dark:ring-neutral-900",
        pulse && "animate-ping-once",
        className
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
