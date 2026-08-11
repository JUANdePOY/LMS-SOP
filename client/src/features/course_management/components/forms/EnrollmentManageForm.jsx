export default function EnrollmentManageForm({ courseId, onSubmit, onCancel }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    onSubmit({ ...data, courseId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">User ID</label>
        <input name="userId" required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Role</label>
        <select name="role" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          <option value="learner">Learner</option>
          <option value="instructor">Instructor</option>
          <option value="teaching_assistant">Teaching Assistant</option>
          <option value="guest">Guest</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm border border-[var(--border)]">Cancel</button>
        <button type="submit" className="rounded-lg px-4 py-2 text-sm btn-primary">Add Enrollment</button>
      </div>
    </form>
  );
}
