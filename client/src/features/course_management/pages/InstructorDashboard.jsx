import { useInstructorDashboard } from "../hooks/useInstructorDashboard";
import ActivityTimeline from "../components/timeline/ActivityTimeline";
import { StaggerList, MotionItem, FadeIn } from "@/shared/motion";

export default function InstructorDashboard() {
  const { data, loading } = useInstructorDashboard();

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Instructor Dashboard</h1>
      <StaggerList className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <MotionItem className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Total Courses</p>
          <p className="text-2xl font-bold">{data?.totalCourses ?? 0}</p>
        </MotionItem>
        <MotionItem className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Total Students</p>
          <p className="text-2xl font-bold">{data?.totalStudents ?? 0}</p>
        </MotionItem>
        <MotionItem className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Pending Grading</p>
          <p className="text-2xl font-bold">{data?.pendingGrading ?? 0}</p>
        </MotionItem>
        <MotionItem className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4 shadow-sm">
          <p className="text-xs text-neutral-500">Avg Completion</p>
          <p className="text-2xl font-bold">{data?.avgCompletion ?? 0}%</p>
        </MotionItem>
      </StaggerList>
      <FadeIn>
        <h2 className="text-base font-semibold mb-2">Recent Activity</h2>
        <ActivityTimeline activities={data?.recentActivities ?? []} />
      </FadeIn>
    </div>
  );
}
