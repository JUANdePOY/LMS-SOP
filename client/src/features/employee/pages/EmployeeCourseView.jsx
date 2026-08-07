import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, BookOpen, Clock, Users, PlayCircle,
  CheckCircle2, GraduationCap, BarChart3, RefreshCw,
  AlertCircle, Globe, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LessonList from "@/features/course_management/components/LessonList";
import LessonProgressBar from "@/features/course_management/components/LessonProgressBar";
import CourseSOPsSection from "@/features/employee/components/CourseSOPsSection";
import * as session from "@/services/session";
import { useCourseCompletionCertificates } from "@/features/certificate-management/hooks/useCourseCompletionCertificates";
  import {
  getEmployeeCourseDetails,
  getEmployeeCourseProgress,
  getEmployeeEnrollmentStatus,
} from "../api/employee.api";

const DIFFICULTY_META = {
  beginner: { label: "Beginner", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  intermediate: { label: "Intermediate", color: "bg-amber-50 text-amber-700 border-amber-200" },
  advanced: { label: "Advanced", color: "bg-rose-50 text-rose-700 border-rose-200" },
  all_levels: { label: "All Levels", color: "bg-sky-50 text-sky-700 border-sky-200" },
};

export default function EmployeeCourseView() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState(null);
  const [error, setError] = useState(null);
  const { fetchByUser, getCertificateForCourse, issuances } = useCourseCompletionCertificates();
  const currentUser = session.getCurrentUser();
  const userId = currentUser?.id;

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
    const nextLesson = lessons.find((l) => l.status !== "completed" && l.status !== "locked");
    const firstIncomplete = inProgressLesson || nextLesson;
    if (firstIncomplete) {
      navigate(`/courses/view/${courseId}/lesson/${firstIncomplete.id}`);
    }
  };

  const learningOutcomes = parseJSONField(course?.learning_outcomes);
  const prerequisites = parseJSONField(course?.prerequisites);
  const modules = progressData?.modules || [];
  const lessons = progressData?.lessons || [];
  const moduleProgress = progressData?.moduleProgress || [];
  const summary = progressData?.summary || { total: 0, completed: 0, completionPct: 0 };
  const isEnrolled = enrollmentStatus?.isEnrolled ?? !!progressData;
  const isCompleted = summary.completionPct >= 100;
  const difficulty = DIFFICULTY_META[course?.difficulty] || DIFFICULTY_META.all_levels;

  useEffect(() => {
    if (isCompleted && userId && courseId) {
      fetchByUser(userId, 'active');
    }
  }, [isCompleted, userId, courseId, fetchByUser]);

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
      <div className="w-full max-w-3xl mx-auto space-y-4">
        <button onClick={handleBack} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
          <ChevronLeft size={16} /> Back to My Learning
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm">
          <p className="font-medium text-red-800">Course Not Found</p>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none">
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back to My Learning</span>
        </button>

        <div className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          <div className="relative h-48 sm:h-56 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-700 dark:from-blue-900 dark:via-indigo-950 dark:to-purple-950">
            {course?.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(120,200,255,0.12),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(167,157,255,0.08),transparent_60%)]" />
          </div>

          <div className="relative px-5 sm:px-6 py-6 -mt-14 sm:-mt-16 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={cn(
                "inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-semibold border border-white/20 bg-white/10 text-white backdrop-blur-sm"
              )}>
                {difficulty.label}
              </span>
              {course?.category && (
                <span className="inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-medium bg-white/10 text-white/90 border border-white/20 backdrop-blur-sm">
                  {course.category}
                </span>
              )}
              {course?.instructor_name && (
                <span className="inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  {course.instructor_name}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
                {course?.title || "Course Details"}
              </h1>
              {course?.description && (
                <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {course.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-neutral-400 dark:text-neutral-500" />
                <span>{course?.duration_hours || 0}h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-neutral-400 dark:text-neutral-500" />
                <span>{course?.lesson_count || 0} lessons</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-neutral-400 dark:text-neutral-500" />
                <span>{course?.enrollment_count || 0} students</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe size={14} className="text-neutral-400 dark:text-neutral-500" />
                <span>English</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isEnrolled ? (
                <>
                  {isCompleted ? (
                    <button
                      onClick={handleContinueLearning}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle2 size={16} />
                      Review Course
                    </button>
                  ) : summary.completionPct > 0 ? (
                    <button
                      onClick={handleContinueLearning}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      <PlayCircle size={16} />
                      Continue Learning
                    </button>
                  ) : (
                    <button
                      onClick={handleContinueLearning}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      <PlayCircle size={16} />
                      Start Learning
                    </button>
                  )}
                  <button
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </>
              ) : (
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Back to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>

        {isEnrolled && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Your Progress</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {summary.completed} of {summary.total} lessons completed
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{summary.completionPct}%</span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">complete</p>
              </div>
            </div>
            <LessonProgressBar completed={summary.completed} total={summary.total} modules={moduleProgress} />
          </div>
        )}

        {progressLoading && isEnrolled && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 flex items-center justify-center gap-2 text-sm text-neutral-500">
            <RefreshCw size={14} className="animate-spin" />
            <span>Loading progress...</span>
          </div>
        )}

        {progressError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-500/10 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load progress</p>
                <p className="text-xs text-red-600 dark:text-red-400">{progressError}</p>
              </div>
            </div>
            <button
              onClick={handleRetryProgress}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Course Content</h2>
                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        <CheckCircle2 size={14} />
                        Completed
                      </span>
                    )}
                    {isCompleted && userId && courseId && getCertificateForCourse(userId, courseId) && (
                      <button
                        onClick={() => navigate('/certificates/my-certificates')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                      >
                        <Award size={14} />
                        Certificate Issued
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <LessonList
                  lessons={lessons}
                  modules={modules}
                  onLessonClick={handleLessonClick}
                  courseId={courseId}
                />
              </div>
            </div>

            <CourseSOPsSection courseId={courseId} />
          </div>

          <div className="space-y-6">
            {learningOutcomes.length > 0 && (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                  <GraduationCap size={16} className="text-blue-600 dark:text-blue-400" />
                  What you'll learn
                </h3>
                <ul className="space-y-2.5">
                  {learningOutcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                      <CheckCircle2 size={16} className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prerequisites.length > 0 && (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                  <BookOpen size={16} className="text-amber-600 dark:text-amber-400" />
                  Prerequisites
                </h3>
                <ul className="space-y-2">
                  {prerequisites.map((pre, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{pre}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-600 dark:text-indigo-400" />
                Course Info
              </h3>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "Difficulty", value: difficulty.label },
                  { label: "Duration", value: `${course?.duration_hours || 0} hours` },
                  { label: "Lessons", value: String(course?.lesson_count || 0) },
                  { label: "Students", value: String(course?.enrollment_count || 0) },
                  { label: "Language", value: "English" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">{item.label}</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {course?.instructor_name && (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Instructor</h3>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {course.instructor_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{course.instructor_name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Instructor</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
