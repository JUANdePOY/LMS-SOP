import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, createUser, updateUser, deleteUser, getUserStats } from '@/services/api';
import { getDepartments } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Search, Plus, Edit2, Trash2, Shield, Users, Briefcase, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const ROLE_META = {
  super_admin: { label: 'Super Admin', dot: 'bg-rose-500 dark:bg-rose-400', chip: 'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-100 border-rose-200 dark:border-rose-500/40', icon: Shield },
  admin: { label: 'Admin', dot: 'bg-sky-500 dark:bg-sky-400', chip: 'bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-100 border-sky-200 dark:border-sky-500/40', icon: Shield },
  department_head: { label: 'Department Head', dot: 'bg-violet-500 dark:bg-violet-400', chip: 'bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-100 border-violet-200 dark:border-violet-500/40', icon: Briefcase },
  employee: { label: 'Employee', dot: 'bg-teal-500 dark:bg-teal-400', chip: 'bg-teal-100 text-teal-800 dark:bg-teal-500/25 dark:text-teal-100 border-teal-200 dark:border-teal-500/40', icon: Users },
};

const EMPLOYMENT_STATUSES = ['Regular', 'Probationary', 'Contractual', 'Resigned/Terminated', 'Retired', 'On Leave'];

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

function formatDate(date) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function UsersPanel({ departments: initialDepartments = [], activeTab = 'users' }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState(initialDepartments);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchUsers = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (deptFilter) params.department_id = deptFilter;
      const res = await getUsers(params);
      if (res.data.status === 'success') {
        setUsers(res.data.data.rows);
      }
    } catch (err) {
      toast.error('Failed to load users');
    }
  }, [search, roleFilter, deptFilter, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getUserStats();
      if (res.data.status === 'success') {
        setStats(res.data.data);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await getDepartments({ status: 'active', limit: 100 });
      if (res.data.status === 'success') {
        setDepartments(res.data.data.rows);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab !== 'users') return;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchStats(), fetchDepartments()]);
      setLoading(false);
    };
    load();
  }, [activeTab, fetchUsers, fetchStats, fetchDepartments]);

  const handleAddUser = async () => {
    setSaving(true);
    try {
      const res = await createUser(formData);
      if (res.data.status === 'success') {
        toast.success('User created successfully');
        setShowAddModal(false);
        setFormData({});
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create user';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    setSaving(true);
    try {
      const res = await updateUser(editingUser.id, formData);
      if (res.data.status === 'success') {
        toast.success('User updated successfully');
        setShowEditModal(false);
        setEditingUser(null);
        setFormData({});
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update user';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setSaving(true);
    try {
      const res = await deleteUser(deletingUser.id);
      if (res.data.status === 'success') {
        toast.success('User deactivated successfully');
        setShowDeleteConfirm(false);
        setDeletingUser(null);
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to deactivate user';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setFormData({
      full_name: u.full_name || '',
      email: u.email || '',
      role: u.role || '',
      department_id: u.department_id || '',
      position_title: u.position_title || '',
      employee_id: u.employee_id || '',
      contact_number: u.contact_number || '',
      employment_status: u.employment_status || '',
      date_hired: u.date_hired || '',
      birthdate: u.birthdate || '',
      address: u.address || '',
    });
    setShowEditModal(true);
  };

  const openDelete = (u) => {
    setDeletingUser(u);
    setShowDeleteConfirm(true);
  };

  const filteredUsers = users.filter((u) => {
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (deptFilter && u.department_id !== parseInt(deptFilter)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Users</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage user accounts and assignments</p>
        </div>
        <Button onClick={() => { setFormData({}); setShowAddModal(true); }}>
          <Plus size={16} className="mr-2" />
          Add User
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Users size={20} className="text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total}</p>
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Total Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Users size={20} className="text-emerald-600 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.active}</p>
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Active Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Shield size={20} className="text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.admins}</p>
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Admins</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Briefcase size={20} className="text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.employees}</p>
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Employees</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search users by name, email, or employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full sm:w-48">
          <option value="">All Roles</option>
          {Object.entries(ROLE_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </Select>
        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full sm:w-48">
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-neutral-900/50 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-700">
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-100 w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-100">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Role</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Department</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Date Hired</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                        <Users size={24} className="text-neutral-400 dark:text-neutral-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No users found</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Try adjusting your search or filters</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => {
                  const RoleIcon = ROLE_META[u.role]?.icon || Users;
                  const avatarColor = getAvatarColor(u.full_name || u.email);
                  return (
                    <tr key={u.id} className="group hover:bg-blue-50/70 dark:hover:bg-neutral-700/60 transition-colors duration-150">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor}`}>
                            {getInitials(u.full_name || u.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{u.full_name || '—'}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-300 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${ROLE_META[u.role]?.chip || 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border-transparent dark:border-neutral-600'}`}>
                          <RoleIcon size={12} />
                          {ROLE_META[u.role]?.label || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                        {u.department_name || <span className="text-neutral-400 dark:text-neutral-500">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${u.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300'} border ${u.is_active ? 'border-emerald-200 dark:border-emerald-500/40' : 'border-transparent'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-neutral-400 dark:bg-neutral-500'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        {formatDate(u.date_hired)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 dark:hover:text-indigo-300 transition-colors"
                            title="Edit user"
                          >
                            <Edit2 size={15} />
                          </button>
                          {u.role !== 'super_admin' && (
                            <button
                              onClick={() => openDelete(u)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/15 dark:hover:text-red-300 transition-colors"
                              title="Deactivate user"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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

      {showAddModal && (
        <Modal open={showAddModal} title="Add New User" onClose={() => { setShowAddModal(false); setFormData({}); }}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Full Name <span className="text-red-500">*</span></label>
              <Input value={formData.full_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Enter full name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Email <span className="text-red-500">*</span></label>
              <Input type="email" value={formData.email || ''} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="user@organization.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Password <span className="text-red-500">*</span></label>
              <Input type="password" value={formData.password || ''} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} placeholder="Min 8 characters" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Role <span className="text-red-500">*</span></label>
                <Select value={formData.role || ''} onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}>
                  <option value="">Select role…</option>
                  {Object.entries(ROLE_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Department</label>
                <Select value={formData.department_id || ''} onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}>
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Position Title</label>
                <Input value={formData.position_title || ''} onChange={(e) => setFormData(prev => ({ ...prev, position_title: e.target.value }))} placeholder="e.g. Manager" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Employee ID</label>
                <Input value={formData.employee_id || ''} onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Contact Number</label>
                <Input value={formData.contact_number || ''} onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Employment Status</label>
                <Select value={formData.employment_status || ''} onChange={(e) => setFormData(prev => ({ ...prev, employment_status: e.target.value }))}>
                  <option value="">Select…</option>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Address</label>
              <Input value={formData.address || ''} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowAddModal(false); setFormData({}); }}>Cancel</Button>
              <Button onClick={handleAddUser} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Create User
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showEditModal && editingUser && (
        <Modal open={showEditModal} title="Edit User" onClose={() => { setShowEditModal(false); setEditingUser(null); setFormData({}); }}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Full Name</label>
              <Input value={formData.full_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
              <Input type="email" value={formData.email || ''} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Role</label>
                <Select value={formData.role || ''} onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}>
                  <option value="">Select role…</option>
                  {Object.entries(ROLE_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Department</label>
                <Select value={formData.department_id || ''} onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}>
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Position Title</label>
                <Input value={formData.position_title || ''} onChange={(e) => setFormData(prev => ({ ...prev, position_title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Employee ID</label>
                <Input value={formData.employee_id || ''} onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Contact Number</label>
                <Input value={formData.contact_number || ''} onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Employment Status</label>
                <Select value={formData.employment_status || ''} onChange={(e) => setFormData(prev => ({ ...prev, employment_status: e.target.value }))}>
                  <option value="">Select…</option>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Address</label>
              <Input value={formData.address || ''} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingUser(null); setFormData({}); }}>Cancel</Button>
              <Button onClick={handleEditUser} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteConfirm && deletingUser && (
        <ConfirmDialog
          title="Deactivate User"
          message={`Are you sure you want to deactivate "${deletingUser.full_name || deletingUser.email}"? They will no longer be able to log in.`}
          confirmLabel="Deactivate"
          variant="danger"
          onConfirm={handleDeleteUser}
          onCancel={() => { setShowDeleteConfirm(false); setDeletingUser(null); }}
        />
      )}
    </div>
  );
}
