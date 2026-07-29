import { useState } from "react";
import { useCourseDetails } from "../hooks/useCourseDetails";
import { useModules } from "../hooks/useModules";
import { useEnrollmentList } from "../hooks/useEnrollmentList";
import { useGrades } from "../hooks/useGrades";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDiscussions } from "../hooks/useDiscussions";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{course?.title ?? "Course Details"}</h1>
          <p className="text-xs text-neutral-500">{course?.status}</p>
        </div>
        <button onClick={() => toggleModal("edit")} className="rounded-lg px-4 py-2 text-sm border border-[var(--border)]">Edit Course</button>
      </div>
      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}>
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
