import { useState, useEffect, useCallback } from 'react';
import { getRoles, getRole, createRole, updateRole, deleteRole, getPermissions, updateRolePermissions, getUsers, updateUser } from '@/services/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Card } from '@/shared/components/ui/card';
import { Modal } from '@/shared/components/ui/modal';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Search, Plus, Edit2, Trash2, Shield, Users, Briefcase, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/shared/components/ui/Toast';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS = {
  dashboard: 'Dashboard',
  users: 'Users',
  departments: 'Departments',
  sops: 'SOPs',
  courses: 'Courses',
  assessments: 'Assessments',
  reports: 'Reports',
  settings: 'Settings',
  audit: 'Audit',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200',
    'bg-purple-100 text-purple-700 dark:bg-purple-500/25 dark:text-purple-200',
    'bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200',
    'bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-200',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/25 dark:text-cyan-200',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200',
    'bg-teal-100 text-teal-700 dark:bg-teal-500/25 dark:text-teal-200',
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function RolesPanel({ activeTab = 'roles' }) {
  const { toast } = useToast();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedRoles, setExpandedRoles] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [detailRole, setDetailRole] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [roleUsers, setRoleUsers] = useState([]);
  const [loadingRoleUsers, setLoadingRoleUsers] = useState(false);
  const [roleUserSearch, setRoleUserSearch] = useState('');

  const fetchRoles = useCallback(async () => {
    try {
      const res = await getRoles();
      if (res.data.status === 'success') {
        setRoles(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load roles');
    }
  }, [toast]);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await getPermissions();
      if (res.data.status === 'success') {
        setPermissions(res.data.data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab !== 'roles') return;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRoles(), fetchPermissions()]);
      setLoading(false);
    };
    load();
  }, [activeTab, fetchRoles, fetchPermissions]);

  const loadRolePermissions = useCallback(async (role) => {
    try {
      const res = await getRole(role.id);
      const perms = res.data?.data?.permissions || [];
      setSelectedPermissions(prev => ({ ...prev, [role.name]: perms.map(p => p.name) }));
    } catch {
      setSelectedPermissions(prev => ({ ...prev, [role.name]: [] }));
    }
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createRole(formData);
      toast.success('Role created successfully');
      setShowAddModal(false);
      setFormData({});
      fetchRoles();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create role';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await updateRole(editingRole.id, formData);
      toast.success('Role updated successfully');
      setShowEditModal(false);
      setEditingRole(null);
      setFormData({});
      fetchRoles();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update role';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    setSaving(true);
    try {
      await deleteRole(deletingRole.id);
      toast.success('Role deleted successfully');
      setShowDeleteConfirm(false);
      setDeletingRole(null);
      fetchRoles();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete role';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async (roleName) => {
    setSaving(true);
    try {
      const perms = getCurrentPermissions(roleName);
      await updateRolePermissions(roleName, perms);
      toast.success('Permissions updated successfully');
      setExpandedRoles(prev => ({ ...prev, [roleName]: false }));
      fetchRoles();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update permissions';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name || '',
      display_name: role.display_name || '',
      description: role.description || '',
      is_active: role.is_active ?? true,
    });
    setShowEditModal(true);
  };

  const openDelete = (role) => {
    setDeletingRole(role);
    setShowDeleteConfirm(true);
  };

  const openDetail = (role) => {
    setDetailRole(role);
    loadRoleUsers(role.name);
  };

  const closeDetail = () => {
    setDetailRole(null);
    setRoleUsers([]);
    setRoleUserSearch('');
  };

  const loadRoleUsers = useCallback(async (roleName) => {
    setLoadingRoleUsers(true);
    try {
      const res = await getUsers({ role: roleName });
      if (res.data.status === 'success') {
        setRoleUsers(res.data.data.rows || []);
      }
    } catch {
      toast.error('Failed to load users for this role');
    } finally {
      setLoadingRoleUsers(false);
    }
  }, [toast]);

  const handleRoleChange = async (userId, newRoleName) => {
    try {
      await updateUser(userId, { role: newRoleName });
      toast.success(`User role updated to ${newRoleName}`);
      setRoleUsers(prev => prev.filter(u => u.id !== userId));
      fetchRoles();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update user role';
      toast.error(message);
    }
  };

  const toggleRoleExpand = async (role) => {
    setExpandedRoles(prev => ({ ...prev, [role.name]: !prev[role.name] }));
    if (!expandedRoles[role.name]) {
      await loadRolePermissions(role);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {});

  const filteredRoles = roles.filter((role) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      role.display_name?.toLowerCase().includes(s) ||
      role.name?.toLowerCase().includes(s)
    );
  });

  const getCurrentPermissions = (roleName) => selectedPermissions[roleName] || [];

  const totalRoles = roles.length;
  const activeRoles = roles.filter(r => r.is_active).length;
  const inactiveRoles = totalRoles - activeRoles;
  const totalPermissions = permissions.length;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 p-5 sm:p-6 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.30),rgba(59,130,246,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.15),rgba(96,165,250,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Roles & Permissions</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Manage roles and assign permissions</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => { setFormData({}); setShowAddModal(true); }}
              className="border-neutral-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-500/60 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
            >
              <Plus size={16} className="mr-2" />
              Add Role
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="group relative overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-500/40 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 to-transparent dark:from-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center ring-1 ring-purple-200/60 dark:ring-purple-500/30">
              <Shield size={18} className="text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{totalRoles}</p>
              <p className="text-[10px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300">Total Roles</p>
            </div>
          </div>
        </Card>
        <Card className="group relative overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-500/40 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center ring-1 ring-emerald-200/60 dark:ring-emerald-500/30">
              <Shield size={18} className="text-emerald-600 dark:text-emerald-300" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{activeRoles}</p>
              <p className="text-[10px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300">Active Roles</p>
            </div>
          </div>
        </Card>
        <Card className="group relative overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-rose-200 dark:hover:border-rose-500/40 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/60 to-transparent dark:from-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center ring-1 ring-rose-200/60 dark:ring-rose-500/30">
              <Shield size={18} className="text-rose-600 dark:text-rose-300" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{inactiveRoles}</p>
              <p className="text-[10px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300">Inactive Roles</p>
            </div>
          </div>
        </Card>
        <Card className="group relative overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-amber-200 dark:hover:border-amber-500/40 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center ring-1 ring-amber-200/60 dark:ring-amber-500/30">
              <Users size={18} className="text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{totalPermissions}</p>
              <p className="text-[10px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300">Permissions</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="Search roles by name or display name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 sm:pl-10 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all"
        />
      </div>

      <Card className="overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-neutral-50 to-neutral-100/80 dark:from-neutral-800 dark:to-neutral-700/80">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  Role Name
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  Display Name
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  Permissions
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  Status
                </th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/80">
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                        <Shield size={28} className="text-neutral-400 dark:text-neutral-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No roles found</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Try adjusting your search</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role, idx) => {
                  return (
                    <tr key={role.id} onClick={() => openDetail(role)} className={`group cursor-pointer transition-all duration-150 hover:bg-purple-50/70 dark:hover:bg-neutral-700/60 ${idx % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50/40 dark:bg-neutral-800/60'}`}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                            <Shield size={16} className="text-indigo-600 dark:text-indigo-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{role.name || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-neutral-700 dark:text-neutral-200 truncate max-w-[220px]">
                        {role.display_name || '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
                        {role.permission_count || 0} permissions
                      </td>
                      <td className="px-3 py-3 text-sm text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
                        {role.is_active ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleRoleExpand(role); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 transition-all"
                            title={expandedRoles[role.name] ? "Collapse permissions" : "Manage permissions"}
                          >
                            {expandedRoles[role.name] ? <ChevronDown size={15} /> : <Users size={14} />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(role); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 transition-all"
                            title="Edit role"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDelete(role); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/15 dark:hover:text-red-300 transition-all"
                            title="Delete role"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredRoles.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Showing {filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {showAddModal && (
        <Modal open={showAddModal} title="Add New Role" onClose={() => { setShowAddModal(false); setFormData({}); }}>
          <div className="flex flex-col gap-4 sm:gap-5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Role Name <span className="text-red-500">*</span></label>
              <Input value={formData.name || ''} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. manager" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              <p className="text-[10px] text-neutral-400 mt-1">Use lowercase with underscores (e.g. department_head)</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Display Name <span className="text-red-500">*</span></label>
              <Input value={formData.display_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))} placeholder="e.g. Manager" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Optional description" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setShowAddModal(false); setFormData({}); }} className="border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600">Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="shadow-sm hover:shadow-md transition-all">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Create Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showEditModal && editingRole && (
        <Modal open={showEditModal} title="Edit Role" onClose={() => { setShowEditModal(false); setEditingRole(null); setFormData({}); }}>
          <div className="flex flex-col gap-4 sm:gap-5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Role Name</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              <p className="text-[10px] text-neutral-400 mt-1">Use lowercase with underscores (e.g. department_head)</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Display Name</label>
              <Input value={formData.display_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingRole(null); setFormData({}); }} className="border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600">Cancel</Button>
              <Button onClick={handleEdit} disabled={saving} className="shadow-sm hover:shadow-md transition-all">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteConfirm && deletingRole && (
        <ConfirmDialog
          title="Delete Role"
          message={`Are you sure you want to delete role "${deletingRole.display_name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteConfirm(false); setDeletingRole(null); }}
        />
      )}

      {detailRole && (
        <Modal open={!!detailRole} title="Role Details" onClose={closeDetail} maxWidth="max-w-3xl">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center ring-2 ring-white dark:ring-neutral-700 shadow-sm">
                <Shield size={24} className="text-indigo-600 dark:text-indigo-300" />
              </div>
              <div>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{detailRole.display_name || '—'}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">{detailRole.name || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Status</span>
                <p className="mt-0.5">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", detailRole.is_active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400")}>
                    {detailRole.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Permissions</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{detailRole.permission_count || 0} permissions assigned</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Description</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{detailRole.description || '—'}</p>
              </div>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Users with this Role ({roleUsers.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <Input
                    placeholder="Search users…"
                    value={roleUserSearch}
                    onChange={(e) => setRoleUserSearch(e.target.value)}
                    className="pl-8 text-sm border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              {loadingRoleUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {roleUsers.filter(u => {
                    if (!roleUserSearch) return true;
                    const s = roleUserSearch.toLowerCase();
                    return (u.full_name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s);
                  }).map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-700/80">
                      <div className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(u.full_name || u.email)} ring-1 ring-white dark:ring-neutral-700 shadow-sm`}>
                          {getInitials(u.full_name || u.email)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{u.full_name || '—'}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{u.email || '—'}</p>
                        </div>
                      </div>
                      <Select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleRoleChange(u.id, e.target.value);
                          }
                        }}
                        className="w-40 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs"
                      >
                        <option value="" disabled>Change role…</option>
                        {roles.filter(r => r.name !== detailRole.name && r.is_active).map((r) => (
                          <option key={r.id} value={r.name}>{r.display_name || r.name}</option>
                        ))}
                      </Select>
                    </div>
                  ))}
                  {roleUsers.length === 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-4">No users assigned to this role</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={closeDetail} className="border-neutral-200 dark:border-neutral-700">Close</Button>
              <Button onClick={() => { closeDetail(); openEdit(detailRole); }} className="shadow-sm">
                Edit Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {filteredRoles.map((role) => {
        const isExpanded = !!expandedRoles[role.name];
        const currentPerms = getCurrentPermissions(role.name);
        if (!isExpanded) return null;
        return (
          <div key={`panel-${role.id}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl max-h-[80vh] mx-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/80">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                    <Shield size={18} className="text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{role.display_name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{role.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedRoles(prev => ({ ...prev, [role.name]: false }))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        {CATEGORY_LABELS[category] || category}
                      </h4>
                      <div className="space-y-1">
                        {perms.map((perm) => {
                          const hasPermission = currentPerms.includes(perm.name);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs cursor-pointer transition-colors ${hasPermission ? 'bg-indigo-50 dark:bg-indigo-500/15' : 'bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                            >
                              <input
                                type="checkbox"
                                checked={hasPermission}
                                onChange={(e) => {
                                  setSelectedPermissions(prev => {
                                    const current = prev[role.name] || [];
                                    return {
                                      ...prev,
                                      [role.name]: e.target.checked
                                        ? [...current, perm.name]
                                        : current.filter(p => p !== perm.name)
                                    };
                                  });
                                }}
                                className="h-3.5 w-3.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className={`font-medium ${hasPermission ? 'text-indigo-700 dark:text-indigo-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                {perm.display_name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/80">
                <Button variant="outline" onClick={() => setExpandedRoles(prev => ({ ...prev, [role.name]: false }))} className="border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600">
                  Cancel
                </Button>
                <Button onClick={() => handleSavePermissions(role.name)} disabled={saving} className="shadow-sm hover:shadow-md transition-all">
                  {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Save Permissions
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
