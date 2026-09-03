import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/shared/stores/notificationStore.js";
import { getMyTaskHierarchy, getTaskStats } from "@/features/task-management/services/taskService";

// A task is considered "newly assigned" to the current employee only when the
// assignment was created within this window. This keeps the overdue banner
// relevant (a task overdue since long ago is not a fresh alert) and prevents
// the banner from re-surfacing indefinitely for older assignments.
const NEW_ASSIGNMENT_WINDOW_DAYS = 14;

// Entity types that should raise a system banner: course enrollment, SOP
// assignment, and employee onboarding/assignment.
const TRIGGER_ENTITY_TYPES = new Set(["enrollment", "sop", "employee", "onboarding"]);

const ENTITY_TITLE = {
  enrollment: "New course enrollment",
  sop: "New SOP assigned to you",
  employee: "Welcome aboard",
  onboarding: "Welcome aboard",
};

const ENTITY_BANNER_TYPE = {
  enrollment: "new_course",
  sop: "new_sop",
  employee: "announcement",
  onboarding: "announcement",
};

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

export function useContextualBanners({ enabled = true } = {}) {
  const { user, isAnyAdmin } = useAuth();
  const userId = user?.id;
  const { notifications } = useNotifications();
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  const loadTasks = useCallback(async () => {
    if (!enabled || !userId) return;
    setTasksLoading(true);
    try {
      const data = await getMyTaskHierarchy();
      setTasks(data?.tasks || []);
    } catch {
      // Banners are non-critical; a transient failure must not break the page.
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [enabled, userId]);

  const loadAdminStats = useCallback(async () => {
    if (!enabled || !isAnyAdmin) return;
    try {
      const stats = await getTaskStats();
      setOverdueCount(Number(stats?.overdue) || 0);
    } catch {
      setOverdueCount(0);
    }
  }, [enabled, isAnyAdmin]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadAdminStats();
  }, [loadAdminStats]);

  const overdueBanners = useMemo(() => {
    if (!userId) return [];
    const now = Date.now();
    const windowMs = NEW_ASSIGNMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const result = [];

    (tasks || []).forEach((task) => {
      if (task.status !== "Overdue") return;

      const mine = (task.assignments || []).filter(
        (a) => a.assignment_type === "User" && Number(a.reference_id) === Number(userId)
      );

      mine.forEach((assignment) => {
        const assignedAt = assignment.assigned_at ? new Date(assignment.assigned_at).getTime() : null;
        if (!assignedAt) return;
        if (now - assignedAt > windowMs) return;

        result.push({
          id: `ctx-overdue-${task.id}-${userId}`,
          type: "alert",
          variant: "critical",
          title: "Overdue task assigned to you",
          message: `“${task.title}” was assigned to you and is now overdue.`,
          link: "/tasks/my",
          ctaLabel: "View task",
          priority: 20,
        });
      });
    });

    return result;
  }, [tasks, userId]);

  // Admin view: surface any overdue task across the system (admins are not
  // "assigned" to tasks, so the per-assignee rule above does not apply to them).
  const adminOverdueBanners = useMemo(() => {
    if (!isAnyAdmin || overdueCount <= 0) return [];
    return [
      {
        id: "ctx-admin-overdue",
        type: "alert",
        variant: "critical",
        title: "Overdue tasks in the system",
        message: `${overdueCount} task${overdueCount !== 1 ? "s" : ""} ${overdueCount !== 1 ? "are" : "is"} currently overdue.`,
        link: "/tasks",
        ctaLabel: "View tasks",
        priority: 20,
      },
    ];
  }, [isAnyAdmin, overdueCount]);

  const notificationBanners = useMemo(() => {
    if (!userId) return [];
    const unread = (notifications || []).filter((n) => !n.is_read);
    return unread
      .filter((n) => TRIGGER_ENTITY_TYPES.has(n.entity_type))
      .map((n) => ({
        id: `ctx-notif-${n.id}`,
        type: ENTITY_BANNER_TYPE[n.entity_type] || "announcement",
        title: ENTITY_TITLE[n.entity_type] || "Notification",
        message: n.body || n.title || "",
        link: n.link || "/notifications",
        ctaLabel: "View",
        priority: 10,
      }));
  }, [notifications, userId]);

  const banners = useMemo(
    () =>
      dedupeBanners(
        [...adminOverdueBanners, ...overdueBanners, ...notificationBanners].sort(
          (a, b) => (b.priority || 0) - (a.priority || 0)
        )
      ),
    [adminOverdueBanners, overdueBanners, notificationBanners]
  );

  return { banners, loading: tasksLoading, reload: loadTasks };
}
