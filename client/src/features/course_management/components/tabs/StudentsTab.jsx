import { useAuth } from "@/contexts/AuthContext";

export default function StudentsTab({ enrollments, onEnroll, onUnenroll, onView }) {
  const { isAnyAdmin } = useAuth();
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        {isAnyAdmin && <button onClick={onEnroll} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">Enroll Students</button>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-3 py-2 font-medium text-neutral-500">Student</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-500">Role</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-500">Progress</th>
              <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrollments?.map((e) => (
              <tr key={e.id} className="border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td className="px-3 py-2">{e.userName ?? "Student"}</td>
                <td className="px-3 py-2 text-neutral-500">{e.role}</td>
                <td className="px-3 py-2 text-neutral-500">{e.progress ?? 0}%</td>
                <td className="px-3 py-2 text-right">
                  {isAnyAdmin && <><button onClick={() => onView?.(e)} className="text-xs text-blue-600 hover:underline">View</button><button onClick={() => onUnenroll?.(e)} className="ml-2 text-xs text-red-600 hover:underline">Unenroll</button></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
