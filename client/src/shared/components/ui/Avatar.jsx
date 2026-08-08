import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

function resolveAvatarUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

const DEFAULT_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='#9ca3af'><path d='M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5z'/></svg>"
  );

const SIZES = {
  xs: "h-7 w-7 text-[11px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

export default function UserAvatar({ user, size = "sm", className, ring = false }) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveAvatarUrl(user?.avatar_url);

  // Reset the error flag whenever the avatar URL changes so a newly uploaded
  // image is actually attempted (otherwise a prior failed load would keep the
  // default placeholder until the component remounts). This makes the sidebar
  // and top-header avatars update instantly after a profile picture change.
  useEffect(() => {
    setImgError(false);
  }, [resolvedUrl]);

  const src = resolvedUrl && !imgError ? resolvedUrl : DEFAULT_AVATAR;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800",
        SIZES[size] || SIZES.sm,
        ring && "ring-2 ring-white dark:ring-neutral-700 shadow-sm",
        className
      )}
    >
      <img
        src={src}
        alt={user?.full_name || user?.email || "User"}
        onError={() => setImgError(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
