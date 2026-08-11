import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, BarChart3, CheckCircle, Download, BookOpen, GraduationCap, Layers, PlayCircle, Video, FileText, ListChecks, Clock, ChevronRight } from "lucide-react";
import { ActionIcons } from "@/shared/components/ui/actionIcons";
import { useCourseLibraryDetails } from "../hooks/useCourseLibraryDetails";
import { useCourseAnalytics } from "../hooks/useCourseAnalytics";
import { useModules } from "@/features/course_management/hooks/useModules";
import { getContent } from "@/features/course_management/api/content.api";
import { exportGradesCSV, exportEnrollmentsExcel, exportCoursePDF } from "@/features/course_management/services/export.service";
import { useToast } from "@/shared/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import CourseOverviewHero from "../components/CourseOverviewHero";
import OverviewSection from "../components/OverviewSection";
import BookOpeningTransition from "../components/BookOpeningTransition";
import CourseContentSection from "../components/CourseContentSection";
import QuickAssignModal from "../components/QuickAssignModal";
import { ProgressBar } from "../utils/courseVisuals";
import { StaggerList, MotionItem } from "@/shared/motion";

const ENROLLMENT_STATUS_META = {
  active: {
    label: "Active",
    chip: "bg-success-soft text-[var(--color-success)] dark:bg-success-soft0/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30",
    dot: "bg-success-soft0",
  },
  pending: {
    label: "Pending",
    chip: "bg-warning-soft text-[var(--color-warning)] dark:bg-warning-soft0/15 dark:text-amber-100 border-[rgba(217,163,0,0.25)] dark:border-amber-500/30",
    dot: "bg-warning-soft0",
  },
  completed: {
    label: "Completed",
    chip: "bg-[rgba(242,92,5,0.08)] text-[var(--color-primary-hover)] dark:bg-[rgba(242,92,5,0.08)]0/15 dark:text-[var(--color-primary)] border-[rgba(242,92,5,0.25)] dark:border-[rgba(242,92,5,0.30)]",
    dot: "bg-[rgba(242,92,5,0.08)]0",
  },
  dropped: {
    label: "Dropped",
    chip: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-100 border-red-200 dark:border-red-500/30",
    dot: "bg-red-500",
  },
  suspended: {
    label: "Suspended",
    chip: "bg-neutral-100 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-200 border-neutral-200 dark:border-neutral-500/30",
    dot: "bg-neutral-400",
  },
};

const DIFFICULTY_META = {
  beginner: { label: "Beginner" },
  intermediate: { label: "Intermediate" },
  advanced: { label: "Advanced" },
  all_levels: { label: "All Levels" },
};

function formatDate(date) {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

const LESSON_TYPE_META = {
  video: { icon: Video, label: "Video" },
  document: { icon: FileText, label: "Document" },
  quiz: { icon: ListChecks, label: "Quiz" },
  text: { icon: FileText, label: "Reading" },
};

function LessonRow({ lesson, onView }) {
  const meta = LESSON_TYPE_META[lesson.type] || LESSON_TYPE_META.text;
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onView({ lessonId: lesson.id, title: lesson.title, type: lesson.type })}
      className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
    >
      <Icon size={15} className="shrink-0 text-neutral-400 dark:text-neutral-500" />
      <span className="flex-1 min-w-0 truncate text-neutral-700 dark:text-neutral-200">{lesson.title}</span>
      {lesson.is_required && (
        <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-wide text-[var(--color-warning)] dark:text-[var(--color-warning)]">Required</span>
      )}
      {lesson.duration ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
          <Clock size={11} />
          {lesson.duration}m
        </span>
      ) : null}
    </button>
  );
}

function ModuleAccordion({ courseId, module, index, onView, getContent }) {
  const [open, setOpen] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [loadState, setLoadState] = useState("idle");

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && lessons.length === 0 && loadState === "idle") {
      setLoadState("loading");
      try {
        const res = await getContent(courseId, module.id);
        setLessons(res.data || res || []);
        setLoadState("done");
      } catch {
        setLessons([]);
        setLoadState("error");
      }
    }
  };

  const count = module.content_count ?? lessons.length;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
      >
        <ChevronRight
          size={16}
          className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(242,92,5,0.08)] text-xs font-bold text-[var(--color-primary-hover)] dark:bg-blue-900/20 dark:text-[var(--color-primary)]">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{module.title}</p>
          {module.description && (
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{module.description}</p>
          )}
        </div>
        <span className="shrink-0 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
          {count} {count === 1 ? "lesson" : "lessons"}
        </span>
      </button>

      {open && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-3 py-2">
          {loadState === "loading" ? (
            <div className="space-y-2 px-2.5 py-2">
              {Array.from({ length: Math.max(1, count) }).map((_, i) => (
                <div key={i} className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              ))}
            </div>
          ) : loadState === "error" ? (
            <p className="px-2.5 py-2 text-xs text-red-500">Could not load lessons.</p>
          ) : lessons.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-neutral-400">No lessons in this module yet</p>
          ) : (
            <div className="space-y-0.5">
              {lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} onView={onView} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CourseLessonsSection({ courseId, modules, modulesLoading, onView }) {
  if (modules.length === 0) return null;

  const totalLessons = modules.reduce((sum, m) => sum + (m.content_count ?? 0), 0);

  return (
    <OverviewSection title="Modules & Lessons" icon={BookOpen}>
      <div className="mb-3 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <GraduationCap size={14} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
          {modules.length} {modules.length === 1 ? "module" : "modules"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen size={14} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
          {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
        </span>
      </div>

      {modulesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module, i) => (
            <ModuleAccordion
              key={module.id}
              courseId={courseId}
              module={module}
              index={i}
              onView={onView}
              getContent={getContent}
            />
          ))}
        </div>
      )}
    </OverviewSection>
  );
}

export default function CourseLibraryDetailsPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEmployee = user?.role === "employee";
  const { course, enrollments, analytics, loading, error, refetch } = useCourseLibraryDetails(courseId);
  const { track, trackTabView, trackContentView, getSessionSummary } = useCourseAnalytics(courseId);
  const { data: modules, loading: modulesLoading } = useModules(courseId);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error, toast]);

  const myProgress = useMemo(() => {
    const mine = enrollments.find((e) => e.user_id === user?.id);
    if (!mine) return undefined;
    return typeof mine.progress_percentage === "number" ? mine.progress_percentage : Number(mine.progress) || 0;
  }, [enrollments, user?.id]);

  const handleExport = async (format) => {
    try {
      let blob;
      if (format === "csv") blob = await exportGradesCSV(courseId);
      else if (format === "excel") blob = await exportEnrollmentsExcel(courseId);
      else if (format === "pdf") blob = await exportCoursePDF(courseId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `course-${courseId}-enrollments.${format === "excel" ? "xlsx" : format}`;
      a.click();
      URL.revokeObjectURL(url);
      track("export", { format });
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err.message || "Failed to export data");
    }
  };

  const [activeTab, setActiveTab] = useState("overview");

  const tabs = useMemo(() => {
    const base = [
      { key: "overview", label: "Overview" },
      { key: "content", label: "Content", icon: Layers },
    ];
    if (isEmployee) return base;
    return [
      ...base,
      { key: "enrollments", label: "Enrollments", icon: Users },
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "actions", label: "Actions", icon: CheckCircle },
    ];
  }, [isEmployee]);

  const handleTabChange = useCallback(
    (key) => {
      setActiveTab(key);
      trackTabView(key);
    },
    [trackTabView]
  );

  const courseDescription = course?.description || "No description available.";
  const learningOutcomes = useMemo(() => {
    try {
      const parsed = typeof course?.learning_outcomes === "string" ? JSON.parse(course.learning_outcomes) : course?.learning_outcomes;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [course?.learning_outcomes]);
  const prerequisites = useMemo(() => {
    try {
      const parsed = typeof course?.prerequisites === "string" ? JSON.parse(course.prerequisites) : course?.prerequisites;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [course?.prerequisites]);
  const courseInfoItems = useMemo(() => [
    { label: "Difficulty", value: DIFFICULTY_META[course?.difficulty]?.label || "All Levels" },
    { label: "Duration", value: `${course?.duration_hours || 0} hours` },
    { label: "Lessons", value: String(course?.lesson_count || 0) },
    { label: "Students", value: String(course?.enrollment_count || 0) },
    { label: "Language", value: "English" },
  ], [course]);

  const enhancedAnalytics = useMemo(() => {
    const totalEnrollments = enrollments.length;
    const completed = enrollments.filter((e) => (e.progress_percentage || 0) >= 100).length;
    const inProgress = enrollments.filter((e) => {
      const p = e.progress_percentage || 0;
      return p > 0 && p < 100;
    }).length;
    const avgProgress = totalEnrollments
      ? enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / totalEnrollments
      : 0;
    const completionRate = totalEnrollments ? (completed / totalEnrollments) * 100 : 0;
    return {
      totalEnrollments,
      completed,
      inProgress,
      avgProgress,
      completionRate,
      lessonCount: course?.lesson_count || 0,
    };
  }, [enrollments, course?.lesson_count]);

  const sessionSummary = getSessionSummary();

  if (loading && !course) {
    return (
      <div className="w-full max-w-none space-y-5 sm:space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 animate-pulse">
            <div className="h-40 w-full sm:h-44 sm:w-40 md:h-48 md:w-64 shrink-0 rounded-xl bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex-1 min-w-0 space-y-3">
              <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-6 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
          </div>
        </div>
        <div className="max-w-4xl space-y-5">
          <div className="h-32 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 animate-pulse" />
          <div className="h-40 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/20">
          <BookOpen size={24} className="text-red-500" />
        </div>
        <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Course Not Found</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
        <button
          onClick={() => navigate("/courses/library")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm font-medium hover:border-neutral-300"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <BookOpeningTransition courseId={courseId}>
      {({ onBack }) => {
        return (
          <div className="w-full max-w-none space-y-5 sm:space-y-6">
          <CourseOverviewHero
            course={course}
            onBack={onBack}
            breadcrumb="Back to Library"
            progress={isEmployee ? myProgress : undefined}
            primaryAction={
          isEmployee ? (
            <button
              onClick={() => navigate(`/my-learning/course/${courseId}`)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover-brand transition-all"
            >
              <PlayCircle size={14} />
              Open Course
            </button>
          ) : (
            <button
              onClick={() => navigate(`/courses/${courseId}/builder`)}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-[rgba(242,92,5,0.30)] dark:hover:border-[var(--color-primary)]/60 hover:text-[var(--color-primary-hover)] dark:hover:text-[var(--color-primary)] hover:bg-[rgba(242,92,5,0.08)] dark:hover:bg-[rgba(242,92,5,0.08)]0/10 transition-all"
            >
              <ActionIcons.Edit size={14} />
              Edit Course
            </button>
          )
        }
      />

      {!isEmployee && (
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-1 shadow-sm dark:shadow-none">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-[rgba(242,92,5,0.08)] dark:bg-blue-900/20 text-[var(--color-primary-hover)] dark:text-[var(--color-primary)]"
                    : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
              >
                {Icon && <Icon size={13} />}
                {tab.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-primary)] dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
        {activeTab === "content" ? (
          <CourseContentSection
            courseId={courseId}
            onLessonView={(payload) =>
              isEmployee
                ? navigate(`/my-learning/course/${courseId}`)
                : trackContentView(payload)
            }
            headerAction={
              isEmployee ? (
                <button
                  onClick={() => navigate(`/my-learning/course/${courseId}`)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover-brand transition-colors"
                >
                  <PlayCircle size={14} />
                  Open in Learner View
                </button>
              ) : null
            }
          />
        ) : (!isEmployee && activeTab !== "overview") ? (
          <>
            {activeTab === "enrollments" && (
              <OverviewSection title="Enrolled Employees" icon={Users}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{enrollments.length} total</span>
                  <button onClick={() => setShowAssignModal(true)} className="rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-[rgba(242,92,5,0.30)] dark:hover:border-[var(--color-primary)]/60 hover:bg-[rgba(242,92,5,0.08)] dark:hover:bg-[rgba(242,92,5,0.08)]0/10">+ Assign Employees</button>
                </div>
                {enrollments.length === 0 ? (
                  <div className="text-center py-10 text-neutral-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No employees enrolled yet</p>
                    <button onClick={() => setShowAssignModal(true)} className="mt-2 rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-300">Assign first employee</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-neutral-200/80 dark:border-neutral-700/80">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10 bg-neutral-50/95 dark:bg-neutral-800/95 backdrop-blur">
                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Employee</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Email</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Progress</th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Enrolled</th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {enrollments.map((enrollment) => {
                          const statusKey = enrollment.status || "active";
                          const status = ENROLLMENT_STATUS_META[statusKey] || ENROLLMENT_STATUS_META.active;
                          const progress = enrollment.progress_percentage || 0;
                          return (
                            <tr key={enrollment.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[rgba(242,92,5,0.06)]0 to-[var(--color-secondary-hover)] flex items-center justify-center text-white text-xs font-bold">{(enrollment.user_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</div>
                                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{enrollment.user_name || "Unknown User"}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-400">{enrollment.user_email || "—"}</td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`}></span>{status.label}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="ml-auto flex w-24 items-center gap-2">
                                  <div className="h-2 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                                    <div className={`h-full rounded-full ${progress >= 80 ? "bg-[var(--color-success)]" : progress >= 50 ? "bg-[var(--color-primary)]" : "bg-[var(--color-warning)]"}`} style={{ width: `${progress}%` }} />
                                  </div>
                                  <span className="w-9 text-right text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{progress}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{formatDate(enrollment.enrolled_at || enrollment.created_at)}</td>
                              <td className="px-3 py-2.5 text-right">
                                <button onClick={() => navigate(`/courses/${courseId}/analytics/user/${enrollment.user_id}`)} className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" title="View user progress"><BarChart3 size={12} /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </OverviewSection>
            )}

            {activeTab === "analytics" && (
              <OverviewSection title="Analytics Overview" icon={BarChart3}>
                <StaggerList className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MotionItem>
                    <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/60 dark:bg-neutral-800/40 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Completion Rate</p>
                      <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">{Math.round(enhancedAnalytics.completionRate)}%</p>
                      <div className="mt-2">
                        <ProgressBar value={enhancedAnalytics.completionRate} />
                      </div>
                    </div>
                  </MotionItem>
                  <MotionItem>
                    <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/60 dark:bg-neutral-800/40 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Active Learners</p>
                      <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">{analytics?.active_learners || enhancedAnalytics.inProgress}</p>
                    </div>
                  </MotionItem>
                  <MotionItem>
                    <div className="col-span-2 rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/60 dark:bg-neutral-800/40 p-3 sm:col-span-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Avg. Progress</p>
                      <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">{Math.round(enhancedAnalytics.avgProgress)}%</p>
                    </div>
                  </MotionItem>
                </StaggerList>

                <StaggerList className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MotionItem>
                    <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Enrolled</p>
                      <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">{enhancedAnalytics.totalEnrollments}</p>
                    </div>
                  </MotionItem>
                  <MotionItem>
                    <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Completed</p>
                      <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">{enhancedAnalytics.completed}</p>
                    </div>
                  </MotionItem>
                  <MotionItem>
                    <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Lessons</p>
                      <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">{enhancedAnalytics.lessonCount}</p>
                    </div>
                  </MotionItem>
                  <MotionItem>
                    <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Avg. Time</p>
                      <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">{analytics?.avg_completion_time ? `${analytics.avg_completion_time}d` : "—"}</p>
                    </div>
                  </MotionItem>
                </StaggerList>

                <div className="mt-4 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Your Session Engagement</p>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Content views</p>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{sessionSummary.contentViews}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Tabs opened</p>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{Object.keys(sessionSummary.tabViews).length}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Exports</p>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{sessionSummary.downloads}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Assignments</p>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{sessionSummary.assignments}</p>
                    </div>
                  </div>
                </div>
              </OverviewSection>
            )}

            {activeTab === "actions" && (
              <OverviewSection title="Quick Actions" icon={CheckCircle}>
                <div className="space-y-2">
                  <button onClick={() => navigate(`/courses/${courseId}/builder`)} className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs hover:border-neutral-300 dark:hover:border-neutral-600">Edit Course Content</button>
                  <button onClick={() => setShowAssignModal(true)} className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs hover:border-neutral-300 dark:hover:border-neutral-600">Assign Employees</button>
                  <button onClick={() => handleExport("csv")} className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs hover:border-neutral-300 dark:hover:border-neutral-600 flex items-center gap-2">
                    <Download size={12} /> Export Data
                  </button>
                </div>
              </OverviewSection>
            )}
          </>
        ) : (
          <div className="space-y-5">
            <OverviewSection title="About this course">
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300"
                dangerouslySetInnerHTML={{ __html: courseDescription }}
              />
            </OverviewSection>

            {learningOutcomes.length > 0 && (
              <OverviewSection title="What you'll learn" icon={GraduationCap}>
                <StaggerList className="space-y-2.5">
                  {learningOutcomes.map((outcome, i) => (
                    <MotionItem key={i}>
                      <li className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                        <CheckCircle size={16} className="mt-0.5 text-[var(--color-primary)] dark:text-[var(--color-primary)] shrink-0" />
                        <span>{outcome}</span>
                      </li>
                    </MotionItem>
                  ))}
                </StaggerList>
              </OverviewSection>
            )}

            {prerequisites.length > 0 && (
              <OverviewSection title="Prerequisites" icon={BookOpen}>
                <ul className="space-y-2">
                  {prerequisites.map((pre, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{pre}</span>
                    </li>
                  ))}
                </ul>
              </OverviewSection>
            )}

            <OverviewSection title="Course Info">
              <StaggerList className="space-y-2.5 text-sm">
                {courseInfoItems.map((item) => (
                  <MotionItem key={item.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">{item.label}</span>
                      <span className="text-neutral-900 dark:text-neutral-100 font-medium">{item.value}</span>
                    </div>
                  </MotionItem>
                ))}
              </StaggerList>
            </OverviewSection>

            <CourseLessonsSection
              courseId={courseId}
              modules={modules}
              modulesLoading={modulesLoading}
              onView={(payload) =>
                isEmployee
                  ? navigate(`/my-learning/course/${courseId}`)
                  : trackContentView(payload)
              }
            />

            {course?.instructor_name && (
              <OverviewSection title="Instructor">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-sm font-semibold text-[var(--color-primary-hover)] dark:text-[var(--color-primary)]">
                    {course.instructor_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{course.instructor_name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Instructor</p>
                  </div>
                </div>
              </OverviewSection>
            )}
          </div>
        )}
      </div>

      <QuickAssignModal
        open={showAssignModal}
        course={course}
        onClose={() => setShowAssignModal(false)}
        onAssigned={() => refetch()}
        toast={toast}
      />
      </div>
      );
    }}
  </BookOpeningTransition>
  );
}
