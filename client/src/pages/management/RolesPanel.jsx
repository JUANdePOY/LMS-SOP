import React, { useState, useEffect, useCallback } from 'react';
import { getRoles, getRole, createRole, updateRole, deleteRole, getPermissions, getUsers, updateUser, getUserPermissions, updateUserPermissions } from '@/services/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Card } from '@/shared/components/ui/card';
import { Modal } from '@/shared/components/ui/modal';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Search, Plus, Edit2, Trash2, Shield, Users, Loader2, ChevronDown, Lock } from 'lucide-react';
import { useToast } from '@/shared/components/ui/Toast';
import { resolveFileUrl } from '@/lib/fileUrl';
import { StaggerList, MotionItem } from "@/shared/motion";
import { useAuth } from "@/contexts/AuthContext";

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
  announcements: 'Announcements',
  events: 'Events',
  notifications: 'Notifications',
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

const FALLBACK_ACTIONS = {
  view_dashboard: ['view'],
  manage_users: ['view', 'create', 'edit', 'delete', 'manage_roles'],
  manage_departments: ['view', 'create', 'edit', 'delete', 'manage_head'],
  manage_sops: ['view', 'create', 'edit', 'delete', 'approve', 'publish', 'assign'],
  manage_courses: ['view', 'create', 'edit', 'delete', 'publish', 'archive', 'enroll', 'grade'],
  manage_assessments: ['view', 'create', 'edit', 'delete', 'assign', 'grade', 'publish'],
  manage_announcements: ['view', 'create', 'edit', 'delete', 'publish'],
  manage_events: ['view', 'create', 'edit', 'delete', 'register', 'manage_registrations'],
  view_reports: ['view', 'export', 'schedule'],
  manage_settings: ['view', 'edit'],
  view_audit_logs: ['view', 'export'],
  'notifications.send': ['send'],
  'notifications.broadcast': ['broadcast'],
};

function parseActions(actionsJson) {
  if (actionsJson) {
    try {
      const arr = Array.isArray(actionsJson) ? actionsJson : JSON.parse(actionsJson);
      if (Array.isArray(arr)) return arr.filter((a) => typeof a === 'string');
    } catch {
      return [];
    }
  }
  return [];
}

function getDefinedActions(permission) {
  const defined = parseActions(permission?.actions);
  if (defined.length > 0 || Array.isArray(permission?.actions)) return defined;
  return FALLBACK_ACTIONS[permission?.name] || [];
}

function getEffectiveActions(perm, userOverrides) {
  const defined = getDefinedActions(perm);
  const override = userOverrides.find((o) => o.permission_name === perm.name);
  if (override) {
    if (!override.granted) return [];
    if (override.actions === null || override.actions === undefined) return defined;
    const userActions = parseActions(override.actions);
    return userActions.filter((a) => defined.includes(a));
  }
  return defined;
}

function formatPermLabel(perm) {
  if (perm.name.startsWith('notifications.')) {
    return perm.name.split('.')[1] || perm.name;
  }
  if (perm.name.startsWith('view_')) return perm.name.replace('view_', '');
  if (perm.name.startsWith('manage_')) return perm.name.replace('manage_', '');
  return perm.name;
}

export default function RolesPanel({ activeTab = 'roles' }) {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedRoles, setExpandedRoles] = useState({});
  const [expandedRoleData, setExpandedRoleData] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [formData, setFormData] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [editorOverrides, setEditorOverrides] = useState([]);
  const [savingOverrides, setSavingOverrides] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await getRoles();
      if (res.data.status === 'success') {
        setRoles(res.data.data);
      }
    } catch {
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
    if (activeTab !== 'roles' || !isSuperAdmin) return;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRoles(), fetchPermissions()]);
      setLoading(false);
    };
    load();
  }, [activeTab, fetchRoles, fetchPermissions, isSuperAdmin]);

  const loadExpandedRole = useCallback(async (role) => {
    try {
      const [roleRes, usersRes] = await Promise.all([
        getRole(role.id),
        getUsers({ role: role.name }),
      ]);
      const rolePerms = roleRes.data?.data?.permissions || [];
      const users = usersRes.data?.data?.rows || [];
      const overrideResults = await Promise.all(
        users.map((u) => getUserPermissions(u.id).catch(() => ({ data: { status: 'success', data: { overrides: [] } } })))
      );
      const userOverrides = {};
      users.forEach((u, idx) => {
        userOverrides[u.id] = overrideResults[idx]?.data?.data?.overrides || [];
      });
      setExpandedRoleData((prev) => ({
        ...prev,
        [role.name]: { users, rolePerms, userOverrides },
      }));
    } catch {
      toast.error('Failed to load role details');
    }
  }, [toast]);

  const toggleRoleExpand = async (role) => {
    const willExpand = !expandedRoles[role.name];
    setExpandedRoles((prev) => ({ ...prev, [role.name]: willExpand }));
    if (willExpand && !expandedRoleData[role.name]) {
      await loadExpandedRole(role);
    }
  };

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

  const openUserEditor = (user, roleName) => {
    const data = expandedRoleData[roleName] || { rolePerms: [], userOverrides: {} };
    const overrides = data.userOverrides[user.id] || [];
    setEditingUser({ ...user, roleName, newRoleName: user.role || roleName });
    setEditorOverrides(overrides);
  };

  const closeUserEditor = () => {
    setEditingUser(null);
    setEditorOverrides([]);
  };

  const getEditorPermState = useCallback(() => {
    if (!editingUser) return [];
    const data = expandedRoleData[editingUser.roleName] || { rolePerms: [] };
    const overrideMap = new Map(editorOverrides.map((o) => [o.permission_name, o]));
    return data.rolePerms.map((perm) => {
      const defined = getDefinedActions(perm);
      const override = overrideMap.get(perm.name);
      if (override) {
        if (!override.granted) {
          return { ...perm, granted: false, definedActions: defined, selectedActions: [], useDefaults: false };
        }
        const userActions = override.actions === null || override.actions === undefined
          ? defined
          : parseActions(override.actions);
        const effective = userActions.filter((a) => defined.includes(a));
        return { ...perm, granted: true, definedActions: defined, selectedActions: effective, useDefaults: false };
      }
      return { ...perm, granted: true, definedActions: defined, selectedActions: defined, useDefaults: true };
    });
  }, [editingUser, editorOverrides, expandedRoleData]);

  const toggleEditorPermission = (permName) => {
    setEditorOverrides((prev) => {
      const existing = prev.find((o) => o.permission_name === permName);
      if (existing) {
        if (existing.granted) {
          return prev.map((o) => o.permission_name === permName ? { ...o, granted: false, actions: [] } : o);
        }
        return prev.filter((o) => o.permission_name !== permName);
      }
      return [...prev, { permission_name: permName, granted: false, actions: [] }];
    });
  };

  const toggleEditorAction = (permName, action) => {
    setEditorOverrides((prev) => {
      const existing = prev.find((o) => o.permission_name === permName);
      const data = expandedRoleData[editingUser.roleName] || { rolePerms: [] };
      const perm = data.rolePerms.find((p) => p.name === permName);
      const defined = getDefinedActions(perm);

      if (existing) {
        const current = existing.actions === null || existing.actions === undefined
          ? defined
          : parseActions(existing.actions);
        const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
        const filtered = next.filter((a) => defined.includes(a));
        return prev.map((o) => o.permission_name === permName ? { ...o, granted: true, actions: filtered } : o);
      }

      const newActions = defined.filter((a) => a !== action);
      return [...prev, { permission_name: permName, granted: true, actions: newActions }];
    });
  };

  const handleSaveUserOverrides = async () => {
    if (!editingUser) return;
    setSavingOverrides(true);
    try {
      const cleaned = editorOverrides.map((o) => ({
        permission_name: o.permission_name,
        granted: o.granted,
        actions: o.granted ? (o.actions || []) : [],
      }));
      const roleChanged = editingUser.newRoleName && editingUser.newRoleName !== editingUser.role;
      if (roleChanged) {
        await updateUser(editingUser.id, { role: editingUser.newRoleName });
      }
      await updateUserPermissions(editingUser.id, cleaned);
      toast.success(roleChanged ? 'User role and permissions updated' : 'User permissions updated');
      closeUserEditor();
      if (expandedRoleData[editingUser.roleName]) {
        setExpandedRoleData((prev) => {
          const roleData = prev[editingUser.roleName];
          return {
            ...prev,
            [editingUser.roleName]: {
              ...roleData,
              userOverrides: {
                ...roleData.userOverrides,
                [editingUser.id]: cleaned,
              },
            },
          };
        });
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update user';
      toast.error(message);
    } finally {
      setSavingOverrides(false);
    }
  };

  const filteredRoles = roles.filter((role) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      role.display_name?.toLowerCase().includes(s) ||
      role.name?.toLowerCase().includes(s)
    );
  });

  const totalRoles = roles.length;
  const activeRoles = roles.filter((r) => r.is_active).length;
  const inactiveRoles = totalRoles - activeRoles;
  const totalPermissions = permissions.length;

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
          <Lock size={32} className="text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Access Restricted</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Only super administrators can manage roles and permissions.</p>
        </div>
      </div>
    );
  }

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

      <StaggerList className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MotionItem>
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
        </MotionItem>
        <MotionItem>
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
        </MotionItem>
        <MotionItem>
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
        </MotionItem>
        <MotionItem>
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
        </MotionItem>
      </StaggerList>

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
                  const isExpanded = !!expandedRoles[role.name];
                  const roleData = expandedRoleData[role.name];
                  return (
                    <React.Fragment key={role.id}>
                      <tr key={role.id} onClick={() => toggleRoleExpand(role)} className={`group cursor-pointer transition-all duration-150 hover:bg-purple-50/70 dark:hover:bg-neutral-700/60 ${idx % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50/40 dark:bg-neutral-800/60'}`}>
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
                              title={isExpanded ? "Collapse" : "Manage permissions"}
                            >
                              {isExpanded ? <ChevronDown size={15} /> : <Users size={14} />}
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
                      {isExpanded && roleData && (
                        <tr key={`expand-${role.id}`}>
                          <td colSpan={5} className="px-4 py-4 bg-neutral-50/60 dark:bg-neutral-900/40">
                            {!roleData ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                    Users with this Role ({roleData.users.length})
                                  </h4>
                                </div>
                                {roleData.users.length === 0 ? (
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-4">No users assigned to this role</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                    {roleData.users.map((u) => {
                                      const userOverrides = roleData.userOverrides[u.id] || [];
                                      const effectivePerms = roleData.rolePerms
                                        .map((p) => ({ ...p, effectiveActions: getEffectiveActions(p, userOverrides) }))
                                        .filter((p) => p.effectiveActions.length > 0);
                                      const effectiveSummary = effectivePerms.map((p) => `${formatPermLabel(p)}: ${p.effectiveActions.join(', ')}`).join(' · ');
                                      return (
                                        <button
                                          key={u.id}
                                          onClick={() => openUserEditor(u, role.name)}
                                          className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 text-left hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-sm transition-all"
                                        >
                                          <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {u.avatar_url ? (
                                              <img
                                                src={resolveFileUrl(u.avatar_url)}
                                                alt={u.full_name || u.email || 'User'}
                                                className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white dark:ring-neutral-700 shadow-sm"
                                              />
                                            ) : (
                                              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(u.full_name || u.email)} ring-1 ring-white dark:ring-neutral-700 shadow-sm shrink-0`}>
                                                {getInitials(u.full_name || u.email)}
                                              </div>
                                            )}
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{u.full_name || '—'}</p>
                                              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{u.email || '—'}</p>
                                              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-1">{effectiveSummary || 'No effective permissions'}</p>
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
              <Input value={formData.name || ''} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. manager" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              <p className="text-[10px] text-neutral-400 mt-1">Use lowercase with underscores (e.g. department_head)</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Display Name <span className="text-red-500">*</span></label>
              <Input value={formData.display_name || ''} onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))} placeholder="e.g. Manager" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional description" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
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
              <Input value={formData.name || ''} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              <p className="text-[10px] text-neutral-400 mt-1">Use lowercase with underscores (e.g. department_head)</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Display Name</label>
              <Input value={formData.display_name || ''} onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
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

      {editingUser && (
        <Modal open={!!editingUser} title={`Edit User - ${editingUser.full_name || editingUser.email || 'User'}`} onClose={closeUserEditor} maxWidth="max-w-3xl">
          <div className="flex flex-col gap-4 sm:gap-5 max-h-[70vh]">
            <div className="flex items-center gap-3">
              {editingUser.avatar_url ? (
                <img
                  src={resolveFileUrl(editingUser.avatar_url)}
                  alt={editingUser.full_name || editingUser.email || 'User'}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-neutral-700 shadow-sm"
                />
              ) : (
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(editingUser.full_name || editingUser.email)} ring-2 ring-white dark:ring-neutral-700 shadow-sm`}>
                  {getInitials(editingUser.full_name || editingUser.email)}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{editingUser.full_name || '—'}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{editingUser.email || '—'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Role</label>
              <Select
                value={editingUser.newRoleName || ''}
                onChange={(e) => setEditingUser((prev) => prev ? { ...prev, newRoleName: e.target.value } : prev)}
                className="w-full border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
              >
                <option value="" disabled>Select role…</option>
                {roles.filter((r) => r.is_active).map((r) => (
                  <option key={r.id} value={r.name}>{r.display_name || r.name}</option>
                ))}
              </Select>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4">
              {Object.entries(
                getEditorPermState().reduce((acc, perm) => {
                  const category = perm.category || 'other';
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(perm);
                  return acc;
                }, {})
              ).map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {CATEGORY_LABELS[category] || category}
                  </h4>
                  <div className="space-y-1.5">
                    {perms.map((perm) => {
                      const isDefault = perm.useDefaults;
                      const isGranted = perm.granted;
                      const selectedActions = perm.selectedActions;
                      const definedActions = perm.definedActions;
                      return (
                        <div key={perm.name} className={`rounded-lg border p-2.5 transition-colors ${isDefault ? 'bg-neutral-50 dark:bg-neutral-700/30 border-neutral-200 dark:border-neutral-700' : 'bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isGranted}
                                onChange={() => toggleEditorPermission(perm.name)}
                                className="h-3.5 w-3.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className={`text-xs font-medium ${isGranted ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                {perm.display_name}
                              </span>
                            </label>
                            {isGranted && (
                              <button
                                type="button"
                                onClick={() => {
                                  const existing = editorOverrides.find((o) => o.permission_name === perm.name);
                                  if (existing) {
                                    setEditorOverrides((prev) => prev.filter((o) => o.permission_name !== perm.name));
                                  }
                                }}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${isDefault ? 'text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 cursor-default' : 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/30'}`}
                              >
                                {isDefault ? 'Using role defaults' : 'Use role defaults'}
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2 pl-5">
                            {definedActions.map((action) => (
                              <label key={action} className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] cursor-pointer transition-colors border ${isGranted && selectedActions.includes(action) ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-400/40 text-indigo-800 dark:text-indigo-200' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400'}`}>
                                <input
                                  type="checkbox"
                                  checked={isGranted && selectedActions.includes(action)}
                                  onChange={() => toggleEditorAction(perm.name, action)}
                                  className="h-3 w-3 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {action}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-neutral-200 dark:border-neutral-700">
              <Button variant="outline" onClick={closeUserEditor} className="border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600">Cancel</Button>
              <Button onClick={handleSaveUserOverrides} disabled={savingOverrides} className="shadow-sm hover:shadow-md transition-all">
                {savingOverrides ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Save Permissions
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}