import { Field, fieldClass } from "./Field";

export default function StepBasics({ settings, setField, errors, courses, loadingCourses, disabledCourse }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">
          Identity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Course *" error={errors.courseId}>
            {disabledCourse ? (
              <div
                className={`${fieldClass} bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 cursor-not-allowed`}
                aria-label="Course"
              >
                {courses?.[0]?.title || courses?.[0]?.name || "Selected course"}
              </div>
            ) : (
              <select
                required
                value={settings.courseId}
                onChange={(e) => setField("courseId", e.target.value)}
                className={fieldClass}
                disabled={loadingCourses}
              >
                <option value="">Select a course</option>
                {loadingCourses ? (
                  <option disabled>Loading…</option>
                ) : (
                  courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || c.name}
                    </option>
                  ))
                )}
              </select>
            )}
          </Field>
          <Field label="Title *" error={errors.title}>
            <input
              required
              value={settings.title}
              onChange={(e) => setField("title", e.target.value)}
              className={fieldClass}
              placeholder="e.g. Security Fundamentals Final"
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Description">
            <textarea
              value={settings.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Optional description shown to students"
            />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">
          Type & Scoring
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Quiz Type">
            <select
              value={settings.quiz_type}
              onChange={(e) => setField("quiz_type", e.target.value)}
              className={fieldClass}
            >
              <option value="practice">Practice (unlimited attempts)</option>
              <option value="final">Final (limited attempts)</option>
            </select>
          </Field>
          <Field label="Time Limit (seconds)" error={errors.time_limit}>
            <input
              type="number"
              min={0}
              value={settings.time_limit}
              onChange={(e) => setField("time_limit", e.target.value)}
              className={fieldClass}
              placeholder="Leave blank for none"
            />
          </Field>
          <Field label="Passing Score (%)" error={errors.passing_score}>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.passing_score}
              onChange={(e) => setField("passing_score", e.target.value)}
              className={fieldClass}
              placeholder="e.g. 70"
            />
          </Field>
          <Field label="Max Score" error={errors.max_score}>
            <input
              type="number"
              min={1}
              value={settings.max_score}
              onChange={(e) => setField("max_score", e.target.value)}
              className={fieldClass}
            />
          </Field>
          {settings.quiz_type === "final" && (
            <Field label="Max Attempts (default 3)">
              <input
                type="number"
                min={1}
                value={settings.attempts_allowed}
                onChange={(e) => setField("attempts_allowed", e.target.value)}
                className={fieldClass}
              />
            </Field>
          )}
        </div>
      </section>

      <details className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 px-4 py-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 select-none">
          Advanced options
        </summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Feedback Policy">
            <select
              value={settings.feedback_policy}
              onChange={(e) => setField("feedback_policy", e.target.value)}
              className={fieldClass}
            >
              <option value="immediate">Immediate</option>
              <option value="on_completion">On Completion</option>
              <option value="manual">Manual Review</option>
            </select>
          </Field>
          <Field label="Grading Method">
            <select
              value={settings.grading_method}
              onChange={(e) => setField("grading_method", e.target.value)}
              className={fieldClass}
            >
              <option value="auto">Auto (highest score)</option>
              <option value="manual">Manual (highest score)</option>
              <option value="highest">Highest across attempts</option>
            </select>
          </Field>
          <div className="md:col-span-2 flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={settings.randomize_questions}
                onChange={(e) => setField("randomize_questions", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              Shuffle question order
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={settings.shuffle_options}
                onChange={(e) => setField("shuffle_options", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              Shuffle answer options
            </label>
          </div>
        </div>
      </details>
    </div>
  );
}
