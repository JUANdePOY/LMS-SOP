export default function SettingsTab({ course, onSave, onArchive }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked={course?.allowSelfEnrollment} />
          Allow self-enrollment
        </label>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked={course?.sendCompletionCertificates} />
          Send completion certificates
        </label>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Max Enrollment</label>
        <input type="number" defaultValue={course?.maxEnrollments} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-between">
        <button onClick={onSave} className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white">Save Settings</button>
        <button onClick={onArchive} className="rounded-lg px-4 py-2 text-sm bg-amber-600 text-white">Archive Course</button>
      </div>
    </div>
  );
}
