export default function OverviewTab({ course }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Description</h3>
        <p className="text-sm text-neutral-600 mt-1">{course?.description ?? "No description provided."}</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Learning Outcomes</h3>
        <ul className="mt-1 list-disc list-inside text-sm text-neutral-600">
          {(course?.learningOutcomes ?? []).map((outcome, i) => (
            <li key={i}>{outcome}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Prerequisites</h3>
        <ul className="mt-1 list-disc list-inside text-sm text-neutral-600">
          {(course?.prerequisites ?? []).map((pre, i) => (
            <li key={i}>{pre}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
