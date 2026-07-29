export default function EnrollmentTable({ enrollments, onUnenroll, onView }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">User</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Email</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Role</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Progress</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {enrollments?.map((e) => (
            <tr key={e.id} className="border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2">{e.userName ?? "Student"}</td>
              <td className="px-3 py-2 text-neutral-500">{e.userEmail ?? ""}</td>
              <td className="px-3 py-2 text-neutral-500">{e.role}</td>
              <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">{e.status}</span></td>
              <td className="px-3 py-2">{e.progress ?? 0}%</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => onView?.(e)} className="text-xs text-blue-600 hover:underline">View</button>
                <button onClick={() => onUnenroll?.(e)} className="ml-2 text-xs text-red-600 hover:underline">Unenroll</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
