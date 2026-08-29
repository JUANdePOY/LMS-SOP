import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { resolveFileUrl } from "@/lib/fileUrl";

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

  // Use the shared file resolver for all avatars so local /uploads paths
  // are rewritten through the authenticated streaming route instead of relying
  // on direct static /uploads access behind proxies and hosters.
  const resolvedUrl = user?.avatar_url ? resolveFileUrl(user.avatar_url) : null;

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

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

// Asana-style circular avatar: shows the image when available, otherwise
// deterministic colored initials (same person always gets the same color via
// a name hash into the --ppm-avatar-* palette).
const AVATAR_SIZES = {
  "20": "h-5 w-5 text-[10px]",
  "28": "h-7 w-7 text-xs",
  "36": "h-9 w-9 text-sm",
  xs: "h-7 w-7 text-[11px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({ name, avatarUrl, size = "28", className, ring = false }) {
  const [imgError, setImgError] = useState(false);
  const resolved = avatarUrl ? resolveFileUrl(avatarUrl) : null;
  const showImage = Boolean(resolved) && !imgError;

  useEffect(() => {
    setImgError(false);
  }, [resolved]);

  const colorVar = `var(--ppm-avatar-${(hashString(name || "?") % 8) + 1})`;
  const sizeCls = AVATAR_SIZES[size] || AVATAR_SIZES["28"];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        sizeCls,
        ring && "ring-2 ring-white dark:ring-neutral-700 shadow-sm",
        className
      )}
      style={showImage ? undefined : { backgroundColor: colorVar }}
    >
      {showImage ? (
        <img
          src={resolved}
          alt={name || "User"}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  );
}
