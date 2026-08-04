import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Edit3, Users, BarChart3, Calendar, CheckCircle, Search, Download, BookOpen, GraduationCap, Clock, Globe } from "lucide-react";
import { useCourseLibraryDetails } from "../hooks/useCourseLibraryDetails";
import { useUsers } from "@/features/organization-management/hooks/useUsers";
import { useDepartments } from "@/features/organization-management/hooks/useDepartments";
import { assignEmployees } from "../services/library.api";
import { exportGradesCSV, exportEnrollmentsExcel, exportCoursePDF } from "@/features/course_management/services/export.service";
import { useToast } from "@/shared/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import CourseOverviewHero from "../components/CourseOverviewHero";
import OverviewSection from "../components/OverviewSection";
import BookOpeningTransition from "../components/BookOpeningTransition";

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
  const isEmployee = user?.role === "employee";
  const { course, enrollments, analytics, loading, error, refetch } = useCourseLibraryDetails(courseId);
  const { users: allUsers } = useUsers({ page: 1, limit: 100 });
  const { departments } = useDepartments({ limit: 100 });
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
    if (isEmployee) return [{ key: "overview", label: "Overview" }];
    return [
      { key: "overview", label: "Overview" },
      { key: "enrollments", label: "Enrollments" },
      { key: "analytics", label: "Analytics" },
      { key: "actions", label: "Actions" },
    ];
  }, [isEmployee]);

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

  if (loading && !course) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Course Not Found</h1>
        <p className="text-sm text-neutral-500">{error}</p>
        <button onClick={() => navigate("/courses/library")} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm">
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
            primaryAction={
          !isEmployee ? (
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

      {!isEmployee && (
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-4xl space-y-5">
        {(!isEmployee && activeTab !== "overview") ? (
          <>
            {activeTab === "enrollments" && (
              <OverviewSection title="Enrolled Employees" icon={Users}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{enrollments.length} total</span>
                  <button onClick={() => setShowAssignModal(true)} className="rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-blue-300 dark:hover:border-blue-500/60 hover:bg-blue-50 dark:hover:bg-blue-500/10">+ Assign Employees</button>
                </div>
                {enrollments.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No employees enrolled yet</p>
                    <button onClick={() => setShowAssignModal(true)} className="mt-2 rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-300">Assign first employee</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Employee</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Email</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Progress</th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Enrolled</th>
                          <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 w-16">Actions</th>
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
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                                    <div className={`h-full rounded-full ${progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${progress}%` }} />
                                  </div>
                                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{progress}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400">{formatDate(enrollment.enrolled_at || enrollment.created_at)}</td>
                              <td className="px-3 py-2.5">
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
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-neutral-500 dark:text-neutral-400">Completion Rate</span>
                      <span className="text-neutral-900 dark:text-neutral-100 font-medium">{analytics?.completion_rate?.toFixed(0) || 0}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${analytics?.completion_rate || 0}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Active Learners</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">{analytics?.active_learners || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Avg. Time to Complete</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">{analytics?.avg_completion_time ? `${analytics.avg_completion_time} days` : "—"}</span>
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
                <ul className="space-y-2.5">
                  {learningOutcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                      <CheckCircle size={16} className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
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
              <div className="space-y-2.5 text-sm">
                {courseInfoItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">{item.label}</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
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

      {showAssignModal && !isEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-neutral-900 shadow-2xl">
            <div className="border-b border-neutral-200 dark:border-neutral-700 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Assign Employees to Course</h2>
              <button onClick={() => { setShowAssignModal(false); setSelectedEmployees([]); setEmployeeSearch(""); }} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">×</button>
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
