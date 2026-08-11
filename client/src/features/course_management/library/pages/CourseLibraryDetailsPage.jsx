import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit3, Users, BarChart3, CheckCircle, Search, Download, BookOpen, GraduationCap, Layers } from "lucide-react";
import { useCourseLibraryDetails } from "../hooks/useCourseLibraryDetails";
import { useCourseAnalytics } from "../hooks/useCourseAnalytics";
import { useUsers } from "@/features/organization-management/hooks/useUsers";
import { useDepartments } from "@/features/organization-management/hooks/useDepartments";
import { assignEmployees } from "../services/library.api";
import { exportGradesCSV, exportEnrollmentsExcel, exportCoursePDF } from "@/features/course_management/services/export.service";
import { useToast } from "@/shared/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import CourseOverviewHero from "../components/CourseOverviewHero";
import OverviewSection from "../components/OverviewSection";
import BookOpeningTransition from "../components/BookOpeningTransition";
import CourseContentSection from "../components/CourseContentSection";
import { ProgressBar } from "../utils/courseVisuals";
import { StaggerList, MotionItem } from "@/shared/motion";
import { isAdminView } from "../utils/rbac";

const ENROLLMENT_STATUS_META = {
  active: {
    label: "Active",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  pending: {
    label: "Pending",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    chip: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100 border-blue-200 dark:border-blue-500/30",
    dot: "bg-blue-500",
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

export default function CourseLibraryDetailsPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const adminView = isAdminView(user);
  const { course, enrollments, analytics, loading, error, refetch } = useCourseLibraryDetails(courseId);
  const { users: allUsers } = useUsers({ page: 1, limit: 100 });
  const { departments } = useDepartments({ limit: 100 });
  const { track, trackTabView, trackContentView, getSessionSummary } = useCourseAnalytics(courseId);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

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

  const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));
  let availableEmployees = allUsers.filter((u) => !enrolledUserIds.has(u.id));
  if (departmentFilter) {
    availableEmployees = availableEmployees.filter((u) => String(u.department_id) === String(departmentFilter));
  }

  const filteredEmployees = employeeSearch
    ? availableEmployees.filter(
        (u) =>
          (u.full_name || "").toLowerCase().includes(employeeSearch.toLowerCase()) ||
          (u.email || "").toLowerCase().includes(employeeSearch.toLowerCase())
      )
    : availableEmployees;

  const handleAssignEmployees = async () => {
    if (!selectedEmployees.length) return;
    setIsAssigning(true);
    try {
      await assignEmployees(courseId, selectedEmployees);
      track("assign", { count: selectedEmployees.length });
      toast.success(`${selectedEmployees.length} employee(s) assigned to course`);
      setShowAssignModal(false);
      setSelectedEmployees([]);
      setEmployeeSearch("");
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to assign employees");
    } finally {
      setIsAssigning(false);
    }
   };

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

  const handleSelectEmployee = (userId) => {
    setSelectedEmployees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const [activeTab, setActiveTab] = useState("overview");

  const tabs = useMemo(() => {
    const base = [
      { key: "overview", label: "Overview" },
      { key: "content", label: "Content", icon: Layers },
    ];
    if (!adminView) return base;
    return [
      ...base,
      { key: "enrollments", label: "Enrollments", icon: Users },
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "actions", label: "Actions", icon: CheckCircle },
    ];
  }, [adminView]);

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
            progress={myProgress}
            primaryAction={
          adminView ? (
            <button
              onClick={() => navigate(`/courses/${courseId}/builder`)}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-blue-300 dark:hover:border-blue-500/60 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
            >
              <Edit3 size={14} />
              Edit Course
            </button>
          ) : null
        }
      />

      {!adminView && (
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
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
              >
                {Icon && <Icon size={13} />}
                {tab.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
        {activeTab === "content" ? (
          <>
            <CourseContentSection
              courseId={courseId}
              onLessonView={(payload) => trackContentView(payload)}
              headerAction={
                !adminView && myProgress !== undefined ? (
                  <button
                    onClick={() => navigate(`/my-learning/course/${courseId}`)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-blue-300 dark:hover:border-blue-500/60 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                  >
                    <BookOpen size={14} />
                    Go to Course
                  </button>
                ) : null
              }
            />
          </>
        ) : (!adminView && activeTab !== "overview") ? (
          <>
            {activeTab === "enrollments" && (
              <OverviewSection title="Enrolled Employees" icon={Users}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{enrollments.length} total</span>
                  <button onClick={() => setShowAssignModal(true)} className="rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-blue-300 dark:hover:border-blue-500/60 hover:bg-blue-50 dark:hover:bg-blue-500/10">+ Assign Employees</button>
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
                                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{(enrollment.user_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</div>
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
                                    <div className={`h-full rounded-full ${progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${progress}%` }} />
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
                        <CheckCircle size={16} className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
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

            {course?.instructor_name && (
              <OverviewSection title="Instructor">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300">
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

      {showAssignModal && !adminView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-700/80 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Assign Employees to Course</h2>
              <button onClick={() => { setShowAssignModal(false); setSelectedEmployees([]); setEmployeeSearch(""); }} className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200" aria-label="Close">×</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} placeholder="Search employees..." className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 py-1.5 text-sm" />
                </div>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm">
                  <option value="">All Departments</option>
                  {departments.map((dept) => (<option key={dept.id} value={dept.id}>{dept.name}</option>))}
                </select>
              </div>
              <div className="max-h-60 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
                {filteredEmployees.length === 0 ? <div className="p-3 text-xs text-neutral-500">No employees found</div> : filteredEmployees.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800" onClick={() => handleSelectEmployee(user.id)}>
                    <input type="checkbox" checked={selectedEmployees.includes(user.id)} onChange={() => handleSelectEmployee(user.id)} className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{(user.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{user.full_name || "Unknown User"}</p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">{user.email || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="text-xs text-neutral-500">{selectedEmployees.length} employee(s) selected</span>
                <button onClick={handleAssignEmployees} disabled={isAssigning || !selectedEmployees.length} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isAssigning ? "Assigning..." : "Assign"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      );
    }}
  </BookOpeningTransition>
  );
}
