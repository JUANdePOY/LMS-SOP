import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Award, AlertTriangle, Rocket, Megaphone, Calendar, Bell, BookOpen, FileText, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { notifyDismissBanner, notifyHideBanner, useNotificationStore } from "@/shared/stores/notificationStore.js";
import { recordBannerEvent } from "@/services/api";

const ALLOWED_TAGS = new Set([
  "A", "B", "STRONG", "I", "EM", "U", "BR", "P", "SPAN", "DIV",
  "UL", "OL", "LI", "H1", "H2", "H3", "H4", "SMALL", "IMG",
]);

const TRUSTED_IMG_HOSTS = [
  "localhost",
  "127.0.0.1",
  "res.cloudinary.com",
  "cdn.jsdelivr.net",
];

// Sanitize untrusted HTML (e.g. an announcement body) for rendering inside a
// banner. Scripts/event handlers/javascript: URLs are stripped; curated <img>
// tags from trusted hosts are preserved so rich banners can show artwork.
function sanitizeRichText(html) {
  if (!html || typeof html !== "string") return "";
  let doc;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return "";
  }

  doc.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((el) => el.remove());

  const isTrustedImg = (src) => {
    if (!src) return false;
    if (/^\s*javascript:/i.test(src)) return false;
    if (src.startsWith("/") || src.startsWith("data:image/")) return true;
    try {
      const url = new URL(src);
      return TRUSTED_IMG_HOSTS.includes(url.hostname);
    } catch {
      return false;
    }
  };

  const walk = (node) => {
    Array.from(node.children).forEach((child) => {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on")) {
          child.removeAttribute(attr.name);
        } else if (name === "href") {
          if (/^\s*javascript:/i.test(attr.value.trim())) child.removeAttribute(attr.name);
        } else if (name === "src") {
          if (!isTrustedImg(attr.value)) child.removeAttribute(attr.name);
        } else if (name !== "href" && name !== "src" && name !== "alt") {
          child.removeAttribute(attr.name);
        }
      });
      walk(child);
    });
  };
  walk(doc.body);

  return doc.body.innerHTML.trim();
}

// Each banner type gets a distinct premium palette + tone so users can parse
// meaning at a glance instead of every banner looking identical.
const TYPE_CONFIG = {
  achievement: {
    gradient: "from-emerald-600 to-teal-500",
    gradientDark: "dark:from-emerald-700 dark:to-teal-600",
    accent: "border-l-emerald-400 dark:border-l-emerald-300",
    cta: "bg-white text-emerald-700 hover:bg-emerald-50 hover:scale-[1.03] hover:shadow-lg focus:ring-emerald-400",
    icon: Award,
    ariaLive: "polite",
    label: "Achievement",
  },
  alert: {
    gradient: "from-rose-600 to-red-500",
    gradientDark: "dark:from-rose-700 dark:to-red-600",
    accent: "border-l-rose-400 dark:border-l-rose-300",
    cta: "bg-white text-rose-700 hover:bg-rose-50 hover:scale-[1.03] hover:shadow-lg focus:ring-rose-400",
    icon: AlertTriangle,
    ariaLive: "assertive",
    label: "Alert",
  },
  onboarding: {
    gradient: "from-fuchsia-600 to-violet-500",
    gradientDark: "dark:from-fuchsia-700 dark:to-violet-600",
    accent: "border-l-fuchsia-400 dark:border-l-fuchsia-300",
    cta: "bg-white text-fuchsia-700 hover:bg-fuchsia-50 hover:scale-[1.03] hover:shadow-lg focus:ring-fuchsia-400",
    icon: Rocket,
    ariaLive: "polite",
    label: "Onboarding",
  },
  announcement: {
    gradient: "from-sky-600 to-blue-500",
    gradientDark: "dark:from-sky-700 dark:to-blue-600",
    accent: "border-l-sky-400 dark:border-l-sky-300",
    cta: "bg-white text-sky-700 hover:bg-sky-50 hover:scale-[1.03] hover:shadow-lg focus:ring-sky-400",
    icon: Megaphone,
    ariaLive: "polite",
    label: "Announcement",
  },
  event: {
    gradient: "from-violet-600 to-purple-500",
    gradientDark: "dark:from-violet-700 dark:to-purple-600",
    accent: "border-l-violet-400 dark:border-l-violet-300",
    cta: "bg-white text-violet-700 hover:bg-violet-50 hover:scale-[1.03] hover:shadow-lg focus:ring-violet-400",
    icon: Calendar,
    ariaLive: "polite",
    label: "Event",
  },
  new_course: {
    gradient: "from-amber-500 to-orange-500",
    gradientDark: "dark:from-amber-600 dark:to-orange-600",
    accent: "border-l-amber-400 dark:border-l-amber-300",
    cta: "bg-white text-amber-700 hover:bg-amber-50 hover:scale-[1.03] hover:shadow-lg focus:ring-amber-400",
    icon: BookOpen,
    ariaLive: "polite",
    label: "New Course",
  },
  new_sop: {
    gradient: "from-indigo-600 to-blue-500",
    gradientDark: "dark:from-indigo-700 dark:to-blue-600",
    accent: "border-l-indigo-400 dark:border-l-indigo-300",
    cta: "bg-white text-indigo-700 hover:bg-indigo-50 hover:scale-[1.03] hover:shadow-lg focus:ring-indigo-400",
    icon: FileText,
    ariaLive: "polite",
    label: "New SOP",
  },
  promo: {
    gradient: "from-pink-600 via-fuchsia-600 to-violet-600",
    gradientDark: "dark:from-pink-700 dark:via-fuchsia-700 dark:to-violet-700",
    accent: "border-l-pink-300 dark:border-l-pink-200",
    cta: "bg-white text-pink-700 hover:bg-pink-50 hover:scale-[1.03] hover:shadow-lg focus:ring-pink-400",
    icon: Bell,
    ariaLive: "polite",
    label: "Promotion",
  },
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
  if (typeof entry.priority === "number") {
    return entry.priority;
  }
  return PRIORITY_ORDER[entry.type] ?? 0;
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

function BannerMessage({ message }) {
  const isRich = typeof message === "string" && /<[a-z][\s\S]*>/i.test(message);
  const className = "text-xs sm:text-sm leading-relaxed banner-rich-message line-clamp-3 text-white/85";
  if (!isRich) {
    return <p className={className}>{message}</p>;
  }
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeRichText(message) }} />;
}

function BannerCard({ banner, onDismiss, onSnooze, autoDismissMs, reducedMotion, navigate }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef(null);
  const startAtRef = useRef(null);
  const remainingRef = useRef(null);
  const trackedRef = useRef(false);

  const config = TYPE_CONFIG[banner.type] || TYPE_CONFIG.announcement;
  const BadgeIcon = config.icon || Bell;
  const hasCta = Boolean(banner.ctaLabel || banner.type === "onboarding");
  const ctaLabel = banner.ctaLabel || (banner.type === "onboarding" ? "Next" : "View");
  const showStep = banner.type === "onboarding" && banner.step?.current && banner.step?.total;
  const hasSnooze = Boolean(banner.snoozeMs && banner.type === "alert");
  const bannerAutoDismissMs = ["achievement", "new_course", "new_sop", "promo"].includes(banner.type) ? autoDismissMs : 0;

  // Record a one-time server impression for server-managed banners.
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    if (banner.remoteId) {
      recordBannerEvent(banner.remoteId, "impression").catch(() => {});
    }
  }, [banner.remoteId]);

  const fireEvent = useCallback((event) => {
    if (banner.remoteId) recordBannerEvent(banner.remoteId, event).catch(() => {});
  }, [banner.remoteId]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAutoDismiss = useCallback(() => {
    if (!bannerAutoDismissMs || bannerAutoDismissMs <= 0) return;
    clearTimer();
    if (remainingRef.current === null) {
      remainingRef.current = bannerAutoDismissMs;
    }
    startAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      onDismiss(banner.id);
    }, remainingRef.current);
  }, [bannerAutoDismissMs, clearTimer, onDismiss, banner.id]);

  useEffect(() => {
    remainingRef.current = null;
    startAtRef.current = null;
    clearTimer();
  }, [banner.id, clearTimer]);

  useEffect(() => {
    if (!bannerAutoDismissMs || bannerAutoDismissMs <= 0) return;
    if (isHovered || isFocused) return;
    scheduleAutoDismiss();
    return () => clearTimer();
  }, [bannerAutoDismissMs, isHovered, isFocused, scheduleAutoDismiss, clearTimer]);

  useEffect(() => {
    if (!bannerAutoDismissMs || !startAtRef.current) return;
    if (!isHovered && !isFocused) return;
    const elapsed = Date.now() - startAtRef.current;
    remainingRef.current = Math.max(0, (remainingRef.current ?? bannerAutoDismissMs) - elapsed);
    clearTimer();
  }, [isHovered, isFocused, bannerAutoDismissMs, clearTimer]);

  useEffect(() => {
    if (!banner) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onDismiss(banner.id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [banner, onDismiss]);

  const remaining = remainingRef.current;
  const progress = bannerAutoDismissMs > 0 && remaining !== null ? (remaining / bannerAutoDismissMs) * 100 : 100;

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

  const handleSnooze = useCallback(() => {
    fireEvent("snooze");
    onSnooze?.(banner.id);
  }, [onSnooze, banner.id, fireEvent]);

  return (
    <motion.div
      layout
      initial={{ x: reducedMotion ? 0 : "100%", opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: reducedMotion ? 0 : "100%", opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.95 }}
      transition={{ type: "spring", stiffness: 200, damping: 12, mass: 0.8 }}
      role={banner.type === "alert" ? "alert" : "status"}
      aria-live={config.ariaLive}
      aria-label={`${config.label} notification`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "pointer-events-auto",
        "relative overflow-hidden",
        "w-full",
        "rounded-xl border-l-4",
        config.accent,
        "bg-gradient-to-r",
        config.gradient,
        config.gradientDark,
        "text-white",
        "shadow-lg",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-white/10 before:backdrop-blur-xl",
        "after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-white/25"
      )}
    >
      <div className="relative flex w-full items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3">
        {banner.imageUrl ? (
          <img
            src={banner.imageUrl}
            alt=""
            className="hidden sm:block h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/30"
          />
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 dark:bg-white/10 text-white backdrop-blur-md border border-white/25 dark:border-white/15 shadow-inner"
          >
            <BadgeIcon size={22} aria-hidden="true" className="drop-shadow-sm" />
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 flex-1"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          {showStep && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/70">
              Step {banner.step.current} of {banner.step.total}
            </p>
          )}
          <p className="text-sm sm:text-base font-semibold tracking-tight leading-snug text-white">{banner.title}</p>
          <BannerMessage message={banner.message} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 sm:gap-3 shrink-0"
        >
          {hasCta ? (
            <button
              type="button"
              onClick={handleCtaClick}
              className={cn(
                "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent",
                config.cta
              )}
            >
              {ctaLabel}
            </button>
          ) : null}
          {banner.type === "onboarding" ? (
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Skip tour
            </button>
          ) : null}
          {hasSnooze ? (
            <button
              type="button"
              onClick={handleSnooze}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Remind me later
            </button>
          ) : null}
          <motion.button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
            whileHover={{ rotate: 90, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition-all duration-200 hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <X size={18} />
          </motion.button>
        </motion.div>
      </div>

      {bannerAutoDismissMs > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default function BannerSection({ items = [], onDismiss, autoDismissMs = 5000, carousel = false, autoPlayInterval = 4000 }) {
  const navigate = useNavigate();
  const store = useNotificationStore();
  const { dismissed, pendingBanners = [] } = store;
  const reducedMotion = useReducedMotion();
  const [queue, setQueue] = useState([]);
  const [activeBanner, setActiveBanner] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scheduledTimers = useRef(new Map());
  const autoPlayTimerRef = useRef(null);
  const containerRef = useRef(null);

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
        showAfter: item.showAfter || null,
      })),
    [items]
  );

  const allItems = useMemo(() => {
    const itemMap = new Map();
    normalizedItems.forEach((item) => itemMap.set(item.id, item));
    pendingBanners.forEach((item) => itemMap.set(item.id, item));
    return sortQueue(Array.from(itemMap.values()));
  }, [normalizedItems, pendingBanners]);

  const visibleBanners = useMemo(() => {
    return allItems.filter((item) => !dismissed.includes(item.id));
  }, [allItems, dismissed]);

  const cancelScheduled = useCallback((id) => {
    const timer = scheduledTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      scheduledTimers.current.delete(id);
    }
  }, []);

  const clearAllScheduled = useCallback(() => {
    scheduledTimers.current.forEach((timer) => window.clearTimeout(timer));
    scheduledTimers.current.clear();
  }, []);

  const clearAutoPlay = useCallback(() => {
    if (autoPlayTimerRef.current) {
      window.clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (!carousel || visibleBanners.length <= 1) return;
    clearAutoPlay();
    autoPlayTimerRef.current = window.setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
    }, autoPlayInterval);
  }, [carousel, clearAutoPlay, autoPlayInterval, visibleBanners.length]);

  const enqueueBanner = useCallback(
    (entry) => {
      if (!entry?.id || dismissed.includes(entry.id) || isExpired(entry)) return;

      if (entry.showAfter && entry.showAfter > Date.now()) {
        cancelScheduled(entry.id);
        const delay = Math.max(0, entry.showAfter - Date.now());
        const timer = window.setTimeout(() => {
          scheduledTimers.current.delete(entry.id);
          if (!dismissed.includes(entry.id) && !isExpired(entry)) {
            setQueue((current) => sortQueue([...current, entry]));
          }
        }, delay);
        scheduledTimers.current.set(entry.id, timer);
        return;
      }

      setQueue((current) => sortQueue([...current, entry]));
    },
    [cancelScheduled, dismissed]
  );

  useEffect(() => {
    clearAllScheduled();
    setQueue([]);
    setActiveBanner(null);

    allItems.forEach(enqueueBanner);
    return () => clearAllScheduled();
  }, [allItems, dismissed, enqueueBanner, clearAllScheduled]);

  useEffect(() => {
    if (activeBanner) return;
    if (queue.length === 0) return;

    const [next, ...rest] = queue;
    setActiveBanner(next);
    setQueue(rest);
  }, [activeBanner, queue]);

  useEffect(() => {
    if (!activeBanner) return;
    if (dismissed.includes(activeBanner.id)) {
      setActiveBanner(null);
    }
  }, [dismissed, activeBanner]);

  useEffect(() => {
    if (!carousel) return;
    if (visibleBanners.length === 0) return;
    setCurrentIndex((prev) => Math.min(prev, visibleBanners.length - 1));
    scheduleNext();
    return clearAutoPlay;
  }, [carousel, visibleBanners.length, scheduleNext, clearAutoPlay]);

  const showNext = useCallback(() => {
    if (visibleBanners.length <= 1) return;
    clearAutoPlay();
    setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
    scheduleNext();
  }, [clearAutoPlay, scheduleNext, visibleBanners.length]);

  const showPrev = useCallback(() => {
    if (visibleBanners.length <= 1) return;
    clearAutoPlay();
    setCurrentIndex((prev) => (prev - 1 + visibleBanners.length) % visibleBanners.length);
    scheduleNext();
  }, [clearAutoPlay, scheduleNext, visibleBanners.length]);

  const handleDismiss = useCallback(
    (id, persist = true) => {
      if (!id) return;
      const banner = activeBanner && activeBanner.id === id ? activeBanner : visibleBanners.find((b) => b.id === id);
      if (banner?.persistDismiss && persist) {
        notifyDismissBanner(id);
      } else {
        notifyHideBanner(id);
      }
      setActiveBanner(null);
      onDismiss?.(id);
    },
    [activeBanner, visibleBanners, onDismiss]
  );

  const handleSnooze = useCallback((id) => {
    if (!id) return;
    const banner = activeBanner && activeBanner.id === id ? activeBanner : visibleBanners.find((b) => b.id === id);
    if (!banner?.snoozeMs) return;
    const snoozed = {
      ...banner,
      id: `${banner.id}-snoozed-${Date.now()}`,
      createdAt: Date.now(),
      showAfter: Date.now() + banner.snoozeMs,
      persistDismiss: false,
    };
    setActiveBanner(null);
    enqueueBanner(snoozed);
  }, [activeBanner, visibleBanners, enqueueBanner]);

  const safeIndex = carousel ? Math.min(Math.max(currentIndex, 0), Math.max(0, visibleBanners.length - 1)) : 0;
  const currentBanner = carousel ? visibleBanners[safeIndex] : activeBanner;

  if (!currentBanner) return null;

  return (
    <div ref={containerRef} className="w-full mb-4">
      <div className="relative">
        <AnimatePresence mode="wait">
          <BannerCard
            key={currentBanner.id}
            banner={currentBanner}
            onDismiss={handleDismiss}
            onSnooze={handleSnooze}
            autoDismissMs={carousel ? 0 : autoDismissMs}
            reducedMotion={reducedMotion}
            navigate={navigate}
          />
        </AnimatePresence>

        {carousel && visibleBanners.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrev}
              aria-label="Previous banner"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Next banner"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-200 shadow-md border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <ChevronRight size={18} />
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-2">
              {visibleBanners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => {
                    clearAutoPlay();
                    setCurrentIndex(index);
                    scheduleNext();
                  }}
                  aria-label={`Show banner ${index + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200 focus:outline-none",
                    index === currentIndex
                      ? "w-4 bg-blue-600 dark:bg-blue-400"
                      : "w-2 bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
