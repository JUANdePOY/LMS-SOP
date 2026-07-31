import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { Search, BookOpen, Clock, CheckCircle2, TrendingUp, Award, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import StatCard from "../components/StatCard";
import EmployeeCourseCard from "../components/EmployeeCourseCard";
import { useEmployeeDashboard } from "../hooks/useEmployeeDashboard";

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200",
    "bg-purple-100 text-purple-700 dark:bg-purple-500/25 dark:text-purple-200",
    "bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200",
    "bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-200",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/25 dark:text-cyan-200",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200",
    "bg-teal-100 text-teal-700 dark:bg-teal-500/25 dark:text-teal-200",
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { enrollments, publishedCourses, loading, error, refetch } = useEmployeeDashboard();

  const myCourses = enrollments.filter((e) => e.course).map((e) => ({ enrollment: e, course: e.course }));
  const completedCount = myCourses.filter((e) => (e.enrollment.progress_percentage || 0) >= 100).length;
  const inProgressCount = myCourses.filter((e) => {
    const p = e.enrollment.progress_percentage || 0;
    return p > 0 && p < 100;
  }).length;
  const notStartedCount = myCourses.filter((e) => (e.enrollment.progress_percentage || 0) === 0).length;
  const totalProgress = myCourses.length > 0
    ? Math.round(myCourses.reduce((sum, e) => sum + (e.enrollment.progress_percentage || 0), 0) / myCourses.length)
    : 0;

  const handleCourseClick = (courseId) => {
    navigate(`/my-learning/course/${courseId}`);
  };

  const handleLibraryClick = () => {
    navigate("/courses/library");
  };

  const handleContinueLearning = (courseId) => {
    navigate(`/my-learning/course/${courseId}`);
  };

  const inProgressCourses = myCourses.filter((e) => {
    const p = e.enrollment.progress_percentage || 0;
    return p > 0 && p < 100;
  }).sort((a, b) => (b.enrollment.progress_percentage || 0) - (a.enrollment.progress_percentage || 0));

  const filteredLibrary = publishedCourses.filter((c) => {
    const term = (search || "").toLowerCase();
    if (!term) return true;
    return (
      (c.title || "").toLowerCase().includes(term) ||
      (c.description || "").toLowerCase().includes(term) ||
      (c.category || "").toLowerCase().includes(term)
    );
  });

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

  return (
    <div className="w-full max-w-none space-y-6 sm:space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-5 sm:py-6 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-5">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold ${getAvatarColor(user?.full_name || user?.email)} ring-2 ring-white dark:ring-neutral-700 shadow-sm`}>
              {getInitials(user?.full_name || user?.email)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Welcome back, {user?.full_name?.split(" ")[0] || "Learner"}!
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Continue your learning journey
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard title="My Courses" value={myCourses.length} icon={BookOpen} color="blue" />
            <StatCard title="In Progress" value={inProgressCount} icon={Clock} color="amber" />
            <StatCard title="Completed" value={completedCount} icon={CheckCircle2} color="emerald" />
            <StatCard title="Avg. Progress" value={`${totalProgress}%`} icon={TrendingUp} color="purple" />
          </div>
        </div>
      </div>

      {myCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">My Courses</h2>
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

      {inProgressCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Continue Learning</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {inProgressCourses.slice(0, 6).map(({ enrollment, course }) => (
              <EmployeeCourseCard
                key={enrollment.id}
                course={course}
                onClick={() => handleContinueLearning(course.id)}
                showProgress={true}
                progress={enrollment.progress_percentage || 0}
                enrollmentStatus={enrollment.status}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Course Library</h2>
          <button
            onClick={handleLibraryClick}
            className="text-xs font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
          >
            View all →
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm focus:border-blue-500 dark:focus:border-blue-400"
          />
        </div>

        {filteredLibrary.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-4">
              <BookOpen size={24} className="text-neutral-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No courses found</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Try adjusting your search or browse the full library
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLibrary.slice(0, 8).map((course) => (
              <EmployeeCourseCard
                key={course.id}
                course={course}
                onClick={() => handleCourseClick(course.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
