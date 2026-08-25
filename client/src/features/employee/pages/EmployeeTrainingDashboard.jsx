import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserLeaderboard } from "@/features/course_management/api/userLeaderboard.api";
import { cn } from "@/lib/utils";
import {
  BookOpen, GraduationCap, ClipboardCheck, Award,
  Megaphone, Trophy, ChevronDown, ArrowRight,
} from "lucide-react";

import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import PanelCard from "../components/dashboard/PanelCard";
import ProgressBar from "../components/dashboard/ProgressBar";
import DonutChart from "../components/dashboard/DonutChart";
import TrainingLineChart from "../components/dashboard/TrainingLineChart";
import LeaderboardPodium from "../components/dashboard/LeaderboardPodium";
import useEmployeeTrainingDashboard from "../hooks/useEmployeeTrainingDashboard";
import { useNotifications } from "@/shared/stores/notificationStore.js";
import BannerSection from "@/shared/components/ui/BannerSection";
import { StaggerList, MotionItem, FadeIn } from "@/shared/motion";

function FilterSelect({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function ViewAllLink({ onClick, label = "View All" }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
    >
      {label}
    </button>
  );
}

export default function EmployeeTrainingDashboard() {
  const { user, isAnyAdmin } = useAuth();
  const navigate = useNavigate();
  const dashboard = useEmployeeTrainingDashboard();
  const { notifications, fetch: fetchNotifications } = useNotifications();

  const [trainingPeriod, setTrainingPeriod] = useState("month");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("month");

  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const res = await getUserLeaderboard(leaderboardPeriod);
      if (res?.data) {
        const apiData = Array.isArray(res.data) ? res.data : [];
        const transformed = apiData.map((entry, index) => ({
          rank: index + 1,
          name: entry.full_name,
          points: entry.points != null ? Number(entry.points) : 0,
        }));
        setLeaderboard(transformed);
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [leaderboardPeriod]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const firstName = user?.full_name?.split(" ")[0] || "Learner";
  const department = user?.department || "My Department";

  const dashboardBanners = useMemo(() => {
    const banners = [];
    const unreadNotifications = (notifications || []).filter((n) => !n.is_read);
    unreadNotifications.forEach((notification) => {
      const entityType = notification.entity_type || 'notification';
      banners.push({
        id: `notification-${notification.id}`,
        type: entityType === 'enrollment' ? 'new_course' : entityType === 'sop' ? 'new_sop' : entityType === 'task' ? 'alert' : 'announcement',
        title: notification.title,
        message: notification.body || '',
        link: notification.link || '/notifications',
        ctaLabel: 'View',
        priority: 5,
      });
    });
    if (dashboard.announcements.length > 0) {
      banners.push({
        id: 'training-announcement',
        type: 'announcement',
        title: dashboard.announcements[0].title || 'New Announcement',
        message: dashboard.announcements[0].body || dashboard.announcements[0].description || 'Check the latest announcement.',
        link: '/announcements',
        ctaLabel: 'View announcement',
        priority: 2,
      });
    }
    if (dashboard.taskCounts?.overdue > 0) {
      banners.push({
        id: 'training-overdue',
        type: 'alert',
        title: 'Overdue Tasks',
        message: `${dashboard.taskCounts.overdue} task${dashboard.taskCounts.overdue !== 1 ? 's' : ''} are currently overdue.`,
        link: '/tasks/my',
        ctaLabel: 'View tasks',
        priority: 4,
      });
    }
    return banners.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [notifications, dashboard.announcements, dashboard.taskCounts]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  if (dashboard.loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading your training dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboard.error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-red-600 dark:text-red-400">{dashboard.error}</p>
          <button
            onClick={dashboard.refetch}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6 bg-slate-50 dark:bg-neutral-950">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 sm:text-[28px]">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Welcome back, {firstName}!</p>
      </div>

      {dashboardBanners.length > 0 && (
        <BannerSection items={dashboardBanners} carousel autoPlayInterval={5000} />
      )}

      {/* Stat Cards Row */}
      <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MotionItem>
          <DashboardStatCard
            label="SOPs Assigned"
            value={`${dashboard.stats.sopsAssigned} SOPs`}
            icon={BookOpen}
            color="blue"
            caption={dashboard.stats.sopsAssigned > 0 ? `${dashboard.sopHighlights.filter(s => s.status === 'Completed').length} completed` : 'No SOPs assigned yet'}
            progress={dashboard.stats.sopsAssigned > 0 ? Math.round((dashboard.sopHighlights.filter(s => s.status === 'Completed').length / dashboard.stats.sopsAssigned) * 100) : 0}
            trend="up"
          />
        </MotionItem>
        <MotionItem>
          <DashboardStatCard
            label="Training Progress"
            value={`${dashboard.stats.trainingProgress}%`}
            icon={GraduationCap}
            color="emerald"
            caption="Keep learning!"
            progress={dashboard.stats.trainingProgress}
            trend="up"
          />
        </MotionItem>
        <MotionItem>
          <DashboardStatCard
            label="Assessments Passed"
            value={dashboard.stats.assessmentsPassed}
            icon={ClipboardCheck}
            color="purple"
            caption={dashboard.stats.assessmentsTotal > 0 ? `${Math.round((Number(dashboard.stats.assessmentsPassed) / dashboard.stats.assessmentsTotal) * 100)}% pass rate` : 'No assessments yet'}
            progress={dashboard.stats.assessmentsTotal > 0 ? Math.round((Number(dashboard.stats.assessmentsPassed) / dashboard.stats.assessmentsTotal) * 100) : 0}
            trend="up"
          />
        </MotionItem>
        <MotionItem>
          <DashboardStatCard
            label="Certificates Earned"
            value={dashboard.stats.certificatesEarned}
            icon={Award}
            color="amber"
            link={{ label: "View all certificates", href: "/certificates/my-certificates" }}
            trend="up"
          />
        </MotionItem>
      </StaggerList>

      {/* Training Progress + SOPs by Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PanelCard
          className="lg:col-span-2"
          title="My Training Progress"
          action={
            <FilterSelect value={trainingPeriod} onChange={setTrainingPeriod}>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
              <option value="quarter">This Quarter</option>
            </FilterSelect>
          }
        >
          <TrainingLineChart data={dashboard.trainingChartData} />
        </PanelCard>

        <PanelCard title="SOPs by Status">
          <DonutChart data={dashboard.sopStatus} total={dashboard.stats.sopsAssigned} />
        </PanelCard>
      </div>

      {/* Announcements + My SOP Highlights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelCard title="Announcements" action={<ViewAllLink onClick={() => navigate("/announcements")} />}>
          {dashboard.announcements.length > 0 ? (
            <FadeIn>
              <ul className="space-y-3">
                {dashboard.announcements.map((item, i) => (
                  <li key={item.id || i} className="group flex items-start gap-3 rounded-lg p-2 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-blue-500/10 dark:text-blue-400">
                      <Megaphone size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} &middot; {item.author || 'Admin'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </FadeIn>
          ) : (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">No announcements at this time.</p>
          )}
        </PanelCard>

        <PanelCard
          title={`My SOP Highlights (${department})`}
          action={<ViewAllLink onClick={() => navigate(isAnyAdmin ? "/sops" : "/my-learning/sops")} />}
        >
          {dashboard.sopHighlights.length > 0 ? (
            <FadeIn>
              <ul className="space-y-4">
                {dashboard.sopHighlights.map((sop, i) => (
                  <li key={i} className="group">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{sop.title}</p>
                      <span
                        className={
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium transition-transform duration-300 group-hover:scale-105 " +
                          (sop.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300")
                        }
                      >
                        {sop.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar value={sop.progress} color={sop.status === "Completed" ? "emerald" : "amber"} />
                      <span className="shrink-0 text-xs font-semibold text-neutral-900 dark:text-neutral-100">{sop.progress}%</span>
                    </div>
                    {sop.updated && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500">Last updated: {sop.updated}</p>
                    )}
                  </li>
                ))}
              </ul>
            </FadeIn>
          ) : (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">No SOPs assigned yet.</p>
          )}
          <div className="mt-4 text-center">
             <button onClick={() => navigate(isAnyAdmin ? "/sops" : "/my-learning/sops")} className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">View all SOPs</button>
          </div>
        </PanelCard>
      </div>

      {/* Department Leaderboard + My Tasks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelCard
          title="Department Leaderboard"
          action={
            <FilterSelect value={leaderboardPeriod} onChange={setLeaderboardPeriod}>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </FilterSelect>
          }
        >
          {leaderboardLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">No leaderboard data available yet.</p>
          ) : (
            <>
              <LeaderboardPodium entries={leaderboard} />
              <ul className="mt-4 divide-y divide-slate-100 dark:divide-neutral-800">
                {leaderboard.slice(3).map((user) => (
                  <li key={user.rank} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-neutral-800">
                      {user.rank}
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                      {user.name.split(" ").map((p) => p[0]).join("")}
                    </div>
                    <span className="flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user.points} pts</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-3 text-center">
            {!isAnyAdmin && (
              <button onClick={() => navigate("/assessments/leaderboard")} className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                View full leaderboard
              </button>
            )}
          </div>
        </PanelCard>

        <PanelCard title="My Tasks" action={<ViewAllLink onClick={() => navigate("/tasks/my")} label="View All" />}>
          <StaggerList className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "To Do", value: dashboard.taskCounts.todo, icon: BookOpen, color: "blue" },
              { label: "In Progress", value: dashboard.taskCounts.in_progress, icon: GraduationCap, color: "amber" },
              { label: "Completed", value: dashboard.taskCounts.completed, icon: ClipboardCheck, color: "emerald" },
              { label: "Overdue", value: dashboard.taskCounts.overdue, icon: Award, color: "rose" },
            ].map((task) => {
              const Icon = task.icon;
              return (
                <MotionItem key={task.label} className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800/30 dark:hover:border-neutral-700">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-neutral-800/50" />
                  <div className="relative">
                    <div className={cn(
                      "mx-auto flex h-9 w-9 items-center justify-center rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-110",
                      task.color === "blue" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" :
                      task.color === "amber" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                      task.color === "emerald" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                      "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                    )}>
                      <Icon size={18} />
                    </div>
                    <p className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{task.value}</p>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">{task.label}</p>
                  </div>
                </MotionItem>
              );
            })}
          </StaggerList>
        </PanelCard>
      </div>

      {/* Bottom CTA Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-blue-50 p-6 dark:bg-blue-500/10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
            <Trophy size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Keep up the great work, {firstName}!</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">You're making solid progress. Keep completing your SOPs to stay on track.</p>
          </div>
        </div>
        <button
          onClick={() => navigate(isAnyAdmin ? "/sops" : "/my-learning/sops")}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Browse My SOPs
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
