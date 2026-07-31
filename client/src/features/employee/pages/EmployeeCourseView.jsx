import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, BookOpen, Clock, Users, Award, PlayCircle,
  CheckCircle2, Lock, GraduationCap, BarChart3, RefreshCw,
  AlertCircle, FileText, Video, HelpCircle, ClipboardCheck, File,
  ExternalLink, Presentation, Download, Wifi, WifiOff,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/components/ui/Toast";
import { cn } from "@/lib/utils";
import LessonList from "@/features/course_management/components/LessonList";
import LessonProgressBar from "@/features/course_management/components/LessonProgressBar";
import {
  getEmployeeCourseDetails,
  getEmployeeCourseProgress,
  getEmployeeEnrollmentStatus,
  enrollInCourse,
} from "../api/employee.api";

const DIFFICULTY_META = {
  beginner: { label: "Beginner", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30" },
  intermediate: { label: "Intermediate", color: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30" },
  advanced: { label: "Advanced", color: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-100 border-rose-200 dark:border-rose-500/30" },
  all_levels: { label: "All Levels", color: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100 border-sky-200 dark:border-sky-500/30" },
};

const LESSON_TYPE_META = {
  reading: { label: "Reading", icon: FileText, color: "text-blue-500" },
  video: { label: "Video", icon: Video, color: "text-purple-500" },
  quiz: { label: "Quiz", icon: HelpCircle, color: "text-amber-500" },
  assignment: { label: "Assignment", icon: ClipboardCheck, color: "text-rose-500" },
  document: { label: "Document", icon: File, color: "text-emerald-500" },
  sop: { label: "SOP", icon: FileText, color: "text-indigo-500" },
  link: { label: "Link", icon: ExternalLink, color: "text-cyan-500" },
  presentation: { label: "Presentation", icon: Presentation, color: "text-violet-500" },
  downloadable: { label: "Download", icon: Download, color: "text-orange-500" },
  live_session: { label: "Live Session", icon: Video, color: "text-red-500" },
  interactive: { label: "Interactive", icon: FileText, color: "text-lime-500" },
};

export default function EmployeeCourseView() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState(null);
  const [error, setError] = useState(null);

  const parseJSONField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === "string") {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const fetchCourseDetails = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);

    try {
      const [courseRes, enrollmentRes] = await Promise.allSettled([
        getEmployeeCourseDetails(courseId),
        getEmployeeEnrollmentStatus(courseId),
      ]);

      if (courseRes.status === "fulfilled") {
        setCourse(courseRes.value?.data || courseRes.value);
      } else {
        setError(courseRes.reason?.message || "Failed to load course");
      }

      if (enrollmentRes.status === "fulfilled") {
        setEnrollmentStatus(enrollmentRes.value?.data || enrollmentRes.value);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const fetchProgress = useCallback(async () => {
    if (!courseId) return;
    if (!enrollmentStatus?.isEnrolled) return;
    setProgressLoading(true);
    setProgressError(null);
    try {
      const progressRes = await getEmployeeCourseProgress(courseId);
      setProgressData(progressRes?.data || progressRes);
    } catch (err) {
      setProgressError(err.message || "Failed to load progress");
    } finally {
      setProgressLoading(false);
    }
  }, [courseId, enrollmentStatus?.isEnrolled]);

  useEffect(() => {
    fetchCourseDetails();
  }, [fetchCourseDetails]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await enrollInCourse(courseId);
      toast.success("Successfully enrolled in course");
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.message || "Failed to enroll");
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonClick = (lesson) => {
    navigate(`/courses/view/${courseId}/lesson/${lesson.id}`);
  };

  const handleBack = () => {
    navigate("/my-learning");
  };

  const handleRetryProgress = () => {
    fetchProgress();
  };

  const handleContinueLearning = () => {
    const lessons = progressData?.lessons || [];
    const inProgressLesson = lessons.find((l) => l.status === "in_progress");
    const nextLesson = lessons.find((l) => l.status === "unlocked" && l.status !== "completed");
    const firstIncomplete = inProgressLesson || nextLesson;
    if (firstIncomplete) {
      navigate(`/courses/view/${courseId}/lesson/${firstIncomplete.id}`);
    }
  };

  function renderProgressContent() {
    if (!isEnrolled) return null;
    if (progressLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <RefreshCw size={14} className="animate-spin" />
            <span>Loading progress...</span>
          </div>
        </div>
      );
    }
    if (progressError) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={20} className="text-red-500" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{progressError}</p>
            <button
              onClick={handleRetryProgress}
              className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return (
      <>
        <LessonProgressBar completed={summary.completed} total={summary.total} modules={moduleProgress} />
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-500 dark:text-neutral-400">Completion</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">{summary.completionPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                summary.completionPct >= 100 ? "bg-emerald-500" : summary.completionPct >= 50 ? "bg-blue-500" : "bg-amber-500"
              )}
              style={{ width: `${Math.min(summary.completionPct, 100)}%` }}
            />
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Course Not Found</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
        <button
          onClick={handleBack}
          className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm"
        >
          Back to My Learning
        </button>
      </div>
    );
  }

  const difficulty = DIFFICULTY_META[course?.difficulty] || DIFFICULTY_META.all_levels;
  const summary = progressData?.summary || { total: 0, completed: 0, completionPct: 0 };
  const lessons = progressData?.lessons || [];
  const modules = progressData?.modules || [];
  const moduleProgress = progressData?.moduleProgress || [];
  const isEnrolled = enrollmentStatus?.isEnrolled ?? !!progressData;
  const isCompleted = summary.completionPct >= 100;

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {course?.title || "Course Details"}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border", difficulty.color)}>
              {difficulty.label}
            </span>
            {course?.category && (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                {course.category}
              </span>
            )}
            {course?.instructor_name && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                by {course.instructor_name}
              </span>
            )}
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2 mb-4">
            {course?.description || "No description available"}
          </p>

          <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>{course?.enrollment_count || 0} students</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{course?.duration_hours || 0} hours</span>
            </div>
            {course?.lesson_count && (
              <div className="flex items-center gap-1">
                <BookOpen size={14} />
                <span>{course.lesson_count} lessons</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {course && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(course.learning_outcomes && parseJSONField(course.learning_outcomes).length > 0) && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                <GraduationCap size={14} />
                What You'll Learn
              </h2>
              <ul className="space-y-1.5">
                {parseJSONField(course.learning_outcomes).map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(course.prerequisites && parseJSONField(course.prerequisites).length > 0) && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                <BookOpen size={14} />
                Prerequisites
              </h2>
              <ul className="space-y-1.5">
                {parseJSONField(course.prerequisites).map((pre, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{pre}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.lesson_count && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                <BarChart3 size={14} />
                Course Info
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Lessons</span>
                  <span className="text-neutral-700 dark:text-neutral-300">{course.lesson_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Duration</span>
                  <span className="text-neutral-700 dark:text-neutral-300">{course.duration_hours || 0} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Level</span>
                  <span className="text-neutral-700 dark:text-neutral-300">{difficulty.label}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Your Progress</h2>
          {isEnrolled && summary.completionPct > 0 && summary.completionPct < 100 && (
            <button
              onClick={handleContinueLearning}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <PlayCircle size={12} />
              Continue Learning
            </button>
          )}
        </div>
        {isEnrolled ? (
          renderProgressContent()
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-4">
              <Lock size={24} className="text-neutral-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Not enrolled yet</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Enroll to start learning and track your progress
            </p>
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {enrolling ? "Enrolling..." : "Enroll Now"}
            </button>
          </div>
        )}
      </div>

      {isEnrolled && moduleProgress.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Module Progress</h2>
          <div className="space-y-3">
            {moduleProgress.map((mod) => {
              const modPct = mod.totalLessonCount > 0 ? Math.round((mod.completedLessonCount / mod.totalLessonCount) * 100) : 0;
              return (
                <div key={mod.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-700 dark:text-neutral-300 font-medium">{mod.title}</span>
                    <span className="text-neutral-500 dark:text-neutral-400">{mod.completedLessonCount}/{mod.totalLessonCount} lessons</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        modPct >= 100 ? "bg-emerald-500" : modPct >= 50 ? "bg-blue-500" : "bg-amber-500"
                      )}
                      style={{ width: `${modPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isEnrolled && lessons.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Course Content</h2>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={14} />
                Course Completed!
              </span>
            )}
          </div>
          <LessonList
            lessons={lessons}
            modules={modules}
            onLessonClick={handleLessonClick}
            courseId={courseId}
          />
        </div>
      )}
    </div>
  );
}
