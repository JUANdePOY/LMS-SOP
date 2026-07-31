import { useState } from "react";
import { useParams } from "react-router-dom";
import { useCourseDetails } from "../hooks/useCourseDetails";
import { useModules } from "../hooks/useModules";
import { useEnrollmentList } from "../hooks/useEnrollmentList";
import { useGrades } from "../hooks/useGrades";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDiscussions } from "../hooks/useDiscussions";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Edit3 } from "lucide-react";
import OverviewTab from "../components/tabs/OverviewTab";
import ModulesTab from "../components/tabs/ModulesTab";
import ContentTab from "../components/tabs/ContentTab";
import StudentsTab from "../components/tabs/StudentsTab";
import GradesTab from "../components/tabs/GradesTab";
import QuizzesTab from "../components/tabs/QuizzesTab";
import AssignmentsTab from "../components/tabs/AssignmentsTab";
import DiscussionsTab from "../components/tabs/DiscussionsTab";
import AnalyticsTab from "../components/tabs/AnalyticsTab";
import SettingsTab from "../components/tabs/SettingsTab";
import AddModuleModal from "../components/modals/AddModuleModal";
import AddContentModal from "../components/modals/AddContentModal";
import CreateQuizModal from "../components/modals/CreateQuizModal";
import CreateAssignmentModal from "../components/modals/CreateAssignmentModal";
import EnrollStudentsModal from "../components/modals/EnrollStudentsModal";
import GradeSubmissionModal from "../components/modals/GradeSubmissionModal";
import EditCourseModal from "../components/modals/EditCourseModal";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "modules", label: "Modules" },
  { key: "content", label: "Content" },
  { key: "students", label: "Students" },
  { key: "grades", label: "Grades" },
  { key: "quizzes", label: "Quizzes" },
  { key: "assignments", label: "Assignments" },
  { key: "discussions", label: "Discussions" },
  { key: "analytics", label: "Analytics" },
  { key: "settings", label: "Settings" },
];

export default function CourseDetailsPage() {
  const { id } = useParams();
  const { data: course, loading, error, refetch } = useCourseDetails(id);
  const { data: modules } = useModules(id);
  const { data: enrollments } = useEnrollmentList({ courseId: id });
  const { data: grades } = useGrades({ courseId: id });
  const { data: analytics } = useAnalytics(id);
  const { data: discussions } = useDiscussions(id);
  const [tab, setTab] = useState("overview");
  const [modals, setModals] = useState({});

  const toggleModal = (key) => setModals((p) => ({ ...p, [key]: !p[key] }));

  if (loading) return <p className="text-sm text-neutral-500">Loading course...</p>;
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Course Details</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">Failed to load course</p>
          <p className="text-red-600 mt-1">{error}</p>
          <button onClick={refetch} className="mt-2 rounded-lg px-3 py-1.5 text-sm bg-red-600 text-white">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 p-5 sm:p-6 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/courses")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{course?.title ?? "Course Details"}</h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {course?.status || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => toggleModal("edit")}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-blue-300 dark:hover:border-blue-500/60 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
            >
              <Edit3 size={14} />
              Edit Course
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-300"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        {tab === "overview" && <OverviewTab course={course} />}
        {tab === "modules" && <ModulesTab modules={modules} onAdd={() => toggleModal("module")} onEdit={(m) => {}} onDelete={() => {}} />}
        {tab === "content" && <ContentTab contents={[]} onAdd={() => toggleModal("content")} />}
        {tab === "students" && <StudentsTab enrollments={enrollments} onEnroll={() => toggleModal("enroll")} />}
        {tab === "grades" && <GradesTab grades={grades} onGrade={() => {}} />}
        {tab === "quizzes" && <QuizzesTab quizzes={[]} onAdd={() => toggleModal("quiz")} />}
        {tab === "assignments" && <AssignmentsTab assignments={[]} onAdd={() => toggleModal("assignment")} />}
        {tab === "discussions" && <DiscussionsTab discussions={discussions} />}
        {tab === "analytics" && <AnalyticsTab analytics={analytics} />}
        {tab === "settings" && <SettingsTab course={course} />}
      </div>
      <AddModuleModal open={modals.module} onClose={() => toggleModal("module")} onSubmit={() => refetch?.()} />
      <AddContentModal open={modals.content} onClose={() => toggleModal("content")} onSubmit={() => refetch?.()} />
      <CreateQuizModal open={modals.quiz} onClose={() => toggleModal("quiz")} onSubmit={() => {}} />
      <CreateAssignmentModal open={modals.assignment} onClose={() => toggleModal("assignment")} onSubmit={() => {}} />
      <EnrollStudentsModal open={modals.enroll} onClose={() => toggleModal("enroll")} onSubmit={() => {}} />
      <GradeSubmissionModal open={modals.grade} onClose={() => toggleModal("grade")} onSubmit={() => {}} />
      <EditCourseModal open={modals.edit} onClose={() => toggleModal("edit")} course={course} />
    </div>
  );
}
