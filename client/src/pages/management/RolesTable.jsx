import { Search } from 'lucide-react';

export function RolesTable({ roles, search, onSearch, onRoleClick, onEditClick, onDeleteClick }) {
  return (
    <>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search roles by name or display name…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                Role
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                Users
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                Status
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No roles found
                  </p>
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr
                  key={role.id}
                  onClick={() => onRoleClick(role)}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {role.display_name || '—'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {role.name || '—'}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                    {role.user_count || 0}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                    {role.is_active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3 text-xs">
                      <a
                        href="#"
                        onClick={(e) => { e.stopPropagation(); onEditClick(role); }}
                        className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                      >
                        Edit
                      </a>
                      <a
                        href="#"
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(role); }}
                        className="text-neutral-600 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-300"
                      >
                        Delete
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 px-1">
        Showing {roles.length} role{roles.length !== 1 ? 's' : ''}
      </p>
    </>
  );
}
