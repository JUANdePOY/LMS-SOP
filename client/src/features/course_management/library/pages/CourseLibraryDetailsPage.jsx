import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Edit3, Users, BarChart3, Calendar, Clock, BookOpen, CheckCircle, XCircle, AlertCircle, Search, Download } from "lucide-react";
import { useCourseLibraryDetails } from "../hooks/useCourseLibraryDetails";
import { useUsers } from "@/features/organization-management/hooks/useUsers";
import { enrollInCourse, assignEmployees } from "../services/library.api";
import { useToast } from "@/shared/components/ui/Toast";

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
  const { course, enrollments, analytics, loading, error, refetch } = useCourseLibraryDetails(courseId);
  const { users: allUsers } = useUsers({ page: 1, limit: 100 });
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error, toast]);

  const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));
  const availableEmployees = allUsers.filter((u) => !enrolledUserIds.has(u.id));

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

  const handleEnrollEmployee = async (userId) => {
    try {
      await enrollInCourse(courseId, { user_id: userId });
      toast.success("Employee enrolled");
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to enroll employee");
    }
  };

  const handleSelectEmployee = (userId) => {
    setSelectedEmployees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-5 sm:px-6 py-4 sm:py-5 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/courses/library")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                {course?.title || "Course Details"}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {course?.status || "—"} • {course?.category || "—"} • {course?.difficulty || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/courses/${courseId}/builder`)}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-blue-300 dark:hover:border-blue-500/60 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
            >
              <Edit3 size={14} />
              Edit Course
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Course Description</h2>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300"
              dangerouslySetInnerHTML={{ __html: course?.description || "No description available." }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
                <Users size={14} />
                Enrollments
              </div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{analytics?.total_enrollments || enrollments.length || 0}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
                <BarChart3 size={14} />
                Avg. Progress
              </div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{analytics?.avg_progress?.toFixed(0) || 0}%</p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
                <CheckCircle size={14} />
                Completed
              </div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{analytics?.completed_count || 0}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
                <Calendar size={14} />
                Start Date
              </div>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{formatDate(course?.start_date)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Enrolled Employees</h2>
              <button
                onClick={() => setShowAssignModal(true)}
                className="rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-blue-300 dark:hover:border-blue-500/60 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                + Assign Employees
              </button>
            </div>

            {enrollments.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No employees enrolled yet</p>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="mt-2 rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-300"
                >
                  Assign first employee
                </button>
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
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                {(enrollment.user_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {enrollment.user_name || "Unknown User"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-400">{enrollment.user_email || "—"}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.chip}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`}></span>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-neutral-600 dark:text-neutral-400">{progress}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                            {formatDate(enrollment.enrolled_at || enrollment.created_at)}
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => navigate(`/courses/${courseId}/analytics/user/${enrollment.user_id}`)}
                              className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                              title="View user progress"
                            >
                              <BarChart3 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {analytics && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Analytics Overview</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-neutral-500 dark:text-neutral-400">Completion Rate</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">{analytics.completion_rate?.toFixed(0) || 0}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${analytics.completion_rate || 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-neutral-500 dark:text-neutral-400">Active Learners</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">{analytics.active_learners || 0}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-neutral-500 dark:text-neutral-400">Avg. Time to Complete</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">{analytics.avg_completion_time ? `${analytics.avg_completion_time} days` : "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/courses/${courseId}/builder`)}
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs hover:border-neutral-300 dark:hover:border-neutral-600"
              >
                Edit Course Content
              </button>
              <button
                onClick={() => setShowAssignModal(true)}
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs hover:border-neutral-300 dark:hover:border-neutral-600"
              >
                Assign Employees
              </button>
              <button
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left text-xs hover:border-neutral-300 dark:hover:border-neutral-600"
                title="Export enrollment data"
              >
                <Download size={12} className="inline mr-1" />
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-neutral-900 shadow-2xl">
            <div className="border-b border-neutral-200 dark:border-neutral-700 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Assign Employees to Course</h2>
              <button
                onClick={() => { setShowAssignModal(false); setSelectedEmployees([]); setEmployeeSearch(""); }}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search employees..."
                  className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 py-1.5 text-sm"
                />
              </div>
              <div className="max-h-60 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
                {filteredEmployees.length === 0 ? (
                  <div className="p-3 text-xs text-neutral-500">No employees found</div>
                ) : (
                  filteredEmployees.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      onClick={() => handleSelectEmployee(user.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(user.id)}
                        onChange={() => handleSelectEmployee(user.id)}
                        className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {(user.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {user.full_name || "Unknown User"}
                        </p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                          {user.email || "—"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="text-xs text-neutral-500">
                  {selectedEmployees.length} employee(s) selected
                </span>
                <button
                  onClick={handleAssignEmployees}
                  disabled={isAssigning || !selectedEmployees.length}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAssigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
