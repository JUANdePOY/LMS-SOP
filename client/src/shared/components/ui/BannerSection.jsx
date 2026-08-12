import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Award, AlertTriangle, Rocket, Megaphone, Calendar, Bell, BookOpen, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { notifyDismissBanner, useNotificationStore, enqueueBanner as enqueueGlobalBanner, clearEnqueuedBanners } from "@/shared/stores/notificationStore.js";

const DEFAULT_BANNERS = [
  {
    id: "1",
    type: "announcement",
    title: "New Course Available: Advanced Safety Protocols",
    message: "Enroll now to complete the mandatory safety training by end of month.",
    link: "/courses/library",
    ctaLabel: "View course",
    priority: 0,
    persistDismiss: true,
  },
  {
    id: "2",
    type: "event",
    title: "Annual Training Expo — August 15",
    message: "Join us for the annual training expo. Register before seats fill up.",
    link: "/events",
    ctaLabel: "Register",
    priority: 0,
    persistDismiss: true,
  },
];

const TYPE_CONFIG = {
  achievement: {
    gradient: "from-amber-500 to-amber-400",
    gradientDark: "dark:from-amber-600 dark:to-amber-500",
    accent: "border-l-amber-500 dark:border-l-amber-400",
    cta: "bg-white text-amber-600 hover:bg-amber-50 hover:scale-105 hover:shadow-lg focus:ring-amber-400",
    icon: Award,
    ariaLive: "polite",
    label: "Achievement",
  },
  alert: {
    gradient: "from-red-600 to-red-500",
    gradientDark: "dark:from-red-700 dark:to-red-600",
    accent: "border-l-red-500 dark:border-l-red-400",
    cta: "bg-white text-red-600 hover:bg-red-50 hover:scale-105 hover:shadow-lg focus:ring-red-400",
    icon: AlertTriangle,
    ariaLive: "assertive",
    label: "Alert",
  },
  onboarding: {
    gradient: "from-sky-600 to-sky-500",
    gradientDark: "dark:from-sky-700 dark:to-sky-600",
    accent: "border-l-sky-500 dark:border-l-sky-400",
    cta: "bg-white text-sky-600 hover:bg-sky-50 hover:scale-105 hover:shadow-lg focus:ring-sky-400",
    icon: Rocket,
    ariaLive: "polite",
    label: "Onboarding",
  },
  announcement: {
    gradient: "from-slate-700 to-slate-600",
    gradientDark: "dark:from-slate-800 dark:to-slate-700",
    accent: "border-l-slate-500 dark:border-l-slate-400",
    cta: "bg-white text-slate-700 hover:bg-slate-50 hover:scale-105 hover:shadow-lg focus:ring-slate-400",
    icon: Megaphone,
    ariaLive: "polite",
    label: "Announcement",
  },
  event: {
    gradient: "from-slate-700 to-slate-600",
    gradientDark: "dark:from-slate-800 dark:to-slate-700",
    accent: "border-l-slate-500 dark:border-l-slate-400",
    cta: "bg-white text-slate-700 hover:bg-slate-50 hover:scale-105 hover:shadow-lg focus:ring-slate-400",
    icon: Calendar,
    ariaLive: "polite",
    label: "Event",
  },
  new_course: {
    gradient: "from-sky-500 via-sky-100 to-white",
    gradientDark: "dark:from-sky-600 dark:via-sky-900 dark:to-neutral-800",
    accent: "border-l-sky-500 dark:border-l-sky-400",
    cta: "bg-sky-600 text-white hover:bg-sky-700 hover:scale-105 hover:shadow-lg focus:ring-sky-400",
    icon: BookOpen,
    ariaLive: "polite",
    label: "New Course",
    textColor: "text-slate-900",
    textMuted: "text-slate-600",
  },
  new_sop: {
    gradient: "from-indigo-500 via-indigo-100 to-white",
    gradientDark: "dark:from-indigo-600 dark:via-indigo-900 dark:to-neutral-800",
    accent: "border-l-indigo-500 dark:border-l-indigo-400",
    cta: "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 hover:shadow-lg focus:ring-indigo-400",
    icon: FileText,
    ariaLive: "polite",
    label: "New SOP",
    textColor: "text-slate-900",
    textMuted: "text-slate-600",
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
};

const MAX_VISIBLE = 1;

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

function BannerCard({ banner, onDismiss, onSnooze, autoDismissMs, reducedMotion, navigate }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef(null);
  const startAtRef = useRef(null);
  const remainingRef = useRef(null);

  const config = TYPE_CONFIG[banner.type] || TYPE_CONFIG.announcement;
  const BadgeIcon = config.icon || Bell;
  const hasCta = Boolean(banner.ctaLabel || banner.type === "onboarding");
  const ctaLabel = banner.ctaLabel || (banner.type === "onboarding" ? "Next" : "View");
  const showStep = banner.type === "onboarding" && banner.step?.current && banner.step?.total;
  const hasSnooze = Boolean(banner.snoozeMs && banner.type === "alert");
  const bannerAutoDismissMs = ["achievement", "new_course", "new_sop"].includes(banner.type) ? autoDismissMs : 0;
  const isLightBg = ["new_course", "new_sop"].includes(banner.type);
  const textColor = config.textColor || "text-white";
  const textMuted = config.textMuted || "text-white/80";

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
    if (typeof banner.onClick === "function") {
      banner.onClick();
    } else if (banner.link) {
      navigate(banner.link);
    }
    onDismiss(banner.id, false);
  }, [banner, onDismiss, navigate]);

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
        textColor,
        "shadow-lg",
        "before:absolute before:inset-0 before:bg-white/10 before:backdrop-blur-xl",
        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-white/25"
      )}
    >
      <div className="relative w-full px-4 sm:px-5">
        <div className="flex items-center gap-3 sm:gap-4 py-3" onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isLightBg ? "bg-sky-600 text-white" : "bg-white/20 dark:bg-white/10 text-white",
              "backdrop-blur-md",
              "border border-white/25 dark:border-white/15",
              "shadow-inner"
            )}
          >
            <BadgeIcon size={22} aria-hidden="true" className="drop-shadow-sm" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0 flex-1"
          >
            {showStep && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/70">
                Step {banner.step.current} of {banner.step.total}
              </p>
            )}
            <p className={cn("text-sm sm:text-base font-semibold tracking-tight leading-snug", isLightBg ? "text-slate-900" : "text-white")}>{banner.title}</p>
            <p className={cn("text-xs sm:text-sm leading-relaxed", isLightBg ? "text-slate-600" : "text-white/80")}>{banner.message}</p>
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
                onClick={() => onDismiss(banner.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2",
                  isLightBg
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400"
                    : "border-white/30 bg-white/10 text-white hover:bg-white/20 focus:ring-white/40"
                )}
              >
                Skip tour
              </button>
            ) : null}
            {hasSnooze ? (
              <button
                type="button"
                onClick={() => onSnooze?.(banner.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2",
                  isLightBg
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400"
                    : "border-white/30 bg-white/10 text-white hover:bg-white/20 focus:ring-white/40"
                )}
              >
                Remind me later
              </button>
            ) : null}
            <motion.button
              type="button"
              onClick={() => onDismiss(banner.id)}
              aria-label="Dismiss notification"
              whileHover={{ rotate: 90, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2",
                isLightBg
                  ? "text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:ring-slate-400"
                  : "text-white/80 hover:bg-white/20 hover:text-white focus:ring-white/40"
              )}
            >
              <X size={18} />
            </motion.button>
          </motion.div>
        </div>
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

export default function BannerSection({ items = DEFAULT_BANNERS, onDismiss, autoDismissMs = 5000 }) {
  const navigate = useNavigate();
  const store = useNotificationStore();
  const { dismissed, pendingBanners = [] } = store;
  const reducedMotion = useReducedMotion();
  const [queue, setQueue] = useState([]);
  const [activeBanner, setActiveBanner] = useState(null);
  const scheduledTimers = useRef(new Map());

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

  const handleDismiss = useCallback(
    (id, persist = true) => {
      const banner = activeBanner;
      if (persist && banner?.persistDismiss && banner.id) {
        notifyDismissBanner(banner.id);
      }
      setActiveBanner(null);
      onDismiss?.(id);
    },
    [activeBanner, onDismiss]
  );

  const handleSnooze = useCallback(() => {
    if (!activeBanner?.snoozeMs) return;
    const snoozed = {
      ...activeBanner,
      id: `${activeBanner.id}-snoozed-${Date.now()}`,
      createdAt: Date.now(),
      showAfter: Date.now() + activeBanner.snoozeMs,
      persistDismiss: false,
    };
    setActiveBanner(null);
    enqueueBanner(snoozed);
  }, [activeBanner, enqueueBanner]);

  const handleCtaClick = useCallback(() => {
    if (!activeBanner) return;
    if (typeof activeBanner.onClick === "function") {
      activeBanner.onClick();
    } else if (activeBanner.link) {
      navigate(activeBanner.link);
    }
    handleDismiss(activeBanner.id, false);
  }, [activeBanner, handleDismiss, navigate]);

  if (!activeBanner) return null;

  return (
    <div className="w-full mb-4">
      <AnimatePresence>
        <BannerCard
          key={activeBanner.id}
          banner={activeBanner}
          onDismiss={handleDismiss}
          onSnooze={handleSnooze}
          autoDismissMs={autoDismissMs}
          reducedMotion={reducedMotion}
          navigate={navigate}
        />
      </AnimatePresence>
    </div>
  );
}
