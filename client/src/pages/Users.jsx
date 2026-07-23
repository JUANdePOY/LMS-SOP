import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, createUser, updateUser, deleteUser, getUserStats } from '@/services/api';
import { getDepartments } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Search, Plus, Edit2, Trash2, Shield, Users, Building2, Mail, Phone, Briefcase, Calendar, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const ROLE_META = {
  super_admin: { label: 'Super Admin', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: Shield },
  admin: { label: 'Admin', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Shield },
  department_head: { label: 'Department Head', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: Briefcase },
  employee: { label: 'Employee', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Users },
};

const EMPLOYMENT_STATUSES = ['Regular', 'Probationary', 'Contractual', 'Resigned/Terminated', 'Retired', 'On Leave'];

export default function UsersPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [saving, setSaving] = useState(false);
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
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchStats(), fetchDepartments()]);
      setLoading(false);
    };
    load();
  }, [fetchUsers, fetchStats, fetchDepartments]);

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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Users & Departments</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage user accounts and department assignments</p>
        </div>
        <Button onClick={() => { setFormData({}); setShowAddModal(true); }}>
          <Plus size={16} className="mr-2" />
          Add User
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total}</p>
                <p className="text-xs text-neutral-500">Total Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.active}</p>
                <p className="text-xs text-neutral-500">Active Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Shield size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.admins}</p>
                <p className="text-xs text-neutral-500">Admins</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Briefcase size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.employees}</p>
                <p className="text-xs text-neutral-500">Employees</p>
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
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          <option value="">All Roles</option>
          {Object.entries(ROLE_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </Select>
        <Select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-neutral-400">
                  No users found matching your criteria
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const RoleIcon = ROLE_META[u.role]?.icon || Users;
                return (
                  <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{u.full_name || '—'}</p>
                          <p className="text-xs text-neutral-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_META[u.role]?.bg || ''} ${ROLE_META[u.role]?.color || ''}`}>
                        <RoleIcon size={12} />
                        {ROLE_META[u.role]?.label || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                      {u.department_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                          title="Edit user"
                        >
                          <Edit2 size={14} />
                        </button>
                        {u.role !== 'super_admin' && (
                          <button
                            onClick={() => openDelete(u)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Deactivate user"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>

      {/* Add User Modal */}
      {showAddModal && (
        <Modal
          title="Add New User"
          onClose={() => { setShowAddModal(false); setFormData({}); }}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Full Name <span className="text-red-500">*</span></label>
              <Input
                value={formData.full_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Email <span className="text-red-500">*</span></label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@organization.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Password <span className="text-red-500">*</span></label>
              <Input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Role <span className="text-red-500">*</span></label>
                <Select
                  value={formData.role || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="">Select role…</option>
                  {Object.entries(ROLE_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Department</label>
                <Select
                  value={formData.department_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                >
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
                <Input
                  value={formData.position_title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, position_title: e.target.value }))}
                  placeholder="e.g. Manager"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Employee ID</label>
                <Input
                  value={formData.employee_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Contact Number</label>
                <Input
                  value={formData.contact_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Employment Status</label>
                <Select
                  value={formData.employment_status || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, employment_status: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Address</label>
              <Input
                value={formData.address || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Optional"
              />
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

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <Modal
          title="Edit User"
          onClose={() => { setShowEditModal(false); setEditingUser(null); setFormData({}); }}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Full Name</label>
              <Input
                value={formData.full_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Role</label>
                <Select
                  value={formData.role || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="">Select role…</option>
                  {Object.entries(ROLE_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Department</label>
                <Select
                  value={formData.department_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                >
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
                <Input
                  value={formData.position_title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, position_title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Employee ID</label>
                <Input
                  value={formData.employee_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Contact Number</label>
                <Input
                  value={formData.contact_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Employment Status</label>
                <Select
                  value={formData.employment_status || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, employment_status: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Address</label>
              <Input
                value={formData.address || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
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

      {/* Delete Confirmation */}
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