import { useState } from "react";

export default function LearnerDashboard() {
  const [enrolled, setEnrolled] = useState([]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">My Learning</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {enrolled.map((c) => (
          <div key={c.id} className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
            <h4 className="text-sm font-medium">{c.title}</h4>
            <p className="text-xs text-neutral-500">{c.instructor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
