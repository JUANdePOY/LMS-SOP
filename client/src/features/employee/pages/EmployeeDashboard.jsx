import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import {
  BookOpen, PlayCircle, RefreshCw, Clock,
  MessageSquare, ArrowRight,
} from "lucide-react";
import EmployeeCourseCard from "../components/EmployeeCourseCard";
import { useEmployeeDashboard } from "../hooks/useEmployeeDashboard";
import { useConversations } from "@/features/messaging/hooks/useMessages";
import { usePageUpdates } from "@/shared/hooks/usePageUpdates";
import UpdateNotificationBanner from "@/shared/components/ui/UpdateNotificationBanner";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

const currentDate = new Date();
const formattedDate = currentDate.toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { enrollments, loading, error, refetch } = useEmployeeDashboard();
  const { conversations } = useConversations();

  const { hasUpdate, loading: refreshingUpdates, refresh: refreshUpdates, dismiss: dismissUpdates } = usePageUpdates({
    intervalMs: 30000,
    checkFn: async () => {
      const { getEmployeeEnrollmentsWithCourses } = await import("../api/employee.api");
      const res = await getEmployeeEnrollmentsWithCourses();
      const rows = res?.data || [];
      return rows.map((e) => ({
        id: e.id,
        progress: e.progress_percentage,
        status: e.status,
        updated_at: e.course?.updated_at,
      }));
    },
  });

  const handleRefreshUpdates = useCallback(() => {
    refreshUpdates(refetch).catch(() => {});
  }, [refreshUpdates, refetch]);

  const myCourses = enrollments.filter((e) => e.course).map((e) => ({ enrollment: e, course: e.course }));

  const handleCourseClick = (courseId) => {
    navigate(`/my-learning/course/${courseId}`);
  };

  const handleLibraryClick = () => {
    navigate("/courses/library");
  };

  const handleContinueLearning = (courseId) => {
    navigate(`/my-learning/course/${courseId}`);
  };

  const handleRefresh = useCallback(() => {
    refetch().catch(() => {});
  }, [refetch]);

  const inProgressCourses = myCourses.filter((e) => {
    const p = e.enrollment.progress_percentage || 0;
    return p > 0 && p < 100;
  }).sort((a, b) => (b.enrollment.progress_percentage || 0) - (a.enrollment.progress_percentage || 0));

  const nextToContinue = inProgressCourses[0];

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error, toast]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading your learning dashboard...</p>
        </div>
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title, onViewAll }) => (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-neutral-400 dark:text-neutral-500" />}
        {title}
      </h2>
      {onViewAll && (
        <button onClick={onViewAll} className="text-xs font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors">
          View all <ArrowRight size={12} className="inline ml-0.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-none mx-auto max-w-6xl space-y-6">
      <UpdateNotificationBanner
        open={hasUpdate}
        message="New changes are available on your dashboard. Refresh to see the latest updates."
        loading={refreshingUpdates}
        onRefresh={handleRefreshUpdates}
        onDismiss={dismissUpdates}
      />

      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-neutral-900 dark:via-blue-900/20 dark:to-indigo-950 shadow-sm">
        <div className="absolute -top-4 -right-4 h-48 w-48 rounded-full bg-gradient-to-br from-blue-300/20 to-purple-300/20 dark:from-blue-500/5 dark:to-purple-500/5 blur-3xl" />
        <div className="absolute -bottom-4 -left-4 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-300/20 to-sky-300/20 dark:from-indigo-500/5 dark:to-sky-500/5 blur-3xl" />
        <div className="absolute inset-0 bg-grid-white/10 dark:bg-grid-neutral-800/20 [mask-image:radial-gradient(white,transparent_85%)]" />

        <div className="relative px-5 sm:px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Good {getGreeting()}, {user?.full_name?.split(" ")[0] || "Learner"}!
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {formattedDate}
              </p>
              {user?.role && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 capitalize">
                  {user.role.replace(/_/g, " ")}
                </p>
              )}
            </div>

            <button
              onClick={handleRefresh}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm transition-colors"
              aria-label="Refresh dashboard"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {nextToContinue && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center shrink-0">
                {nextToContinue.course?.thumbnail_url ? (
                  <img src={nextToContinue.course.thumbnail_url} alt={nextToContinue.course.title} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">Continue Learning</p>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                  {nextToContinue.course?.title || "Untitled Course"}
                </h3>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div className="w-24 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(nextToContinue.enrollment.progress_percentage || 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {nextToContinue.enrollment.progress_percentage || 0}% complete
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleContinueLearning(nextToContinue.course.id)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shrink-0"
            >
              <PlayCircle size={16} />
              Continue
            </button>
          </div>
        </div>
      )}

      {conversations.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm space-y-4">
          <SectionHeader icon={MessageSquare} title="Recent Message" onViewAll={() => navigate("/messaging")} />
          <div className="space-y-2">
            {conversations.slice(0, 3).map((conv) => (
              <div key={conv.id} onClick={() => navigate("/messaging")} className="group cursor-pointer rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                    <MessageSquare size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{conv.subject || "Conversation"}</h3>
                      {conv.unread_count > 0 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100 border border-blue-200 dark:border-blue-500/30">
                          {conv.unread_count} unread
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {conv.last_message_body || "No messages yet"}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {myCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Clock size={16} className="text-neutral-400 dark:text-neutral-500" />
              My Courses
            </h2>
            <button
              onClick={handleLibraryClick}
              className="text-xs font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
            >
              View all →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {myCourses.slice(0, 8).map(({ enrollment, course }) => (
              <EmployeeCourseCard
                key={enrollment.id}
                course={course}
                onClick={() => handleCourseClick(course.id)}
                showProgress={true}
                progress={enrollment.progress_percentage || 0}
                enrollmentStatus={enrollment.status}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
