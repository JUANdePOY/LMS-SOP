export default function StepReview({ settings, courseTitle, questions, openBuilder, setOpenBuilder }) {
  const rows = [
    ["Course", courseTitle || "—"],
    ["Title", settings.title || "—"],
    ["Type", settings.quiz_type === "final" ? "Final" : "Practice"],
    ["Time Limit", settings.time_limit ? `${settings.time_limit}s` : "None"],
    ["Passing Score", settings.passing_score ? `${settings.passing_score}%` : "—"],
    ["Max Score", settings.max_score || "—"],
    ["Questions", questions.length],
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Review your quiz before finishing. You can keep adding questions later in the
        builder.
      </p>
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <dl className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
            >
              <dt className="text-neutral-500 dark:text-neutral-400">{key}</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100 truncate text-right max-w-[60%]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
        <input
          type="checkbox"
          checked={openBuilder}
          onChange={(e) => setOpenBuilder(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
        />
        Open in quiz builder after finishing
      </label>
    </div>
  );
}
