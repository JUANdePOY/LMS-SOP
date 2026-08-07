import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";

export default function SettingsTab({ course, onSave, onArchive }) {
  const [allowSelfEnrollment, setAllowSelfEnrollment] = useState(Boolean(course?.allowSelfEnrollment));
  const [sendCompletionCertificates, setSendCompletionCertificates] = useState(Boolean(course?.sendCompletionCertificates));
  const [maxEnrollments, setMaxEnrollments] = useState(course?.maxEnrollments ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAllowSelfEnrollment(Boolean(course?.allowSelfEnrollment));
    setSendCompletionCertificates(Boolean(course?.sendCompletionCertificates));
    setMaxEnrollments(course?.maxEnrollments ?? "");
  }, [course]);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        allow_self_enrollment: allowSelfEnrollment,
        send_completion_certificates: sendCompletionCertificates,
        max_enrollments: maxEnrollments === "" ? null : Number(maxEnrollments),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowSelfEnrollment}
            onChange={(e) => setAllowSelfEnrollment(e.target.checked)}
          />
          Allow self-enrollment
        </label>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sendCompletionCertificates}
            onChange={(e) => setSendCompletionCertificates(e.target.checked)}
          />
          Send completion certificates
        </label>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Max Enrollment</label>
        <input
          type="number"
          value={maxEnrollments}
          onChange={(e) => setMaxEnrollments(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-between">
        <Button onClick={handleSave} disabled={saving || !onSave} className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {onArchive && (
          <Button onClick={onArchive} variant="destructive" className="rounded-lg px-4 py-2 text-sm">
            Archive Course
          </Button>
        )}
      </div>
    </div>
  );
}
