import { useState, useEffect, useCallback } from 'react';
import { getRoles, createRole, updateRole, deleteRole, getPermissions, updateRolePermissions } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Search, Plus, Edit2, Trash2, Shield, Users, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

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
  const [formData, setFormData] = useState({});
  const [selectedPermissions, setSelectedPermissions] = useState({});

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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Roles & Permissions</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage roles and assign permissions</p>
        </div>
        <Button onClick={() => { setFormData({}); setShowAddModal(true); }}>
          <Plus size={16} className="mr-2" />
          Add Role
        </Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="Search roles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {filteredRoles.length === 0 ? (
            <div className="px-4 py-12 text-center text-neutral-400 text-sm">No roles found</div>
          ) : (
            filteredRoles.map((role) => {
              const isExpanded = !!expandedRoles[role.name];
              const currentPerms = getCurrentPermissions(role.name);

              return (
                <div key={role.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleRoleExpand(role.name)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shrink-0"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                        <Shield size={20} className="text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{role.display_name}</p>
                        <p className="text-xs text-neutral-500 font-mono truncate">{role.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${role.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">{role.permission_count || 0} perms</span>
                      <button
                        onClick={() => toggleRoleExpand(role.name)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors"
                        title="Manage permissions"
                      >
                        <Users size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(role)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors"
                        title="Edit role"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => openDelete(role)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"
                        title="Delete role"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 ml-8 border-t border-neutral-100 dark:border-neutral-700 pt-4">
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
                      <div className="mt-4 flex justify-end">
                        <Button onClick={() => handleSavePermissions(role.name)} disabled={saving}>
                          {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                          Save Permissions
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {showAddModal && (
        <Modal open={showAddModal} title="Add New Role" onClose={() => { setShowAddModal(false); setFormData({}); }}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Role Name <span className="text-red-500">*</span></label>
              <Input value={formData.name || ''} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. manager" />
              <p className="text-[10px] text-neutral-400 mt-1">Use lowercase with underscores (e.g. department_head)</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Display Name <span className="text-red-500">*</span></label>
              <Input value={formData.display_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))} placeholder="e.g. Manager" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowAddModal(false); setFormData({}); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Create Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showEditModal && editingRole && (
        <Modal open={showEditModal} title="Edit Role" onClose={() => { setShowEditModal(false); setEditingRole(null); setFormData({}); }}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Display Name</label>
              <Input value={formData.display_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingRole(null); setFormData({}); }}>Cancel</Button>
              <Button onClick={handleEdit} disabled={saving}>
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
    </div>
  );
}
