import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getRoles, getRole, createRole, updateRole, deleteRole, getPermissions,
  getUsers, updateUser, getUserPermissions, updateUserPermissions,
  getUserEntityOverrides, updateUserEntityOverrides, getEntities,
  updateRolePermissions,
} from '@/services/api';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import Drawer from '@/shared/components/ui/Drawer';
import { useToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, User as UserIcon } from 'lucide-react';
import { RoleForm } from './RoleForm';
import { PermissionsDrawer } from './PermissionsDrawer';
import { RolesTable } from './RolesTable';
import {
  computeRolePermState,
  computeUserPermState,
  computeUserOverridesToSave,
  computeEntityOverridesToSave,
  initEntityStates,
  toggleUserAction,
  hasRestrictablePermission,
  isActivePermission,
  ENTITY_TYPES,
  getDefinedActions,
  parseActions,
} from './rolesPermissionHelpers';

export default function RolesPanel({ activeTab = 'roles' }) {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({});

  const [drawerMode, setDrawerMode] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [editRole, setEditRole] = useState(null);
  const [editRolePermActions, setEditRolePermActions] = useState({});
  const [editRoleUsers, setEditRoleUsers] = useState([]);

  const [editUser, setEditUser] = useState(null);
  const [editUserRolePerms, setEditUserRolePerms] = useState([]);
  const [editUserOverrides, setEditUserOverrides] = useState([]);
  const [editUserNewRoleName, setEditUserNewRoleName] = useState('');
  const [editUserOriginalRole, setEditUserOriginalRole] = useState('');

  const [entityStates, setEntityStates] = useState({});
  const [entityDataLoaded, setEntityDataLoaded] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await getRoles();
      if (res.data.status === 'success') setRoles(res.data.data);
    } catch { toast.error('Failed to load roles'); }
  }, [toast]);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await getPermissions();
      if (res.data.status === 'success') setPermissions(res.data.data);
    } catch { toast.error('Failed to load permissions'); }
  }, [toast]);

  useEffect(() => {
    if (activeTab !== 'roles' || !isSuperAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRoles(), fetchPermissions()]);
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab, fetchRoles, fetchPermissions, isSuperAdmin]);

  /* ---------- drawer: mode transitions ---------- */

  const openRoleEditor = useCallback(async (role) => {
    setDrawerMode('editRole');
    setDrawerLoading(true);
    try {
      const [roleRes, usersRes] = await Promise.all([
        getRole(role.id),
        getUsers({ role: role.name }),
      ]);
      const roleData = roleRes.data?.data;
      setEditRole(roleData);
      const permActions = {};
      (roleData?.permissions || []).forEach(p => {
        const actions = p.role_actions ? parseActions(p.role_actions) : getDefinedActions(p);
        permActions[p.name] = new Set(actions);
      });
      setEditRolePermActions(permActions);
      setEditRoleUsers(usersRes.data?.data?.rows || []);
    } catch {
      toast.error('Failed to load role details');
    } finally {
      setDrawerLoading(false);
    }
  }, [toast]);

  const openUserEditor = useCallback(async (user) => {
    setDrawerMode('editUser');
    setDrawerLoading(true);
    setEntityDataLoaded(false);
    try {
      const [permRes, entityRes] = await Promise.all([
        getUserPermissions(user.id),
        getUserEntityOverrides(user.id),
      ]);
      const overrides = (permRes.data?.data?.overrides || []).filter(o => isActivePermission(o.permission_name));
      const entityOverrides = (entityRes.data?.data?.overrides || []).filter(o => isActivePermission(o.permission_name));
      setEditUser(user);
      setEditUserRolePerms((editRole?.permissions || []).filter(p => isActivePermission(p.name)));
      setEditUserOverrides(overrides);
      setEditUserNewRoleName(user.role || editRole?.name || '');
      setEditUserOriginalRole(user.role || editRole?.name || '');
      setEntityStates(initEntityStates(entityOverrides));
    } catch {
      toast.error('Failed to load user data');
    } finally {
      setDrawerLoading(false);
    }
  }, [editRole, toast]);

  const enterAccessRestrictions = useCallback(async () => {
    setDrawerMode('accessRestrictions');
    if (entityDataLoaded) return;
    setDrawerLoading(true);
    try {
      const newStates = { ...entityStates };
      await Promise.all(ENTITY_TYPES.map(async (entityType) => {
        const res = await getEntities(entityType);
        newStates[entityType] = {
          ...newStates[entityType],
          entities: res.data?.data || [],
          loaded: true,
        };
      }));
      setEntityStates(newStates);
      setEntityDataLoaded(true);
    } catch {
      toast.error('Failed to load entity data');
    } finally {
      setDrawerLoading(false);
    }
  }, [entityStates, entityDataLoaded, toast]);

  const closeDrawer = useCallback(() => {
    setDrawerMode(null);
    setEditRole(null);
    setEditRolePermActions({});
    setEditRoleUsers([]);
    setEditUser(null);
    setEditUserRolePerms([]);
    setEditUserOverrides([]);
    setEditUserNewRoleName('');
    setEditUserOriginalRole('');
    setEntityStates({});
    setEntityDataLoaded(false);
  }, []);

  /* ---------- toggle handlers ---------- */

  const handleRoleActionToggle = useCallback((perm, action) => {
    setEditRolePermActions(prev => {
      const current = prev[perm.name] || new Set();
      const next = new Set(current);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      const result = { ...prev };
      if (next.size === 0) {
        delete result[perm.name];
      } else {
        result[perm.name] = next;
      }
      return result;
    });
  }, []);

  const handleUserActionToggle = useCallback((perm, action) => {
    const roleHasPermission = editUserRolePerms.some(p => p.name === perm.name);
    setEditUserOverrides(prev =>
      toggleUserAction(prev, perm.name, action, perm.definedActions, roleHasPermission)
    );
  }, [editUserRolePerms]);

  const handleScopeToggle = useCallback((entityType) => {
    setEntityStates(prev => {
      const state = prev[entityType];
      if (!state) return prev;
      const nextScope = state.scope === 'selected' ? 'denied' : 'selected';
      return {
        ...prev,
        [entityType]: {
          ...state,
          scope: nextScope,
          selectedIds: nextScope === 'selected' ? state.selectedIds : new Set(),
        },
      };
    });
  }, []);

  const handleRecordToggle = useCallback((entityType, entityId) => {
    setEntityStates(prev => {
      const state = prev[entityType];
      const newIds = new Set(state.selectedIds);
      if (newIds.has(entityId)) newIds.delete(entityId);
      else newIds.add(entityId);
      return { ...prev, [entityType]: { ...state, selectedIds: newIds } };
    });
  }, []);

  const handleEntitySearch = useCallback((entityType, query) => {
    setEntityStates(prev => ({
      ...prev,
      [entityType]: { ...prev[entityType], search: query },
    }));
  }, []);

  /* ---------- computed values ---------- */

  const rolePermStates = useMemo(
    () => computeRolePermState(permissions, editRolePermActions),
    [permissions, editRolePermActions]
  );

  const userPermStates = useMemo(
    () => computeUserPermState(editUserRolePerms, editUserOverrides),
    [editUserRolePerms, editUserOverrides]
  );

  const visibleEntityTypes = useMemo(
    () => ENTITY_TYPES.filter(type => hasRestrictablePermission(userPermStates, type)),
    [userPermStates]
  );

  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const s = search.toLowerCase();
    return roles.filter(r =>
      r.display_name?.toLowerCase().includes(s) || r.name?.toLowerCase().includes(s)
    );
  }, [roles, search]);

  /* ---------- save handlers ---------- */

  const handleSaveRole = async () => {
    if (!editRole) return;
    setSaving(true);
    try {
      const permissions = Object.entries(editRolePermActions).map(([name, actions]) => ({
        name,
        actions: Array.from(actions),
      }));
      await updateRolePermissions(editRole.name, permissions);
      toast.success('Role permissions updated');
      closeDrawer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role permissions');
    } finally { setSaving(false); }
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      if (editUserNewRoleName && editUserNewRoleName !== editUserOriginalRole) {
        await updateUser(editUser.id, { role: editUserNewRoleName });
        toast.success('User role updated');
      }
      await updateUserPermissions(editUser.id, computeUserOverridesToSave(userPermStates, editUserRolePerms));
      await updateUserEntityOverrides(editUser.id, computeEntityOverridesToSave(entityStates));
      toast.success('User permissions updated');
      closeDrawer();
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally { setSaving(false); }
  };

  const handleSave = () => {
    if (drawerMode === 'editRole') return handleSaveRole();
    if (drawerMode === 'editUser') return handleSaveUser();
  };

  /* ---------- role CRUD ---------- */

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createRole(formData);
      toast.success('Role created successfully');
      setShowAddModal(false);
      setFormData({});
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create role');
    } finally { setSaving(false); }
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
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally { setSaving(false); }
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

  const openDelete = async (role) => {
    try {
      const res = await getUsers({ role: role.name, limit: 1 });
      const count = res.data?.data?.rows?.length || 0;
      setDeleteTarget({ ...role, userCount: count });
    } catch {
      setDeleteTarget({ ...role, userCount: 0 });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteRole(deleteTarget.id);
      toast.success('Role deleted successfully');
      setDeleteTarget(null);
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete role');
    } finally { setSaving(false); }
  };

  /* ---------- render guards ---------- */

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <UserIcon size={32} className="text-neutral-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Access Restricted
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Only super administrators can manage roles and permissions.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading roles…</p>
        </div>
      </div>
    );
  }

  /* ---------- render ---------- */

  return (
    <div className="w-full max-w-none space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Roles &amp; Permissions
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage roles and assign permissions
          </p>
        </div>
        <Button
          onClick={() => { setFormData({}); setShowAddModal(true); }}
          className="flex items-center gap-2"
        >
          <Plus size={16} /> Add Role
        </Button>
      </div>

      {/* Role list table */}
      <RolesTable
        roles={filteredRoles}
        search={search}
        onSearch={setSearch}
        onRoleClick={openRoleEditor}
        onEditClick={openEdit}
        onDeleteClick={openDelete}
      />

      {/* Add Role Modal */}
      {showAddModal && (
        <Modal
          open={showAddModal}
          title="Add New Role"
          onClose={() => { setShowAddModal(false); setFormData({}); }}
        >
          <RoleForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleCreate}
            saving={saving}
            onCancel={() => { setShowAddModal(false); setFormData({}); }}
            submitLabel="Create Role"
            showName
          />
        </Modal>
      )}

      {/* Edit Role Modal */}
      {showEditModal && editingRole && (
        <Modal
          open={showEditModal}
          title="Edit Role"
          onClose={() => { setShowEditModal(false); setEditingRole(null); setFormData({}); }}
        >
          <RoleForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleEdit}
            saving={saving}
            onCancel={() => { setShowEditModal(false); setEditingRole(null); setFormData({}); }}
            submitLabel="Save Changes"
            showName={false}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Role"
          description={
            deleteTarget.userCount > 0
              ? `"${deleteTarget.display_name}" is assigned to ${deleteTarget.userCount} user(s). Reassign them before deleting.`
              : `Are you sure you want to delete "${deleteTarget.display_name}"?`
          }
          confirmLabel="Delete"
          destructive
          loading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Permissions Drawer */}
      <Drawer open={drawerMode !== null} onClose={closeDrawer} size="lg">
        <PermissionsDrawer
          drawerMode={drawerMode}
          drawerLoading={drawerLoading}
          saving={saving}
          editRole={editRole}
          editRoleUsers={editRoleUsers}
          rolePermStates={rolePermStates}
          editUser={editUser}
          editUserNewRoleName={editUserNewRoleName}
          editUserOriginalRole={editUserOriginalRole}
          editUserRolePerms={editUserRolePerms}
          userPermStates={userPermStates}
          entityStates={entityStates}
          visibleEntityTypes={visibleEntityTypes}
          roles={roles}
          onCancel={closeDrawer}
          onSave={handleSave}
          onRoleChange={setEditUserNewRoleName}
          onRoleActionToggle={handleRoleActionToggle}
          onUserActionToggle={handleUserActionToggle}
          onGrantAll={() => setEditUserOverrides([])}
          onResetDefaults={() => setEditUserOverrides([])}
          onManageAccessRestrictions={enterAccessRestrictions}
          onScopeToggle={handleScopeToggle}
          onRecordToggle={handleRecordToggle}
          onEntitySearch={handleEntitySearch}
          onOpenUserEditor={openUserEditor}
          onBackToEditUser={() => setDrawerMode('editUser')}
        />
      </Drawer>
    </div>
  );
}
