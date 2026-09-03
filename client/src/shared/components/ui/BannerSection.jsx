import { useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Megaphone, BookOpen, FileText, Bell, X } from "lucide-react";
import { notifyDismissBanner, notifyHideBanner, useNotificationStore } from "@/shared/stores/notificationStore.js";
import { recordBannerEvent } from "@/services/api";

// --- Banner visual spec (amber / cream compact warning banner) -------------
const ICON_COLOR = "#F5A623";
const BG_LIGHT = "#FFF8E6";
const BORDER_LIGHT = "#F0DFA8";
const BG_CRITICAL = "#FDEDD3";
const TEXT_COLOR = "#3A3A3A";
const BTN_BORDER = "#D0D0D0";
const BTN_TEXT = "#1A1A1A";
const CLOSE_COLOR = "#999999";

// Per spec, the warning triangle (outlined) is the canonical icon. We keep a
// small per-type mapping so the meaning is still parseable at a glance, but
// every icon is tinted the same amber color.
const TYPE_ICON = {
  alert: AlertTriangle,
  announcement: Megaphone,
  new_course: BookOpen,
  new_sop: FileText,
  onboarding: Bell,
  promo: Bell,
  achievement: Bell,
  event: Bell,
};

const PRIORITY_ORDER = {
  alert: 3,
  onboarding: 2,
  achievement: 1,
  new_course: 1,
  new_sop: 1,
  announcement: 0,
  event: 0,
  promo: 1,
};

function getBannerPriority(entry) {
  if (typeof entry.priority === "number") return entry.priority;
  return PRIORITY_ORDER[entry.type] ?? 0;
}

/**
 * Collapses banners that are the "same" banner into a single entry. A banner's
 * identity is its (type, title) pair — e.g. five "New SOP assigned to you"
 * notifications all collapse to one banner instead of stacking five copies.
 * When several collapse, the count is folded into the message so the user still
 * sees how many items the banner represents.
 */
function dedupeBanners(list) {
  const groups = new Map();
  for (const b of list) {
    const key = `${b.type}::${b.title || ""}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...b, __count: 1 });
      continue;
    }
    existing.__count += 1;
  }
  return Array.from(groups.values()).map((b) => {
    const count = b.__count || 1;
    if (count <= 1) {
      const { __count, ...rest } = b;
      return rest;
    }
    const suffix = ` (${count} items)`;
    const { __count, ...rest } = b;
    return { ...rest, message: rest.message ? `${rest.message}${suffix}` : suffix };
  });
}

function sortQueue(entries) {
  return [...entries].sort((a, b) => {
    const priorityDiff = getBannerPriority(b) - getBannerPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function isExpired(entry) {
  return Boolean(entry.expiresAt && Date.now() > entry.expiresAt);
}

// Render banner text inline so the whole banner stays on a single row on
// desktop (truncating with an ellipsis) and only wraps on mobile.
function BannerText({ title, message }) {
  if (!message) return <span>{title}</span>;
  if (!title) return <span>{message}</span>;
  return (
    <span>
      <span className="font-semibold">{title}</span>
      {message ? "  —  " : null}
      <span>{message}</span>
    </span>
  );
}

function BannerCard({ banner, onDismiss, reducedMotion, navigate }) {
  const isCritical = banner.variant === "critical" || banner.type === "alert";
  const Icon = TYPE_ICON[banner.type] || AlertTriangle;
  const hasCta = Boolean(banner.link || banner.ctaLabel || typeof banner.onClick === "function");
  const ctaLabel = banner.ctaLabel || "View";
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    if (banner.remoteId) recordBannerEvent(banner.remoteId, "impression").catch(() => {});
  }, [banner.remoteId]);

  const fireEvent = useCallback(
    (event) => {
      if (banner.remoteId) recordBannerEvent(banner.remoteId, event).catch(() => {});
    },
    [banner.remoteId]
  );

  const handleCtaClick = useCallback(() => {
    fireEvent("click");
    if (typeof banner.onClick === "function") {
      banner.onClick();
    } else if (banner.link) {
      navigate(banner.link);
    }
    onDismiss(banner.id, false);
  }, [banner, onDismiss, navigate, fireEvent]);

  const handleDismiss = useCallback(() => {
    fireEvent("dismiss");
    onDismiss(banner.id);
  }, [onDismiss, banner.id, fireEvent]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      role={isCritical ? "alert" : "status"}
      aria-live={isCritical ? "assertive" : "polite"}
      className="pointer-events-auto w-full"
    >
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[4px] border px-3 py-2.5 sm:py-2"
        style={{
          background: isCritical ? BG_CRITICAL : BG_LIGHT,
          borderColor: isCritical ? ICON_COLOR : BORDER_LIGHT,
        }}
      >
        <Icon
          size={18}
          aria-hidden="true"
          className="shrink-0"
          style={{ color: ICON_COLOR }}
        />

        <p
          className="min-w-0 flex-1 truncate text-[13px] font-normal leading-snug sm:whitespace-nowrap"
          style={{ color: TEXT_COLOR }}
        >
          <BannerText title={banner.title} message={banner.message} />
        </p>

        {hasCta ? (
          <button
            type="button"
            onClick={handleCtaClick}
            className="order-last w-full rounded-[4px] border px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 sm:order-none sm:w-auto"
            style={{ background: "#FFFFFF", borderColor: BTN_BORDER, color: BTN_TEXT }}
          >
            {ctaLabel}
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 sm:ml-0"
          style={{ color: CLOSE_COLOR }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}

export default function BannerSection({ items = [], onDismiss }) {
  const navigate = useNavigate();
  const { dismissed, pendingBanners = [] } = useNotificationStore();
  const reducedMotion = useReducedMotion();

  const normalizedItems = useMemo(
    () =>
      (items || []).map((item, index) => ({
        ...item,
        id: item.id || `banner-${index}-${item.type || "generic"}`,
        type: item.type || "announcement",
        message: item.message || item.description || "",
        createdAt: item.createdAt || Date.now(),
        priority: typeof item.priority === "number" ? item.priority : PRIORITY_ORDER[item.type] ?? 0,
        persistDismiss: Boolean(item.persistDismiss || item.doNotShowAgain),
      })),
    [items]
  );

  const allItems = useMemo(() => {
    const itemMap = new Map();
    normalizedItems.forEach((item) => itemMap.set(item.id, item));
    pendingBanners.forEach((item) => itemMap.set(item.id, item));
    return sortQueue(dedupeBanners(Array.from(itemMap.values())));
  }, [normalizedItems, pendingBanners]);

  const visibleBanners = useMemo(
    () => allItems.filter((item) => !dismissed.includes(item.id) && !isExpired(item)),
    [allItems, dismissed]
  );

  const handleDismiss = useCallback(
    (id, persist = true) => {
      if (!id) return;
      const banner = visibleBanners.find((b) => b.id === id);
      if (banner?.persistDismiss && persist) {
        notifyDismissBanner(id);
      } else {
        notifyHideBanner(id);
      }
      onDismiss?.(id);
    },
    [visibleBanners, onDismiss]
  );

  if (visibleBanners.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {visibleBanners.map((banner) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              onDismiss={handleDismiss}
              reducedMotion={reducedMotion}
              navigate={navigate}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
