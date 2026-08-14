import { useState } from "react";
import { useCourseReport } from "../hooks/useCourseReport";
import { FadeIn } from "@/shared/motion";

export default function ReportsPage() {
  const { courseId } = "reports";
  const { data } = useCourseReport(courseId);
  const [type, setType] = useState("summary");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports</h1>
      <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
        <option value="summary">Summary</option>
        <option value="enrollment">Enrollment</option>
        <option value="grades">Grades</option>
      </select>
      <FadeIn className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4">
        <pre className="text-xs text-neutral-600 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </FadeIn>
    </div>
  );
}
