import { Loader2 } from 'lucide-react';
import { PermissionGrid } from './PermissionGrid';
import { ResourceRestrictionPanel } from './ResourceRestrictionPanel';
import { getInitials, getAvatarColor } from './roleUtils';

export function PermissionsDrawer({
  drawerMode,
  drawerLoading,
  saving,
  editRole,
  editRoleUsers,
  rolePermStates,
  editUser,
  editUserNewRoleName,
  userPermStates,
  entityStates,
  visibleEntityTypes,
  roles,
  onCancel,
  onSave,
  onRoleChange,
  onRoleActionToggle,
  onUserActionToggle,
  onGrantAll,
  onResetDefaults,
  onManageAccessRestrictions,
  onScopeToggle,
  onRecordToggle,
  onEntitySearch,
  onOpenUserEditor,
  onBackToEditUser,
}) {
  const getHeaderTitle = () => {
    if (drawerMode === 'editRole') return `Edit: ${editRole?.display_name || editRole?.name || ''}`;
    if (drawerMode === 'editUser') return `Edit User: ${editUser?.full_name || editUser?.email || ''}`;
    if (drawerMode === 'accessRestrictions') return `Access Restrictions for ${editUser?.full_name || editUser?.email || ''}`;
    return '';
  };

  const headerClass = 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          {drawerMode === 'accessRestrictions' && (
            <button onClick={onBackToEditUser} className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
              ←
            </button>
          )}
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {getHeaderTitle()}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {drawerMode === 'accessRestrictions' ? (
            <button onClick={onBackToEditUser} className={headerClass}>Done</button>
          ) : (
            <>
              <button onClick={onCancel} className={headerClass}>Cancel</button>
              <button onClick={onSave} disabled={saving} className={headerClass + ' disabled:opacity-50'}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {drawerLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            {drawerMode === 'editRole' && (
              <div className="space-y-4">
                <PermissionGrid
                  permStates={rolePermStates}
                  onToggleAction={onRoleActionToggle}
                />
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                    Users with this Role ({editRoleUsers.length})
                  </h4>
                  {editRoleUsers.length === 0 ? (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      No users assigned to this role
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {editRoleUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => onOpenUserEditor(u)}
                          className="w-full flex items-center gap-3 p-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
                        >
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(u.full_name || u.email)}`}
                          >
                            {getInitials(u.full_name || u.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {u.full_name || '—'}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {u.email || '—'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {drawerMode === 'editUser' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Role
                  </label>
                  <select
                    value={editUserNewRoleName || ''}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="w-full text-xs border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {roles.filter((r) => r.is_active).map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.display_name || r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-5 text-xs">
                  <a href="#" onClick={(e) => { e.preventDefault(); onGrantAll(); }} className={headerClass}>
                    Grant all
                  </a>
                  <a href="#" onClick={(e) => { e.preventDefault(); onResetDefaults(); }} className={headerClass}>
                    Reset to role defaults
                  </a>
                </div>

                <PermissionGrid
                  permStates={userPermStates}
                  onToggleAction={onUserActionToggle}
                />

                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onManageAccessRestrictions(); }}
                  className="text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 pt-2 border-t border-neutral-200 dark:border-neutral-700"
                >
                  Manage Access Restrictions →
                </a>
              </div>
            )}

            {drawerMode === 'accessRestrictions' && (
              <ResourceRestrictionPanel
                entityStates={entityStates}
                visibleTypes={visibleEntityTypes}
                onScopeToggle={onScopeToggle}
                onRecordToggle={onRecordToggle}
                onSearch={onEntitySearch}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
