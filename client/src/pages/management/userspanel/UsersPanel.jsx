import { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getUserStats, getBusinesses, getDepartments } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Card } from '@/shared/components/ui/card';
import { Modal } from '@/shared/components/ui/modal';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Search, Plus, Edit2, Trash2, Shield, Users, Briefcase, Loader2, Upload, Download, ChevronUp, ChevronDown, ChevronsUpDown, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/shared/components/ui/Toast';
import BulkUploadModal from './BulkUploadModal';
import { cn } from '@/lib/utils';
import { resolveFileUrl } from '@/lib/fileUrl';
import { StaggerList, MotionItem } from "@/shared/motion";

const ROLE_META = {
  super_admin: { label: 'Super Admin', dot: 'bg-rose-500 dark:bg-rose-400', chip: 'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-100 border-rose-200 dark:border-rose-500/40', icon: Shield },
  admin: { label: 'Admin', dot: 'bg-sky-500 dark:bg-sky-400', chip: 'bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-100 border-sky-200 dark:border-sky-500/40', icon: Shield },
  department_head: { label: 'Department Head', dot: 'bg-violet-500 dark:bg-violet-400', chip: 'bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-100 border-violet-200 dark:border-violet-500/40', icon: Briefcase },
  employee: { label: 'Employee', dot: 'bg-teal-500 dark:bg-teal-400', chip: 'bg-teal-100 text-teal-800 dark:bg-teal-500/25 dark:text-teal-100 border-teal-200 dark:border-teal-500/40', icon: Users },
};

const EMPLOYMENT_STATUSES = ['Regular', 'Probationary', 'Contractual', 'Resigned/Terminated', 'Retired', 'On Leave'];

// Only these roles are tied to a department (SOP). Admins and super admins are
// business-level — they must not be assigned to any department, so the
// Department field is hidden for them and any stale department_id is cleared.
const DEPARTMENT_SCOPED_ROLES = ['department_head', 'employee'];

// Roles an actor is allowed to assign when creating/editing users. Admins and
// department heads can only create department-scoped users — they can never
// create another admin or super_admin account.
function allowedRolesForActor(user) {
  if (!user) return ['department_head', 'employee', 'admin', 'super_admin'];
  if (user.role === 'super_admin') return ['department_head', 'employee', 'admin', 'super_admin'];
  if (user.role === 'admin') return ['department_head', 'employee'];
  if (user.role === 'department_head') return ['employee'];
  return [];
}

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
  const { isAuthenticated, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState(initialDepartments);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [businessFilter, setBusinessFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('full_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [modalDepartments, setModalDepartments] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (formData.business_id) {
      const filtered = departments.filter((d) => String(d.business_id) === String(formData.business_id));
      setModalDepartments(filtered);
      if (formData.department_id && !filtered.some((d) => String(d.id) === String(formData.department_id))) {
        setFormData((prev) => ({ ...prev, department_id: '' }));
      }
    } else {
      setModalDepartments(departments);
    }
  }, [formData.business_id, departments, formData.department_id]);

  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (deptFilter) params.department_id = deptFilter;
      if (businessFilter) params.business_id = businessFilter;
      const res = await getUsers(params);
      if (res.data?.status === 'success') {
        setUsers(res.data.data?.rows || []);
      }
    } catch {
      toast.error('Failed to load users');
    }
  }, [search, roleFilter, deptFilter, businessFilter, toast, isAuthenticated]);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getUserStats();
      if (res.data?.status === 'success') {
        setStats(res.data.data);
      }
    } catch { /* ignore */ }
  }, [isAuthenticated]);

  const fetchDepartments = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getDepartments({ status: 'active', limit: 100 });
      if (res.data?.status === 'success') {
        setDepartments(res.data.data?.rows || []);
      }
    } catch { /* ignore */ }
  }, [isAuthenticated]);

  const fetchBusinesses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getBusinesses({ status: 'active', limit: 100 });
      if (res.data?.status === 'success') {
        setBusinesses(res.data.data?.rows || []);
      }
    } catch { /* ignore */ }
  }, [isAuthenticated]);

  const handleAddUser = async () => {
    setSaving(true);
    try {
      const res = await createUser(cleanPayload(formData));
      if (res.data.status === 'success') {
        toast.success('User created successfully');
        setShowAddModal(false);
        setFormData({});
        fetchUsers();
        fetchStats();
      }
    } catch {
      const message = 'Failed to create user';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const cleanPayload = (data) => {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === '' || v === null || v === undefined) continue;
      out[k] = v;
    }
    return out;
  };

  const handleEditUser = async () => {
    setSaving(true);
    try {
      const res = await updateUser(editingUser.id, cleanPayload(formData));
      if (res.data.status === 'success') {
        toast.success('User updated successfully');
        setShowEditModal(false);
        setEditingUser(null);
        setFormData({});
        fetchUsers();
        fetchStats();
      }
    } catch {
      const message = 'Failed to update user';
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
      if (res.data?.status === 'success') {
        toast.success('User deactivated successfully');
        setShowDeleteConfirm(false);
        setDeletingUser(null);
        fetchUsers();
        fetchStats();
      } else {
        toast.error(res.data?.message || 'Failed to deactivate user');
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to deactivate user';
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
      // Admins / super admins are business-level and must not be assigned to a
      // department — never carry a department_id for them, even if the record
      // has a stale value.
      department_id: DEPARTMENT_SCOPED_ROLES.includes(u.role) ? (u.department_id || '') : '',
      // Super admins are not tied to any business (SOP) — clear any business_id
      // so the account stays business-less.
      business_id: u.role === 'super_admin' ? '' : (u.business_id || ''),
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

  // When a department head adds a user, default the new user's business and
  // department to the head's own scope — they can only create users in the
  // departments they own anyway, so this just removes the friction.
  const openAddModal = () => {
    const seed = {};
    if (deptHeadScope) {
      seed.business_id = deptHeadScope.businessId || '';
      seed.department_id = deptHeadScope.departmentIds[0] || '';
    }
    setFormData(seed);
    setShowAddModal(true);
  };

  // Whether the current actor can manage (create/edit/delete) a given user.

  // Whether the current actor can manage (create/edit/delete) a given user.
  // Super admins have full control; admins are scoped to their own business;
  // department heads are scoped to their own department(s). Admin and
  // department_head actors cannot manage other admin or super_admin accounts.
  const canManageUser = (u) => {
    if (user?.role === 'super_admin') return true;
    if (!user) return false;
    if (u.role === 'super_admin') return false;
    if (u.role === 'admin') return user.role === 'super_admin';
    if (user.role === 'department_head') {
      const actorDeptIds = user?.scoped_department_ids?.length
        ? user.scoped_department_ids
        : (user.department_id ? [user.department_id] : []);
      return actorDeptIds.length > 0 && actorDeptIds.includes(u.department_id);
    }
    if (user.role === 'admin') {
      return String(u.business_id) === String(user.business_id);
    }
return false;
  };

  // Department Head scope — the business + department(s) they own. Used to
  // restrict the Business/Department pickers when a department head creates
  // or edits a user.
  const deptHeadScope = (() => {
    if (user?.role !== 'department_head') return null;
    const deptIds = user?.scoped_department_ids?.length
      ? user.scoped_department_ids
      : (user.department_id ? [user.department_id] : []);
    return {
      businessId: user?.business_id || null,
      departmentIds: deptIds,
    };
  })();

  const filteredUsers = users.filter((u) => {
    if (u.is_active === false) return false;
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (deptFilter && u.department_id !== parseInt(deptFilter)) return false;
    if (businessFilter && u.business_id !== parseInt(businessFilter)) return false;
    return true;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = sortedUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startIdx = sortedUsers.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, sortedUsers.length);

  const handleExport = () => {
    const headers = ['Full Name', 'Email', 'Role', 'Department', 'Business', 'Position', 'Employee ID', 'Contact', 'Status', 'Date Hired'];
    const rows = filteredUsers.map(u => [
      u.full_name || '',
      u.email || '',
      u.role || '',
      u.department_name || '',
      u.business_name || '',
      u.position_title || '',
      u.employee_id || '',
      u.contact_number || '',
      u.employment_status || '',
      u.date_hired || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Users exported to CSV');
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown size={14} className="text-neutral-400" />;
    if (sortDirection === 'asc') return <ChevronUp size={14} className="text-neutral-700 dark:text-neutral-200" />;
    return <ChevronDown size={14} className="text-neutral-700 dark:text-neutral-200" />;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (activeTab !== 'users') return;
    const load = async () => {
      setLoading(true);
      setCurrentPage(1);
      await Promise.all([fetchUsers(), fetchStats(), fetchDepartments(), fetchBusinesses()]);
      setLoading(false);
    };
    load();
  }, [activeTab, fetchUsers, fetchStats, fetchDepartments, fetchBusinesses, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 p-5 sm:p-6 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Users</h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Manage user accounts, roles, and assignments</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkUploadModal(true)}
              className="border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-500/60 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
            >
              <Upload size={16} className="mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={openAddModal} className="shadow-sm hover:shadow-md transition-all">
              <Plus size={16} className="mr-2" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {stats && (
        <StaggerList className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <MotionItem>
            <Card className="group relative overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/40 transition-all duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-transparent dark:from-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="relative flex items-center gap-2 sm:gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center ring-1 ring-blue-200/60 dark:ring-blue-500/30">
                  <Users size={18} className="text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{stats.total}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300">Total Users</p>
                </div>
              </div>
            </Card>
          </MotionItem>
          <MotionItem>
            <Card className="group relative overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-500/40 transition-all duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="relative flex items-center gap-2 sm:gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center ring-1 ring-emerald-200/60 dark:ring-emerald-500/30">
                  <Users size={18} className="text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{stats.active}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300">Active Users</p>
                </div>
              </div>
            </Card>
          </MotionItem>
          <MotionItem>
            <Card className="group relative overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-500/40 transition-all duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 to-transparent dark:from-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="relative flex items-center gap-2 sm:gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center ring-1 ring-purple-200/60 dark:ring-purple-500/30">
                  <Shield size={18} className="text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{stats.admins}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300">Admins</p>
                </div>
              </div>
            </Card>
          </MotionItem>
          <MotionItem>
            <Card className="group relative overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-amber-200 dark:hover:border-amber-500/40 transition-all duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="relative flex items-center gap-2 sm:gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center ring-1 ring-amber-200/60 dark:ring-amber-500/30">
                  <Briefcase size={18} className="text-amber-600 dark:text-amber-300" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{stats.employees}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300">Employees</p>
                </div>
              </div>
            </Card>
          </MotionItem>
        </StaggerList>
      )}

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search users by name, email, or employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 sm:pl-10 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full sm:w-auto border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400">
            <option value="">All Roles</option>
            {Object.entries(ROLE_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </Select>
          <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full sm:w-auto border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400">
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Select value={businessFilter} onChange={(e) => setBusinessFilter(e.target.value)} className="w-full sm:w-auto border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400">
            <option value="">All Businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.business_name}</option>
            ))}
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={filteredUsers.length === 0} className="border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-500/60 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-neutral-50 to-neutral-100/80 dark:from-neutral-800 dark:to-neutral-700/80">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <button onClick={() => handleSort('full_name')} className="flex items-center gap-1.5 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    Full Name <SortIcon field="full_name" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <button onClick={() => handleSort('email')} className="flex items-center gap-1.5 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    Email Address <SortIcon field="email" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <button onClick={() => handleSort('role')} className="flex items-center gap-1.5 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    Role <SortIcon field="role" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <button onClick={() => handleSort('department_name')} className="flex items-center gap-1.5 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    Department <SortIcon field="department_name" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <button onClick={() => handleSort('business_name')} className="flex items-center gap-1.5 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    Business <SortIcon field="business_name" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <button onClick={() => handleSort('employment_status')} className="flex items-center gap-1.5 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    Status <SortIcon field="employment_status" />
                  </button>
                </th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/80">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                        <Users size={28} className="text-neutral-400 dark:text-neutral-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No users found</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Try adjusting your search or filters</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const avatarColor = getAvatarColor(u.full_name || u.email);
                  return (
                    <tr key={u.id} onClick={() => setDetailUser(u)} className={`group cursor-pointer transition-all duration-150 hover:bg-blue-50/70 dark:hover:bg-neutral-700/60 ${idx % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50/40 dark:bg-neutral-800/60'}`}>
                      <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img
                          src={resolveFileUrl(u.avatar_url)}
                          alt={u.full_name || u.email || 'User'}
                          className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-neutral-700 shadow-sm"
                        />
                      ) : (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor} ring-2 ring-white dark:ring-neutral-700 shadow-sm`}>
                          {getInitials(u.full_name || u.email)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{u.full_name || '—'}</p>
                      </div>
                    </div>
                  </td>
                      <td className="px-3 py-3 text-sm text-neutral-700 dark:text-neutral-200 truncate max-w-[220px]">
                        {u.email || '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
                        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border", ROLE_META[u.role]?.chip || 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:border-neutral-700')}>
                          {ROLE_META[u.role]?.label || u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-neutral-700 dark:text-neutral-200">
                        {u.department_name || <span className="text-neutral-400 dark:text-neutral-500">—</span>}
                      </td>
                      <td className="px-3 py-3 text-sm text-neutral-700 dark:text-neutral-200">
                        {u.business_name || <span className="text-neutral-400 dark:text-neutral-500">—</span>}
                      </td>
                      <td className="px-3 py-3 text-sm text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
                        {u.employment_status ? (
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", u.employment_status === 'Regular' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300")}>
                            {u.employment_status}
                          </span>
                        ) : <span className="text-neutral-400 dark:text-neutral-500">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canManageUser(u) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(u); }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 transition-all"
                              title="Edit user"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {canManageUser(u) && u.role !== 'super_admin' && u.role !== 'admin' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openDelete(u); }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/15 dark:hover:text-red-300 transition-all"
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

      {filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Showing {startIdx}–{endIdx} of {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="w-20 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-500/60 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                Previous
              </Button>
              <span className="text-xs text-neutral-600 dark:text-neutral-300 min-w-[3rem] text-center font-medium">
                {safePage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-500/60 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <Modal open={showAddModal} title="Add New User" onClose={() => { setShowAddModal(false); setFormData({}); }}>
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <Input value={formData.full_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Enter full name" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Email <span className="text-red-500">*</span></label>
                <Input type="email" value={formData.email || ''} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="user@organization.com" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
            </div>
             <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Min 8 characters"
                    className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
</div>
              </div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
               <div>
                   <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Role <span className="text-red-500">*</span></label>
                   <Select value={formData.role || ''} onChange={(e) => {
                     const nextRole = e.target.value;
setFormData((prev) => {
                        const next = { ...prev, role: nextRole };
                        // Admins / super admins are business-level and must not be
                        // assigned to any department — drop any stale department_id.
                        if (!DEPARTMENT_SCOPED_ROLES.includes(nextRole)) {
                          next.department_id = '';
                        }
                        return next;
                      });
                   }} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                     <option value="">Select role…</option>
{Object.entries(ROLE_META).map(([key, meta]) => {
                        if (!allowedRolesForActor(user).includes(key)) return null;
                        return <option key={key} value={key}>{meta.label}</option>;
                      })}
                    </Select>
                  </div>
               </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Business</label>
                    <Select value={deptHeadScope ? (deptHeadScope.businessId || '') : (formData.business_id || '')} disabled={!!deptHeadScope || formData.role === 'super_admin'} onChange={(e) => setFormData(prev => ({ ...prev, business_id: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                      <option value="">Select business…</option>
                      {businesses.map((b) => (
                        (!deptHeadScope || String(b.id) === String(deptHeadScope.businessId)) && (
                          <option key={b.id} value={b.id}>{b.business_name}</option>
                        )
                      ))}
                    </Select>
                  </div>
                  {DEPARTMENT_SCOPED_ROLES.includes(formData.role) && (
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Department</label>
                      <Select value={formData.department_id || ''} onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))} disabled={!formData.business_id || !!deptHeadScope} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                        <option value="">Select department…</option>
                        {modalDepartments.filter((d) => !deptHeadScope || deptHeadScope.departmentIds.includes(d.id)).map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
               <div>
                 <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Position Title</label>
                 <Input value={formData.position_title || ''} onChange={(e) => setFormData(prev => ({ ...prev, position_title: e.target.value }))} placeholder="e.g. Manager" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
               </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Employee ID</label>
                <Input value={formData.employee_id || ''} onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))} placeholder="Optional" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Contact Number</label>
                <Input value={formData.contact_number || ''} onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))} placeholder="Optional" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Employment Status</label>
                <Select value={formData.employment_status || ''} onChange={(e) => setFormData(prev => ({ ...prev, employment_status: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                  <option value="">Select…</option>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Date Hired</label>
                <Input type="date" value={formData.date_hired || ''} onChange={(e) => setFormData(prev => ({ ...prev, date_hired: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Birthdate</label>
                <Input type="date" value={formData.birthdate || ''} onChange={(e) => setFormData(prev => ({ ...prev, birthdate: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Address</label>
              <Input value={formData.address || ''} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Optional" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setShowAddModal(false); setFormData({}); }} className="border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600">Cancel</Button>
              <Button onClick={handleAddUser} disabled={saving} className="shadow-sm hover:shadow-md transition-all">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Create User
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showEditModal && editingUser && (
        <Modal open={showEditModal} title="Edit User" onClose={() => { setShowEditModal(false); setEditingUser(null); setFormData({}); }}>
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Full Name</label>
                <Input value={formData.full_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Email</label>
                <Input type="email" value={formData.email || ''} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
            </div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Role</label>
                  <Select value={formData.role || ''} onChange={(e) => {
                    const nextRole = e.target.value;
                    setFormData((prev) => {
                      const next = { ...prev, role: nextRole };
                      // Admins / super admins are business-level and must not be
                      // assigned to any department — drop any stale department_id.
                      if (!DEPARTMENT_SCOPED_ROLES.includes(nextRole)) {
                        next.department_id = '';
                      }
                      return next;
                    });
                  }} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                    <option value="">Select role…</option>
{Object.entries(ROLE_META).map(([key, meta]) => {
                        if (!allowedRolesForActor(user).includes(key)) return null;
                        return <option key={key} value={key}>{meta.label}</option>;
                      })}
                  </Select>
                </div>
<div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Business</label>
                    <Select value={deptHeadScope ? (deptHeadScope.businessId || '') : (formData.business_id || '')} disabled={!!deptHeadScope || (formData.role || editingUser?.role) === 'super_admin'} onChange={(e) => setFormData(prev => ({ ...prev, business_id: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                      <option value="">Select business…</option>
                      {businesses.map((b) => (
                        (!deptHeadScope || String(b.id) === String(deptHeadScope.businessId)) && (
                          <option key={b.id} value={b.id}>{b.business_name}</option>
                        )
                      ))}
                    </Select>
                  </div>
                {DEPARTMENT_SCOPED_ROLES.includes(formData.role || editingUser?.role) && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Department</label>
                    <Select value={formData.department_id || ''} onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))} disabled={!formData.business_id || !!deptHeadScope} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                      <option value="">Select department…</option>
                      {modalDepartments.filter((d) => !deptHeadScope || deptHeadScope.departmentIds.includes(d.id)).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
               <div>
                 <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Position Title</label>
                <Input value={formData.position_title || ''} onChange={(e) => setFormData(prev => ({ ...prev, position_title: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Employee ID</label>
                <Input value={formData.employee_id || ''} onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Contact Number</label>
                <Input value={formData.contact_number || ''} onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Employment Status</label>
                <Select value={formData.employment_status || ''} onChange={(e) => setFormData(prev => ({ ...prev, employment_status: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                  <option value="">Select…</option>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Address</label>
              <Input value={formData.address || ''} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingUser(null); setFormData({}); }} className="border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600">Cancel</Button>
              <Button onClick={handleEditUser} disabled={saving} className="shadow-sm hover:shadow-md transition-all">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteConfirm && deletingUser && (
        <ConfirmDialog
          open={showDeleteConfirm}
          title="Deactivate User"
          message={`Are you sure you want to deactivate "${deletingUser.full_name || deletingUser.email}"? They will no longer be able to log in.`}
          confirmLabel="Deactivate"
          variant="danger"
          destructive
          loading={saving}
          onConfirm={handleDeleteUser}
          onCancel={() => { setShowDeleteConfirm(false); setDeletingUser(null); }}
        />
      )}

      {detailUser && (
        <Modal open={!!detailUser} title="User Details" onClose={() => setDetailUser(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {detailUser.avatar_url ? (
                <img
                  src={resolveFileUrl(detailUser.avatar_url)}
                  alt={detailUser.full_name || detailUser.email || 'User'}
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-neutral-700 shadow-sm"
                />
              ) : (
                <div className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold ${getAvatarColor(detailUser.full_name || detailUser.email)} ring-2 ring-white dark:ring-neutral-700 shadow-sm`}>
                  {getInitials(detailUser.full_name || detailUser.email)}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{detailUser.full_name || '—'}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{detailUser.email || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Role</span>
                <p className="mt-0.5">
                  <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border", ROLE_META[detailUser.role]?.chip || 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:border-neutral-700')}>
                    {ROLE_META[detailUser.role]?.label || detailUser.role}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Employee ID</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{detailUser.employee_id || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Department</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{detailUser.department_name || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Business</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{detailUser.business_name || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Position/Job Title</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{detailUser.position_title || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Contact Number</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{detailUser.contact_number || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Employment Status</span>
                <p className="mt-0.5">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", detailUser.employment_status === 'Regular' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300")}>
                    {detailUser.employment_status || '—'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Date Hired</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{formatDate(detailUser.date_hired)}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Birthdate</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{formatDate(detailUser.birthdate)}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Address</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{detailUser.address || '—'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDetailUser(null)} className="border-neutral-200 dark:border-neutral-700">Close</Button>
              <Button onClick={() => { setDetailUser(null); openEdit(detailUser); }} className="shadow-sm">
                Edit User
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={() => {
          fetchUsers();
          fetchStats();
        }}
      />
    </div>
  );
}
