import { useCallback, useRef, useState } from "react";

const SEVERITY = { info: "info", interaction: "interaction", view: "view" };

function now() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function isoNow() {
  return new Date().toISOString();
}

/**
 * Lightweight, dependency-free course analytics tracker.
 *
 * Records user interactions and content engagement for a single course view
 * and exposes a `track` function plus live session aggregates. Telemetry is
 * kept in memory (per mount) and surfaced through `getSessionSummary` so the
 * details page can render an "engagement" analytics panel without a backend
 * analytics service. `flush` is a seam for future transport (API/queue).
 */
export function useCourseAnalytics(courseId, { onFlush } = {}) {
  const [events, setEvents] = useState([]);
  const startedAtRef = useRef(now());
  const tabEnteredAtRef = useRef({});
  const summaryRef = useRef({ contentViews: 0, tabViews: {}, downloads: 0, assignments: 0 });

  const track = useCallback(
    (type, payload = {}) => {
      const event = {
        courseId,
        type,
        severity: SEVERITY[type] || "interaction",
        payload,
        at: isoNow(),
      };
      setEvents((prev) => [...prev, event]);

      const s = summaryRef.current;
      if (type === "content_view") s.contentViews += 1;
      else if (type === "tab_view") s.tabViews[payload.tab] = (s.tabViews[payload.tab] || 0) + 1;
      else if (type === "export") s.downloads += 1;
      else if (type === "assign") s.assignments += 1;

      if (onFlush) {
        try {
          onFlush(event);
        } catch {
          /* swallow transport errors */
        }
      }
      return event;
    },
    [courseId, onFlush]
  );

  const trackTabView = useCallback(
    (tab) => {
      const prev = tabEnteredAtRef.current[tab];
      const entered = now();
      tabEnteredAtRef.current[tab] = entered;
      const dwellMs = prev != null ? entered - prev : 0;
      track("tab_view", { tab, dwellMs: Math.max(0, Math.round(dwellMs)) });
    },
    [track]
  );

  const trackContentView = useCallback(
    (payload) => track("content_view", payload),
    [track]
  );

  const getSessionSummary = useCallback(() => {
    const s = summaryRef.current;
    return {
      courseId,
      sessionDurationMs: Math.round(now() - startedAtRef.current),
      contentViews: s.contentViews,
      tabViews: { ...s.tabViews },
      downloads: s.downloads,
      assignments: s.assignments,
      eventCount: events.length,
    };
  }, [courseId, events.length]);

  const flush = useCallback(() => {
    const summary = getSessionSummary();
    if (onFlush) {
      try {
        onFlush({ type: "session_summary", courseId, payload: summary, at: isoNow() });
      } catch {
        /* swallow transport errors */
      }
    }
    return summary;
  }, [courseId, getSessionSummary, onFlush]);

  return { track, trackTabView, trackContentView, getSessionSummary, flush, events };
}

export default useCourseAnalytics;
