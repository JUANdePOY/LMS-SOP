import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getDepartmentHierarchy } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Search, Plus, Edit2, Trash2, Building2, ChevronRight, FolderTree, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function DepartmentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deletingDept, setDeletingDept] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await getDepartments({ status: 'all', limit: 100 });
      if (res.data.status === 'success') {
        setDepartments(res.data.data.rows);
      }
    } catch (err) {
      toast.error('Failed to load departments');
    }
  }, [toast]);

  const fetchHierarchy = useCallback(async () => {
    try {
      const res = await getDepartmentHierarchy();
      if (res.data.status === 'success') {
        setHierarchy(res.data.data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchDepartments(), fetchHierarchy()]);
      setLoading(false);
    };
    load();
  }, [fetchDepartments, fetchHierarchy]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await createDepartment(formData);
      if (res.data.status === 'success') {
        toast.success('Department created successfully');
        setShowAddModal(false);
        setFormData({});
        fetchDepartments();
        fetchHierarchy();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create department';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await updateDepartment(editingDept.id, formData);
      if (res.data.status === 'success') {
        toast.success('Department updated successfully');
        setShowEditModal(false);
        setEditingDept(null);
        setFormData({});
        fetchDepartments();
        fetchHierarchy();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update department';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    setSaving(true);
    try {
      const res = await deleteDepartment(deletingDept.id);
      if (res.data.status === 'success') {
        toast.success('Department deleted successfully');
        setShowDeleteConfirm(false);
        setDeletingDept(null);
        fetchDepartments();
        fetchHierarchy();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete department';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (d) => {
    setEditingDept(d);
    setFormData({
      name: d.name || '',
      code: d.code || '',
      description: d.description || '',
      parent_department_id: d.parent_department_id || '',
      head_user_id: d.head_user_id || '',
      status: d.status || 'active',
    });
    setShowEditModal(true);
  };

  const openDelete = (d) => {
    setDeletingDept(d);
    setShowDeleteConfirm(true);
  };

  const filteredDepts = departments.filter((d) => {
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase()) && !d.code?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const renderDepartmentTree = (depts, depth = 0) => {
    return depts.map((dept) => (
      <div key={dept.id} style={{ paddingLeft: `${depth * 24}px` }} className="py-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
          <Building2 size={16} className="text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{dept.name}</p>
            <p className="text-xs text-neutral-500 font-mono">{dept.code} · {dept.user_count || 0} users</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEdit(dept)} title="Edit">
              <Edit2 size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openDelete(dept)} title="Delete" className="text-red-400 hover:text-red-600">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
        {dept.children && dept.children.length > 0 && (
          <div>{renderDepartmentTree(dept.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Departments</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage organizational departments and hierarchy</p>
        </div>
        <Button onClick={() => { setFormData({}); setShowAddModal(true); }}>
          <Plus size={16} className="mr-2" />
          Add Department
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search departments by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-40"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Tree */}
        <Card className="p-4">
          <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <FolderTree size={16} className="text-blue-500" />
            Department Hierarchy
          </h2>
          {hierarchy.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">No departments yet</p>
          ) : (
            <div className="space-y-1">{renderDepartmentTree(hierarchy)}</div>
          )}
        </Card>

        {/* Department List */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">All Departments</h2>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredDepts.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-400 text-sm">
                No departments match your search
              </div>
            ) : (
              filteredDepts.map((d) => (
                <div key={d.id} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{d.name}</p>
                      <p className="text-xs text-neutral-500 font-mono">{d.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${d.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : d.status === 'inactive' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                      {d.status}
                    </span>
                    <span className="text-xs text-neutral-400">{d.user_count || 0} users</span>
                    <div className="flex items-center gap-1 ml-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)} title="Edit">
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDelete(d)} title="Delete" className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <Modal
          title="Add New Department"
          onClose={() => { setShowAddModal(false); setFormData({}); }}
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Name <span className="text-red-500">*</span></label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Operations"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Code <span className="text-red-500">*</span></label>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. OPS"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Parent Department</label>
                <Select
                  value={formData.parent_department_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_department_id: e.target.value }))}
                >
                  <option value="">None (Top-level)</option>
                  {departments.filter(d => !d.parent_department_id).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Status</label>
                <Select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowAddModal(false); setFormData({}); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Create Department
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Department Modal */}
      {showEditModal && editingDept && (
        <Modal
          title="Edit Department"
          onClose={() => { setShowEditModal(false); setEditingDept(null); setFormData({}); }}
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Name</label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Code</label>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Parent Department</label>
                <Select
                  value={formData.parent_department_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_department_id: e.target.value }))}
                >
                  <option value="">None (Top-level)</option>
                  {departments.filter(d => d.id !== editingDept.id && !d.parent_department_id).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Status</label>
                <Select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingDept(null); setFormData({}); }}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && deletingDept && (
        <ConfirmDialog
          title="Delete Department"
          message={`Are you sure you want to delete "${deletingDept.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteConfirm(false); setDeletingDept(null); }}
        />
      )}
    </div>
  );
}