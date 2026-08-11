import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Award, AlertTriangle, Rocket, Megaphone, Calendar, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { notifyDismissBanner, useNotificationStore } from "@/shared/stores/notificationStore.js";

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
    badge: "bg-amber-500 text-white border-amber-200",
    cta: "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-400",
    icon: Award,
    ariaLive: "polite",
    label: "Achievement",
  },
  alert: {
    badge: "bg-red-600 text-white border-red-200",
    cta: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400",
    icon: AlertTriangle,
    ariaLive: "assertive",
    label: "Alert",
  },
  onboarding: {
    badge: "bg-sky-600 text-white border-sky-200",
    cta: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-400",
    icon: Rocket,
    ariaLive: "polite",
    label: "Onboarding",
  },
  announcement: {
    badge: "bg-slate-700 text-white border-slate-200",
    cta: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500",
    icon: Megaphone,
    ariaLive: "polite",
    label: "Announcement",
  },
  event: {
    badge: "bg-slate-700 text-white border-slate-200",
    cta: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500",
    icon: Calendar,
    ariaLive: "polite",
    label: "Event",
  },
};

const PRIORITY_ORDER = {
  alert: 3,
  onboarding: 2,
  achievement: 1,
  announcement: 0,
  event: 0,
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

export default function BannerSection({ items = DEFAULT_BANNERS, onDismiss, autoDismissMs = 5000 }) {
  const navigate = useNavigate();
  const { dismissed } = useNotificationStore();
  const reducedMotion = useReducedMotion();
  const [queue, setQueue] = useState([]);
  const [activeBanner, setActiveBanner] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef(null);
  const startAtRef = useRef(null);
  const remainingRef = useRef(null);
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

  const activeConfig = TYPE_CONFIG[activeBanner?.type] || TYPE_CONFIG.announcement;
  const BadgeIcon = activeConfig.icon || Bell;
  const hasCta = Boolean(activeBanner?.ctaLabel || activeBanner?.type === "onboarding");
  const ctaLabel = activeBanner?.ctaLabel || (activeBanner?.type === "onboarding" ? "Next" : "View");
  const showStep = activeBanner?.type === "onboarding" && activeBanner?.step?.current && activeBanner?.step?.total;
  const hasSnooze = Boolean(activeBanner?.snoozeMs && activeBanner?.type === "alert");
  const activeAutoDismissMs = activeBanner?.type === "achievement" ? autoDismissMs : 0;

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

    normalizedItems.forEach(enqueueBanner);
    return () => clearAllScheduled();
  }, [normalizedItems, dismissed, enqueueBanner, clearAllScheduled]);

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

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAutoDismiss = useCallback(() => {
    if (!activeBanner || activeAutoDismissMs <= 0) return;
    clearTimer();
    if (remainingRef.current === null) {
      remainingRef.current = activeAutoDismissMs;
    }
    startAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      handleDismiss({ persist: false });
    }, remainingRef.current);
  }, [activeBanner, activeAutoDismissMs, clearTimer]);

  useEffect(() => {
    remainingRef.current = null;
    startAtRef.current = null;
    clearTimer();
  }, [activeBanner, clearTimer]);

  useEffect(() => {
    if (!activeBanner || activeAutoDismissMs <= 0) return;
    if (isHovered || isFocused) return;
    scheduleAutoDismiss();
    return () => clearTimer();
  }, [activeBanner, activeAutoDismissMs, isHovered, isFocused, scheduleAutoDismiss, clearTimer]);

  useEffect(() => {
    if (!activeBanner || !activeAutoDismissMs || !startAtRef.current) return;
    if (!isHovered && !isFocused) return;
    const elapsed = Date.now() - startAtRef.current;
    remainingRef.current = Math.max(0, (remainingRef.current ?? activeAutoDismissMs) - elapsed);
    clearTimer();
  }, [isHovered, isFocused, activeBanner, activeAutoDismissMs, clearTimer]);

  const handleDismiss = useCallback(
    ({ persist = true } = {}) => {
      if (!activeBanner) return;
      if (persist && activeBanner.persistDismiss && activeBanner.id) {
        notifyDismissBanner(activeBanner.id);
      }
      clearTimer();
      setActiveBanner(null);
      onDismiss?.(activeBanner.id);
    },
    [activeBanner, clearTimer, onDismiss]
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
    clearTimer();
    setActiveBanner(null);
    enqueueBanner(snoozed);
  }, [activeBanner, clearTimer, enqueueBanner]);

  const handleCtaClick = useCallback(() => {
    if (!activeBanner) return;
    if (typeof activeBanner.onClick === "function") {
      activeBanner.onClick();
    } else if (activeBanner.link) {
      navigate(activeBanner.link);
    }
    handleDismiss({ persist: false });
  }, [activeBanner, handleDismiss, navigate]);

  useEffect(() => {
    if (!activeBanner) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeBanner, handleDismiss]);

  if (!activeBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={activeBanner.id}
        initial={{ opacity: 0, x: reducedMotion ? 0 : "120%" }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: reducedMotion ? 0 : "120%" }}
        transition={{ duration: reducedMotion ? 0.24 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        role={activeBanner.type === "alert" ? "alert" : "status"}
        aria-live={activeConfig.ariaLive}
        aria-label={`${activeConfig.label} notification`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed top-0 left-0 right-0 z-50 px-3 py-3 sm:top-24 sm:left-auto sm:right-6"
      >
        <div className="mx-auto w-full max-w-[calc(100vw-1rem)] sm:max-w-[360px] pointer-events-auto">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_65px_-35px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 p-4 sm:p-4" onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", activeConfig.badge)}>
                    <BadgeIcon size={20} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {showStep ? (
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                        Step {activeBanner.step.current} of {activeBanner.step.total}
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold text-slate-900 leading-5">{activeBanner.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{activeBanner.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismiss()}
                  aria-label="Dismiss notification"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {hasCta ? (
                    <button type="button" onClick={handleCtaClick} className={cn("inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2", activeConfig.cta)}>
                      {ctaLabel}
                    </button>
                  ) : null}
                  {activeBanner.type === "onboarding" ? (
                    <button
                      type="button"
                      onClick={() => handleDismiss()}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                    >
                      Skip tour
                    </button>
                  ) : null}
                  {hasSnooze ? (
                    <button
                      type="button"
                      onClick={handleSnooze}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                    >
                      Remind me later
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
