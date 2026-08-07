import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getCourseList } from "@/features/course_management/api/course.api";
import { getEnrollments } from "@/features/course_management/api/enrollment.api";
import { Search, BookOpen, Clock, PlayCircle, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StaggerList, MotionItem } from "@/shared/motion";

const DIFFICULTY_META = {
  beginner: { label: "Beginner", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30" },
  intermediate: { label: "Intermediate", color: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30" },
  advanced: { label: "Advanced", color: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-100 border-rose-200 dark:border-rose-500/30" },
  all_levels: { label: "All Levels", color: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100 border-sky-200 dark:border-sky-500/30" },
};



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

function CourseCard({ course, onClick, showProgress = false, progress = 0 }) {
  const difficulty = DIFFICULTY_META[course.difficulty] || DIFFICULTY_META.all_levels;
  const isCompleted = progress >= 100;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 hover:shadow-lg transition-all duration-200 overflow-hidden"
    >
      <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center">
            <BookOpen size={48} className="text-blue-400 dark:text-blue-500" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="rounded-full bg-white dark:bg-neutral-800 p-2.5 shadow-lg">
            <PlayCircle size={22} className="text-blue-600 dark:text-blue-300" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
            {course.title || "Untitled Course"}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
            {course.description || "No description available"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border", difficulty.color)}>
            {difficulty.label}
          </span>
          {course.category && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              {course.category}
            </span>
          )}
          {course.instructor_name && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              by {course.instructor_name}
            </span>
          )}
        </div>
        {showProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">
                {isCompleted ? "Completed" : `${Math.round(progress)}% complete`}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {course.enrollment_count || 0} enrolled
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isCompleted ? "bg-emerald-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300",
    rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300",
  };

  return (
    <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colorClasses[color])}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{title}</p>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);
  const [publishedCourses, setPublishedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMyCourses = useCallback(async () => {
    try {
      const res = await getEnrollments({ limit: 100 });
      if (res?.data) {
        const enrollments = Array.isArray(res.data) ? res.data : (res.data?.rows || []);
        setMyCourses(enrollments);
      }
    } catch (err) {
      console.error("Failed to load enrollments:", err);
    }
  }, []);

  const fetchPublishedCourses = useCallback(async () => {
    try {
      const res = await getCourseList({ status: "published", limit: 12 });
      if (res?.data) {
        const courses = Array.isArray(res.data) ? res.data : (res.data?.rows || []);
        setPublishedCourses(courses);
      }
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchMyCourses(), fetchPublishedCourses()]);
      setLoading(false);
    };
    load();
  }, [fetchMyCourses, fetchPublishedCourses]);

  const handleCourseClick = (courseId) => {
    navigate(`/courses/view/${courseId}`);
  };

  const handleLibraryClick = () => {
    navigate("/courses/library");
  };

  const filteredLibrary = publishedCourses.filter((c) => {
    const term = (search || "").toLowerCase();
    if (!term) return true;
    return (
      (c.title || "").toLowerCase().includes(term) ||
      (c.description || "").toLowerCase().includes(term) ||
      (c.category || "").toLowerCase().includes(term)
    );
  });

  const completedCount = myCourses.filter((e) => e.progress_percentage >= 100).length;
  const inProgressCount = myCourses.filter((e) => e.progress_percentage > 0 && e.progress_percentage < 100).length;


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
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">My Learning Dashboard</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Track your enrolled courses and progress</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard title="Enrolled Courses" value={myCourses.length} icon={BookOpen} color="blue" />
            <StatCard title="In Progress" value={inProgressCount} icon={Clock} color="amber" />
            <StatCard title="Completed" value={completedCount} icon={CheckCircle2} color="emerald" />
            <StatCard title="Avg. Progress" value={`${myCourses.length > 0 ? Math.round(myCourses.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / myCourses.length) : 0}%`} icon={TrendingUp} color="purple" />
          </div>
        </div>
      </div>

      {myCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">My Courses</h2>
            <button
              onClick={() => navigate("/courses/library")}
              className="text-xs font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
            >
              View all →
            </button>
          </div>

          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {myCourses.slice(0, 8).map((enrollment) => {
              const course = enrollment.course;
              if (!course) return null;
              return (
                <MotionItem key={enrollment.id}>
                  <CourseCard
                    course={course}
                    onClick={() => handleCourseClick(course.id)}
                    showProgress={true}
                    progress={enrollment.progress_percentage || 0}
                  />
                </MotionItem>
              );
            })}
          </StaggerList>
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
              <CourseCard
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
