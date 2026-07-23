import { useState, useEffect, useCallback } from "react";
import { Settings as SettingsIcon, Users, Shield, Plus, Pencil, Save, X, Trash2, ChevronRight, History, Building2, CheckCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import {
  getSettings, updateSetting, createSetting,
  getUsers, createUser, updateUser, deleteUser,
  getProfile, updateProfile,
} from "@/services/api";

const ROLE_META = {
  super_admin: { label: "Super Admin", icon: Shield, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/30", desc: "Full system access" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/30", desc: "Admin with scope management" },
  department_head: { label: "Department Head", icon: Building2, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10", border: "border-purple-200 dark:border-purple-500/30", desc: "Department-level manager" },
  employee: { label: "Employee", icon: Users, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/30", desc: "Standard user / learner" },
};

const TABS = [
  { key: "users", label: "User Management", icon: Users },
  { key: "general", label: "General Settings", icon: SettingsIcon },
];

export default function Settings() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddSetting, setShowAddSetting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingSetting, setEditingSetting] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [userForm, setUserForm] = useState({});
  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("");
  const [settingDesc, setSettingDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await getUsers({ limit: 100 });
      if (res.data.status === 'success') setUsers(res.data.data.rows);
    } catch { toast.error("Failed to load users"); }
  }, [toast]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await getSettings();
      if (res.data.status === 'success') setSettings(res.data.data);
    } catch { toast.error("Failed to load settings"); }
  }, [toast]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      if (res.data.status === 'success') {
        setProfile(res.data.data);
        setEmail(res.data.data.email || "");
      }
    } catch { /* ignore */ }
  }, [toast]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchSettings(), fetchProfile()]);
      setLoading(false);
    };
    load();
  }, [fetchUsers, fetchSettings, fetchProfile]);

  const handleAddUser = async () => {
    setSaving(true);
    try {
      const res = await createUser(userForm);
      if (res.data.status === 'success') {
        toast.success("User created successfully");
        setShowAddUser(false);
        setUserForm({});
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (id) => {
    setSaving(true);
    try {
      const res = await updateUser(id, userForm);
      if (res.data.status === 'success') {
        toast.success("User updated successfully");
        setEditingUser(null);
        setUserForm({});
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id) => {
    setSaving(true);
    try {
      const res = await deleteUser(id);
      if (res.data.status === 'success') {
        toast.success("User deactivated successfully");
        setDeletingUserId(null);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate user");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSetting = async (key) => {
    setSaving(true);
    try {
      let parsedValue;
      try { parsedValue = JSON.parse(settingValue); } catch { parsedValue = settingValue; }
      const res = await updateSetting(key, { value: parsedValue });
      if (res.data.status === 'success') {
        toast.success("Setting updated");
        setEditingSetting(null);
        setSettingValue("");
        fetchSettings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSetting = async () => {
    if (!settingKey.trim()) return;
    setSaving(true);
    try {
      let parsedValue;
      try { parsedValue = JSON.parse(settingValue); } catch { parsedValue = settingValue; }
      const res = await createSetting({ key: settingKey.trim(), value: parsedValue, description: settingDesc || null });
      if (res.data.status === 'success') {
        toast.success("Setting created");
        setShowAddSetting(false);
        setSettingKey("");
        setSettingValue("");
        setSettingDesc("");
        fetchSettings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create setting");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const payload = {};
      if (email !== profile?.email) payload.email = email;
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
  };

  const getScopeLabel = (user) => {
    return user.department_name || null;
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.employee_id || "").toLowerCase().includes(q);
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
      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* User Management Tab */}
      {activeTab === "users" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">{users.length} users</p>
            <button
              onClick={() => { setUserForm({}); setShowAddUser(true); }}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus size={13} /> Add User
            </button>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users…"
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">User</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Role</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Department</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredUsers.map((user) => {
                  const RoleIcon = ROLE_META[user.role]?.icon || Users;
                  return (
                    <tr key={user.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                            {user.full_name || '—'}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          ROLE_META[user.role]?.bg || '',
                          ROLE_META[user.role]?.color || ''
                        )}>
                          <RoleIcon size={12} />
                          {ROLE_META[user.role]?.label || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {getScopeLabel(user) || '—'}
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
                            onClick={() => {
                              setUserForm({
                                full_name: user.full_name || '',
                                email: user.email || '',
                                role: user.role || '',
                                department_id: user.department_id || '',
                                position_title: user.position_title || '',
                                employee_id: user.employee_id || '',
                                contact_number: user.contact_number || '',
                                employment_status: user.employment_status || '',
                              });
                              setEditingUser(user);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                            title="Edit user"
                          >
                            <Pencil size={13} />
                          </button>
                          {user.role !== 'super_admin' && (
                            <button
                              onClick={() => setDeletingUserId(user.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              title="Deactivate user"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add User Modal */}
          {showAddUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
              <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowAddUser(false)} />
              <div className="relative z-10 w-full max-w-lg rounded-2xl shadow-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Add New User</h2>
                  <button onClick={() => setShowAddUser(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    <X size={15} />
                  </button>
                </div>
                <div className="px-6 py-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={userForm.full_name || ''} onChange={(e) => setUserForm(f => ({ ...f, full_name: e.target.value }))} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={userForm.email || ''} onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Password <span className="text-red-500">*</span></label>
                    <input type="password" value={userForm.password || ''} onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Role <span className="text-red-500">*</span></label>
                      <select value={userForm.role || ''} onChange={(e) => setUserForm(f => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40">
                        <option value="">Select role…</option>
                        {Object.entries(ROLE_META).map(([key, meta]) => (
                          <option key={key} value={key}>{meta.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Department</label>
                      <select value={userForm.department_id || ''} onChange={(e) => setUserForm(f => ({ ...f, department_id: e.target.value }))} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40">
                        <option value="">Select department…</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
                  <button onClick={() => setShowAddUser(false)} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
                  <button onClick={handleAddUser} disabled={saving || !userForm.email || !userForm.role} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus size={14} />}
                    Create User
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
              <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
              <div className="relative z-10 w-full max-w-lg rounded-2xl shadow-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Edit User</h2>
                  <button onClick={() => setEditingUser(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    <X size={15} />
                  </button>
                </div>
                <div className="px-6 py-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Full Name</label>
                    <input type="text" value={userForm.full_name || ''} onChange={(e) => setUserForm(f => ({ ...f, full_name: e.target.value }))} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Email</label>
                    <input type="email" value={userForm.email || ''} onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Role</label>
                    <select value={userForm.role || ''} onChange={(e) => setUserForm(f => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40">
                      {Object.entries(ROLE_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
                  <button onClick={() => setEditingUser(null)} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
                  <button onClick={() => handleUpdateUser(editingUser.id)} disabled={saving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save size={14} />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {deletingUserId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
              <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setDeletingUserId(null)} />
              <div className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2">Deactivate User</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Are you sure you want to deactivate this user? They will no longer be able to log in.</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setDeletingUserId(null)} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
                  <button onClick={() => handleDeleteUser(deletingUserId)} disabled={saving} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition-colors">
                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Trash2 size={14} />}
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* General Settings Tab */}
      {activeTab === "general" && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-3">My Profile</h3>
            {profile && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 mb-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleSaveProfile} disabled={profileSaving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
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
            <button onClick={() => setShowAddSetting(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
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
                      {editingSetting === s.key ? (
                        <input type="text" value={settingValue} onChange={(e) => setSettingValue(e.target.value)} className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" autoFocus />
                      ) : (
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">{typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400 max-w-[200px] truncate">{s.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {editingSetting === s.key ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditingSetting(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><X size={13} /></button>
                          <button onClick={() => handleSaveSetting(s.key)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"><Save size={13} /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingSetting(s.key); setSettingValue(typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"><Pencil size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Setting Modal */}
          {showAddSetting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
              <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowAddSetting(false)} />
              <div className="relative z-10 w-full max-w-lg rounded-2xl shadow-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Add New Setting</h2>
                  <button onClick={() => setShowAddSetting(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={15} /></button>
                </div>
                <div className="px-6 py-4 flex flex-col gap-3">
                  <div><label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Key <span className="text-red-500">*</span></label><input type="text" value={settingKey} onChange={(e) => setSettingKey(e.target.value)} placeholder="e.g. app_name" className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" /></div>
                  <div><label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Value <span className="text-red-500">*</span></label><input type="text" value={settingValue} onChange={(e) => setSettingValue(e.target.value)} placeholder="e.g. true or 30" className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" /></div>
                  <div><label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Description</label><input type="text" value={settingDesc} onChange={(e) => setSettingDesc(e.target.value)} placeholder="Optional description" className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500/40" /></div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
                  <button onClick={() => setShowAddSetting(false)} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
                  <button onClick={handleAddSetting} disabled={saving || !settingKey.trim() || !settingValue.trim()} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus size={14} />}
                    Add Setting
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}