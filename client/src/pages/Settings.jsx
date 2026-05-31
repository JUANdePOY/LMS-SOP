import { useState, useEffect, useCallback } from "react";
import {
  Settings as SettingsIcon, Users, Shield, Plus, Pencil, Save, X, Trash2,
  ChevronRight, History, Building2, UsersRound, Plane,
  CheckCircle, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import {
  getSettings, updateSetting, createSetting,
  getSettingsUsers, updateUserRole, getUserRoleHistory, getScopedRoleOptions, createUser, deleteUser,
  getProfile, updateProfile,
} from "@/services/api";

const ROLE_META = {
  admin:           { label: "System Admin",     icon: Shield,        color: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-500/10",     border: "border-red-200 dark:border-red-500/30",     desc: "Full system access" },
  admin_arsen:     { label: "ARCEN Admin",      icon: Building2,     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/30", desc: "Manages a specific ARCEN" },
  admin_group:     { label: "Group Admin",      icon: UsersRound,    color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-500/10",   border: "border-blue-200 dark:border-blue-500/30",   desc: "Manages a specific group" },
  admin_squadron:  { label: "Squadron Admin",   icon: Plane,         color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/30", desc: "Manages a specific squadron" },
  reservist:       { label: "Reservist",        icon: Users,         color: "text-neutral-600 dark:text-neutral-400", bg: "bg-neutral-50 dark:bg-neutral-800", border: "border-neutral-200 dark:border-neutral-700", desc: "Standard reservist access" },
};

const TABS = [
  { key: "roles",    label: "Role Management", icon: Shield },
  { key: "general",  label: "General Settings", icon: SettingsIcon },
];

export default function Settings() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("roles");

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 flex-1 justify-center",
                activeTab === tab.key
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "roles" && <RoleManagement toast={toast} />}
      {activeTab === "general" && <GeneralSettings toast={toast} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ROLE MANAGEMENT TAB
// ════════════════════════════════════════════════════════════════════
function RoleManagement({ toast }) {
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState({ arsens: [], groups: [], squadrons: [] });
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [formRole, setFormRole] = useState("");
  const [formScope, setFormScope] = useState({ arsen_id: null, group_id: null, squadron_id: null });
  const [saving, setSaving] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ email: "", role: "", arsen_id: null, group_id: null, squadron_id: null });
  const [deletingUserId, setDeletingUserId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, optionsRes] = await Promise.all([
        getSettingsUsers(),
        getScopedRoleOptions(),
      ]);
      if (usersRes.data.status === 'success') setUsers(usersRes.data.data);
      if (optionsRes.data.status === 'success') {
        setRoleOptions({ arsens: optionsRes.data.data.arsens, groups: optionsRes.data.data.groups, squadrons: optionsRes.data.data.squadrons });
        setAssignableRoles(optionsRes.data.data.roles || []);
      }
    } catch (err) {
      toast.error("Failed to load role data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (user) => {
    setEditUser(user);
    setFormRole(user.role);
    setFormScope({
      arsen_id: user.scope_arsen_id || null,
      group_id: user.scope_group_id || null,
      squadron_id: user.scope_squadron_id || null,
    });
  };

  const closeEdit = () => {
    setEditUser(null);
    setFormRole("");
    setFormScope({ arsen_id: null, group_id: null, squadron_id: null });
  };

  const handleSaveRole = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const payload = { role: formRole };
      if (formRole === 'admin_arsen') payload.scope_arsen_id = formScope.arsen_id;
      if (formRole === 'admin_group') payload.scope_group_id = formScope.group_id;
      if (formRole === 'admin_squadron') payload.scope_squadron_id = formScope.squadron_id;

      const res = await updateUserRole(editUser.id, payload);
      if (res.data.status === 'success') {
        toast.success(`Role updated for ${editUser.first_name} ${editUser.last_name}`);
        closeEdit();
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to deactivate ${user.first_name} ${user.last_name}? This action cannot be undone.`)) return;
    setDeletingUserId(user.id);
    try {
      const res = await deleteUser(user.id);
      if (res.data.status === 'success') {
        toast.success(`User deactivated`);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleAddUser = async () => {
    setSaving(true);
    try {
      const payload = { email: addUserForm.email, role: addUserForm.role };
      if (addUserForm.role === 'admin_arsen') payload.scope_arsen_id = addUserForm.arsen_id;
      if (addUserForm.role === 'admin_group') payload.scope_group_id = addUserForm.group_id;
      if (addUserForm.role === 'admin_squadron') payload.scope_squadron_id = addUserForm.squadron_id;

      const res = await createUser(payload);
      if (res.data.status === 'success') {
        toast.success(`User created successfully`);
        setShowAddUser(false);
        setAddUserForm({ email: "", role: "", arsen_id: null, group_id: null, squadron_id: null });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (user) => {
    setHistoryUser(user);
    try {
      const res = await getUserRoleHistory(user.id);
      if (res.data.status === 'success') setHistoryData(res.data.data);
    } catch {
      toast.error("Failed to load role history");
    }
  };

  const getScopeLabel = (user) => {
    if (user.role === 'admin_arsen' && user.arsen_name) return user.arsen_name;
    if (user.role === 'admin_group' && user.group_name) return user.group_name;
    if (user.role === 'admin_squadron' && user.squadron_name) return user.squadron_name;
    if (user.role === 'reservist' && user.assignment_squadron_name) return user.assignment_squadron_name;
    if (user.role === 'reservist' && user.assignment_group_name) return user.assignment_group_name;
    return null;
  };

  const [searchQueries, setSearchQueries] = useState({});

  const getSearch = (roleKey) => searchQueries[roleKey] || "";

  const PAGE_SIZE = 10;
  const [pages, setPages] = useState({});

  const getPage = (roleKey) => pages[roleKey] || 1;

  const setPageFor = (roleKey, pageNum) => {
    setPages(prev => ({ ...prev, [roleKey]: pageNum }));
  };

  const setSearchFor = (roleKey, value) => {
    setSearchQueries(prev => ({ ...prev, [roleKey]: value }));
    setPages(prev => ({ ...prev, [roleKey]: 1 }));
  };

  const filterBySearch = (userList, roleKey) => {
    const query = (searchQueries[roleKey] || "").trim().toLowerCase();
    if (!query) return userList;
    return userList.filter((u) =>
      (u.first_name || "").toLowerCase().includes(query) ||
      (u.last_name || "").toLowerCase().includes(query) ||
      (u.service_number || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query)
    );
  };

  const groupedUsers = {};
  ['admin', 'admin_arsen', 'admin_group', 'admin_squadron', 'reservist'].forEach(roleKey => {
    if (roleKey === 'admin' || assignableRoles.includes(roleKey)) {
      groupedUsers[roleKey] = users.filter(u => u.role === roleKey);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(ROLE_META).map(([key, meta]) => (
          <div key={key} className={cn("flex flex-col rounded-xl border px-4 py-3", meta.border, meta.bg)}>
            <span className={cn("text-2xl font-bold leading-none", meta.color)}>
              {groupedUsers[key]?.length || 0}
            </span>
            <span className="mt-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
              {meta.label}
            </span>
          </div>
        ))}
      </div>

      {/* Role sections */}
      {Object.entries(ROLE_META).map(([roleKey, meta]) => {
        const allRoleUsers = groupedUsers[roleKey] || [];
        if (allRoleUsers.length === 0) return null;
        const roleUsers = filterBySearch(allRoleUsers, roleKey);
        const Icon = meta.icon;

        const needsPagination = roleKey === 'admin' || roleKey === 'reservist';
        let displayUsers = roleUsers;
        let totalPages = 1;
        if (needsPagination && roleUsers.length > 0) {
          totalPages = Math.max(1, Math.ceil(roleUsers.length / PAGE_SIZE));
          const currentPage = Math.min(getPage(roleKey), totalPages);
          const startIdx = (currentPage - 1) * PAGE_SIZE;
displayUsers = roleUsers.slice(startIdx, startIdx + PAGE_SIZE);
        }

        return (
            <div key={roleKey} className="flex flex-col gap-3">
             <div className="flex items-center justify-between gap-3">
               <div className="flex items-center gap-2">
                 <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", meta.bg)}>
                   <Icon size={14} className={meta.color} />
                 </div>
                 <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{meta.label}s</h2>
                 <span className="text-[10px] text-neutral-400">
                   {roleUsers.length !== allRoleUsers.length
                     ? `${roleUsers.length} of ${allRoleUsers.length}`
                     : `${allRoleUsers.length} user${allRoleUsers.length !== 1 ? 's' : ''}`}
                 </span>
               </div>
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => {
                     setAddUserForm({ email: "", role: "", arsen_id: null, group_id: null, squadron_id: null });
                     setShowAddUser(true);
                   }}
                   className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                   title="Add user"
                 >
                   <Plus size={14} />
                 </button>
                 <div className="relative w-full max-w-[220px]">
                   <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                   <input
                     type="text"
                     value={getSearch(roleKey)}
                     onChange={(e) => setSearchFor(roleKey, e.target.value)}
                     placeholder="Search…"
                     className={cn(
                       "w-full rounded-lg border pl-8 pr-3 py-1.5 text-xs",
                       "border-neutral-200 dark:border-neutral-700",
                       "bg-white dark:bg-neutral-800",
                       "text-neutral-800 dark:text-neutral-200",
                       "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
                       "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
                       "transition-all duration-150"
                     )}
                   />
                 </div>
               </div>
            </div>

            {roleUsers.length === 0 ? (
              <div className="flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 py-10 text-neutral-400">
                <span className="text-xs">No users match your search</span>
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">User</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">ID Number</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Email</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Scope</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {displayUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                            {user.first_name} {user.last_name}
                          </span>
                          {user.rank && <span className="text-[10px] text-neutral-400">{user.rank}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500 font-mono">{user.service_number}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">{user.email}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {getScopeLabel(user) || <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          user.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                        )}>
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openHistory(user)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Role history"
                          >
                            <History size={13} />
                          </button>
                          <button
                            onClick={() => openEdit(user)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                            title="Change role"
                          >
                            <Pencil size={13} />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={deletingUserId === user.id}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                              title="Deactivate user"
                            >
                              {deletingUserId === user.id ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      </tr>
                    ))}
                  </tbody>
              </table>

              {needsPagination && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/40 px-4 py-2 text-[11px]">
                  <div className="text-neutral-500 dark:text-neutral-400">
                    Page {getPage(roleKey)} of {totalPages} • {roleUsers.length} total
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPageFor(roleKey, Math.max(1, getPage(roleKey) - 1))}
                      disabled={getPage(roleKey) <= 1}
                      className="rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-0.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPageFor(roleKey, Math.min(totalPages, getPage(roleKey) + 1))}
                      disabled={getPage(roleKey) >= totalPages}
                      className="rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-0.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Edit Role Modal ──────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={closeEdit} />
          <div className={cn(
            "relative z-10 w-full max-w-lg rounded-2xl shadow-2xl",
            "bg-white dark:bg-neutral-900",
            "border border-neutral-200 dark:border-neutral-800"
          )}>
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Change Role</h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {editUser.first_name} {editUser.last_name} ({editUser.service_number})
                </p>
              </div>
              <button onClick={closeEdit} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="px-6 py-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {/* Current role */}
              <div className="flex items-center gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2">
                <span className="text-[11px] text-neutral-500">Current:</span>
                <span className={cn("text-[11px] font-semibold", ROLE_META[editUser.role]?.color)}>
                  {ROLE_META[editUser.role]?.label || editUser.role}
                 </span>
               </div>

               {/* Current assignment for reservists */}
               {editUser.role === 'reservist' && (editUser.assignment_squadron_name || editUser.assignment_group_name) && (
                 <div className="flex items-center gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-1.5">
                   <span className="text-[11px] text-neutral-500">Assignment:</span>
                   <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                     {editUser.assignment_squadron_name || editUser.assignment_group_name}
                     {editUser.assignment_squadron_name && editUser.assignment_group_name ? ` · ${editUser.assignment_group_name}` : ''}
                   </span>
                 </div>
               )}

{/* Role selection */}
                <div className="flex flex-col gap-1.5">
                 <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">New Role</label>
                 <div className="flex flex-col gap-1.5">
                   {Object.entries(ROLE_META).map(([key, meta]) => {
                     const RoleIcon = meta.icon;
                     const selected = formRole === key;
                     const canAssign = assignableRoles.includes(key);
                     if (!canAssign) return null;
                     return (
                       <button
                         key={key}
                         onClick={() => {
                           setFormRole(key);
                           if (editUser?.role === 'reservist') {
                             if (key === 'admin_arsen' && editUser.assignment_arsen_id) {
                               setFormScope(s => ({ ...s, arsen_id: editUser.assignment_arsen_id }));
                             } else if (key === 'admin_group' && editUser.assignment_group_id) {
                               setFormScope(s => ({ ...s, group_id: editUser.assignment_group_id }));
                             } else if (key === 'admin_squadron' && editUser.assignment_squadron_id) {
                               setFormScope(s => ({ ...s, squadron_id: editUser.assignment_squadron_id }));
                             }
                           }
                         }}
                         className={cn(
                           "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
                           selected
                             ? cn(meta.border, meta.bg, "ring-1 ring-indigo-500/30")
                             : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                         )}
                       >
                         <RoleIcon size={16} className={selected ? meta.color : "text-neutral-400"} />
                         <div className="flex flex-col flex-1">
                           <span className={cn("text-xs font-semibold", selected ? meta.color : "text-neutral-700 dark:text-neutral-300")}>
                             {meta.label}
                           </span>
                           <span className="text-[10px] text-neutral-400">{meta.desc}</span>
                         </div>
                         {selected && <CheckCircle size={14} className="text-indigo-500" />}
                       </button>
                     );
                   })}
                 </div>
               </div>

              {/* Scope selection */}
              {formRole === 'admin_arsen' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">ARCEN Scope <span className="text-red-500">*</span></label>
                  <select
                    value={formScope.arsen_id || ""}
                    onChange={(e) => setFormScope(s => ({ ...s, arsen_id: e.target.value ? parseInt(e.target.value) : null }))}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">Select ARCEN...</option>
                    {roleOptions.arsens.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {formRole === 'admin_group' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Group Scope <span className="text-red-500">*</span></label>
                  <select
                    value={formScope.group_id || ""}
                    onChange={(e) => setFormScope(s => ({ ...s, group_id: e.target.value ? parseInt(e.target.value) : null }))}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">Select Group...</option>
                    {roleOptions.groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.arsen_name})</option>
                    ))}
                  </select>
                </div>
              )}

              {formRole === 'admin_squadron' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Squadron Scope <span className="text-red-500">*</span></label>
                  <select
                    value={formScope.squadron_id || ""}
                    onChange={(e) => setFormScope(s => ({ ...s, squadron_id: e.target.value ? parseInt(e.target.value) : null }))}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">Select Squadron...</option>
                    {roleOptions.squadrons.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.group_name})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
              <button
                onClick={closeEdit}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={saving || formRole === editUser.role || (formRole === 'admin_arsen' && !formScope.arsen_id) || (formRole === 'admin_group' && !formScope.group_id) || (formRole === 'admin_squadron' && !formScope.squadron_id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150",
                  "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save size={14} />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Role History Modal ───────────────────────────────── */}
      {historyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setHistoryUser(null)} />
          <div className={cn(
            "relative z-10 w-full max-w-lg rounded-2xl shadow-2xl",
            "bg-white dark:bg-neutral-900",
            "border border-neutral-200 dark:border-neutral-800"
          )}>
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Role History</h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {historyUser.first_name} {historyUser.last_name}
                </p>
              </div>
              <button onClick={() => setHistoryUser(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
{historyData.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                   <History size={24} className="mb-2" />
                   <span className="text-xs">No role changes recorded</span>
                 </div>
               ) : (
                 <div className="flex flex-col gap-3">
                   {historyData.map((entry) => (
                     <div key={entry.id} className="flex gap-3 rounded-lg border border-neutral-100 dark:border-neutral-800 p-3">
                       <div className="flex flex-col flex-1 gap-1">
                         <div className="flex items-center gap-2 flex-wrap">
                           <span className={cn("text-[11px] font-semibold", ROLE_META[entry.old_role]?.color)}>
                             {ROLE_META[entry.old_role]?.label || entry.old_role || '(none)'}
                           </span>
                           <ChevronRight size={12} className="text-neutral-300 dark:text-neutral-600" />
                           <span className={cn("text-[11px] font-semibold", ROLE_META[entry.new_role]?.color)}>
                             {ROLE_META[entry.new_role]?.label || entry.new_role}
                           </span>
                         </div>
                         <span className="text-[10px] text-neutral-400">
                           {new Date(entry.changed_at).toLocaleString()}
                           {entry.first_name && ` · by ${entry.first_name} ${entry.last_name}`}
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add User Modal ───────────────────────────────────── */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowAddUser(false)} />
          <div className={cn(
            "relative z-10 w-full max-w-lg rounded-2xl shadow-2xl",
            "bg-white dark:bg-neutral-900",
            "border border-neutral-200 dark:border-neutral-800"
          )}>
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Add New User</h2>
              <button onClick={() => setShowAddUser(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="px-6 py-4 flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {/* Role selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Role <span className="text-red-500">*</span></label>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {assignableRoles.map((key) => {
                    const meta = ROLE_META[key];
                    const RoleIcon = meta?.icon || Users;
                    const selected = addUserForm.role === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setAddUserForm(f => ({ ...f, role: key }))}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-150",
                          selected
                            ? cn(meta.border, meta.bg, "ring-1 ring-indigo-500/30")
                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                        )}
                      >
                        <RoleIcon size={16} className={selected ? meta.color : "text-neutral-400"} />
                        <span className={cn("text-xs font-semibold", selected ? meta.color : "text-neutral-700 dark:text-neutral-300")}>
                          {meta?.label || key}
                        </span>
                        {selected && <CheckCircle size={14} className="ml-auto text-indigo-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scope selection for scoped roles */}
              {addUserForm.role === 'admin_arsen' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">ARCEN Scope <span className="text-red-500">*</span></label>
                  <select
                    value={addUserForm.arsen_id || ""}
                    onChange={(e) => setAddUserForm(f => ({ ...f, arsen_id: e.target.value ? parseInt(e.target.value) : null }))}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">Select ARCEN...</option>
                    {roleOptions.arsens.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {addUserForm.role === 'admin_group' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Group Scope <span className="text-red-500">*</span></label>
                  <select
                    value={addUserForm.group_id || ""}
                    onChange={(e) => setAddUserForm(f => ({ ...f, group_id: e.target.value ? parseInt(e.target.value) : null }))}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">Select Group...</option>
                    {roleOptions.groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.arsen_name})</option>
                    ))}
                  </select>
                </div>
              )}

              {addUserForm.role === 'admin_squadron' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Squadron Scope <span className="text-red-500">*</span></label>
                  <select
                    value={addUserForm.squadron_id || ""}
                    onChange={(e) => setAddUserForm(f => ({ ...f, squadron_id: e.target.value ? parseInt(e.target.value) : null }))}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">Select Squadron...</option>
                    {roleOptions.squadrons.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.group_name})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
              <button
                onClick={() => setShowAddUser(false)}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={saving || !addUserForm.email || !addUserForm.role || 
                  (addUserForm.role === 'admin_arsen' && !addUserForm.arsen_id) || 
                  (addUserForm.role === 'admin_group' && !addUserForm.group_id) || 
                  (addUserForm.role === 'admin_squadron' && !addUserForm.squadron_id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150",
                  "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Plus size={14} />
                )}
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// GENERAL SETTINGS TAB
// ════════════════════════════════════════════════════════════════════
function GeneralSettings({ toast }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSettings();
      if (res.data.status === 'success') setSettings(res.data.data);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      if (res.data.status === 'success') {
        setProfile(res.data.data);
        setEmail(res.data.data.email || "");
      }
    } catch {
      // User might not have email (admin user)
    }
  }, [toast]);

  useEffect(() => { 
    fetchSettings(); 
    fetchProfile();
  }, [fetchSettings, fetchProfile]);

  const startEdit = (setting) => {
    setEditingKey(setting.key);
    setEditValue(typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = async (key) => {
    setSaving(true);
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        parsedValue = editValue;
      }
      const res = await updateSetting(key, { value: parsedValue });
      if (res.data.status === 'success') {
        toast.success("Setting updated");
        cancelEdit();
        fetchSettings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newKey.trim()) return;
    setSaving(true);
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(newValue);
      } catch {
        parsedValue = newValue;
      }
      const res = await createSetting({ key: newKey.trim(), value: parsedValue, description: newDesc || null });
      if (res.data.status === 'success') {
        toast.success("Setting created");
        setShowAdd(false);
        setNewKey("");
        setNewValue("");
        setNewDesc("");
        fetchSettings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create setting");
    } finally {
      setSaving(false);
    }
  };

  const renderValue = (value) => {
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-3">My Profile</h3>
        {profile && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 mb-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter to change password"
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  disabled={!currentPassword}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-40"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    setProfileSaving(true);
                    try {
                      const payload = {};
                      if (email !== profile.email) payload.email = email;
                      if (currentPassword && newPassword) {
                        payload.current_password = currentPassword;
                        payload.new_password = newPassword;
                      }
                      if (Object.keys(payload).length === 0) {
                        toast.error("No changes to save");
                        return;
                      }
                      const res = await updateProfile(payload);
                      if (res.data.status === 'success') {
                        toast.success("Profile updated");
                        fetchProfile();
                        setCurrentPassword("");
                        setNewPassword("");
                      }
                    } catch (err) {
                      toast.error(err.response?.data?.message || "Failed to update profile");
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                  disabled={profileSaving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {profileSaving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save size={14} />}
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">{settings.length} configuration settings</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={13} /> Add Setting
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Key</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Value</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Description</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {settings.map((s) => (
              <tr key={s.key} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200">{s.key}</span>
                </td>
                <td className="px-4 py-3">
                  {editingKey === s.key ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{renderValue(s.value)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-400 max-w-[200px] truncate">{s.description || '—'}</td>
                <td className="px-4 py-3 text-right">
                  {editingKey === s.key ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={cancelEdit} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <X size={13} />
                      </button>
                      <button onClick={() => saveEdit(s.key)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                        <Save size={13} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(s)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                      <Pencil size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add Setting Modal ────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className={cn(
            "relative z-10 w-full max-w-lg rounded-2xl shadow-2xl",
            "bg-white dark:bg-neutral-900",
            "border border-neutral-200 dark:border-neutral-800"
          )}>
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Add New Setting</h2>
              <button onClick={() => setShowAdd(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="px-6 py-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Key <span className="text-red-500">*</span></label>
                <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="e.g. app_name" className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Value <span className="text-red-500">*</span></label>
                <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="e.g. PAFR or true or 30" className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Description</label>
                <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
              <button onClick={() => setShowAdd(false)} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !newKey.trim() || !newValue.trim()} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus size={14} />}
                Add Setting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



