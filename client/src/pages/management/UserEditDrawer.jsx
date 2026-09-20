import { useState, useMemo } from 'react';
import Drawer from '@/shared/components/ui/Drawer';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Toggle } from '@/shared/components/ui/toggle';
import { Tabs, TabPanel } from '@/shared/components/ui/Tabs';
import { GrantRow } from '@/shared/components/ui/GrantRow';
import { ActionChipGroup } from '@/shared/components/ui/ActionChipGroup';
import { Search, Users as UsersIcon, Loader2 } from 'lucide-react';
import { resolveFileUrl } from '@/lib/fileUrl';
import { getInitials, getAvatarColor, getDefinedActions, buildEditorPermState, COURSE_ACTIONS, SOP_ACTIONS, CLIENT_ACTIONS, CATEGORY_LABELS } from './roleUtils';

const ENTITY_TYPES = [
  { value: 'sop', label: 'SOP' },
  { value: 'client', label: 'Client' },
  { value: 'course', label: 'Course' },
];

function EntityAccessList({ items, overrides, actions, search, setSearch, loading, onToggle, onToggleAction, emptyLabel, labelPrefix = '' }) {
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => (item.title || item.client_name || '').toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <Input placeholder={`Search ${labelPrefix.toLowerCase()}…`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{emptyLabel || `No ${labelPrefix.toLowerCase()} found`}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filtered.map((item) => {
            const current = overrides[item.id] || { granted: false, actions: [] };
            return (
              <div key={item.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{item.title || item.client_name || 'Untitled'}</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">{labelPrefix} #{item.id}</p>
                  </div>
                  <Toggle checked={current.granted} onCheckedChange={(checked) => onToggle(item.id, checked)} size="sm" />
                </div>
                {current.granted && (
                  <div className="mt-2 pl-1">
                    <ActionChipGroup actions={actions} selectedActions={current.actions || []} onToggleAction={(action) => onToggleAction(item.id, action)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserEditDrawer({ editingUser, roles, expandedRoleData, editorOverrides, courseOverrides, userCourses, loadingCourses, userSops, sopOverrides, userClients, clientOverrides, existingEntityOverrides, savingOverrides, setEditingUser, onClose, onSave, onTogglePermission, onToggleAction, onToggleCourse, onToggleSop, onToggleClient, onToggleEntityAction, onRemoveEntityOverride, onAddEntityOverride }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [permSearch, setPermSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [sopSearch, setSopSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [entitySearch, setEntitySearch] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('sop');
  const [entityOptions, setEntityOptions] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const permState = buildEditorPermState({ editingUser, editorOverrides, expandedRoleData });

  const categorized = useMemo(() => {
    const filtered = permSearch.trim()
      ? permState.filter((p) => {
          const q = permSearch.toLowerCase();
          return p.name.toLowerCase().includes(q) || (p.display_name || '').toLowerCase().includes(q);
        })
      : permState;
    return filtered.reduce((acc, perm) => {
      const category = perm.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(perm);
      return acc;
    }, {});
  }, [permState, permSearch]);

  const overrideCount = editorOverrides.filter((o) => o.granted || o.actions?.length > 0).length;
  const entityOverrideCount = existingEntityOverrides.length;

  const tabs = [
    { value: 'overview', label: 'Overview', icon: UsersIcon },
    { value: 'permissions', label: 'Permissions', count: overrideCount },
    { value: 'courses', label: 'Course Access', count: Object.values(courseOverrides).filter((c) => c.granted).length },
    { value: 'sops', label: 'SOP Access', count: Object.values(sopOverrides).filter((c) => c.granted).length },
    { value: 'clients', label: 'Client Access', count: Object.values(clientOverrides).filter((c) => c.granted).length },
    { value: 'entities', label: 'Entity Access', count: entityOverrideCount },
  ];

  const handleSearchEntities = async (q) => {
    setEntitySearch(q);
    if (!q.trim()) { setEntityOptions([]); return; }
    try {
      setLoadingEntities(true);
      const res = await fetch(`/api/roles/entities/search?type=${selectedEntityType}&q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.status === 'success') setEntityOptions(data.data || []);
    } catch {
      setEntityOptions([]);
    } finally {
      setLoadingEntities(false);
    }
  };

  const handleAddEntity = () => {
    const entity = entityOptions.find((e) => e.label === entitySearch && e.entity_type === selectedEntityType);
    if (!entity) return;
    onAddEntityOverride({
      permission_name: `manage_${selectedEntityType}s`,
      entity_type: selectedEntityType,
      entity_id: entity.id,
      granted: true,
      actions: getDefinedActions({ name: `manage_${selectedEntityType}s`, actions: null }) || [],
    });
    setEntitySearch('');
    setEntityOptions([]);
  };

  return (
    <Drawer open={!!editingUser} onClose={onClose} title={`Edit User - ${editingUser?.full_name || editingUser?.email || 'User'}`} size="lg" footer={
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} className="border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600">Cancel</Button>
        <Button onClick={onSave} disabled={savingOverrides} className="shadow-sm hover:shadow-md transition-all">
          {savingOverrides ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
          Save Permissions
        </Button>
      </div>
    }>
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="flex items-center gap-3">
          {editingUser?.avatar_url ? (
            <img src={resolveFileUrl(editingUser.avatar_url)} alt={editingUser.full_name || editingUser.email || 'User'} className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-neutral-700 shadow-sm" />
          ) : (
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(editingUser?.full_name || editingUser?.email)} ring-2 ring-white dark:ring-neutral-700 shadow-sm`}>
              {getInitials(editingUser?.full_name || editingUser?.email)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{editingUser?.full_name || '—'}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{editingUser?.email || '—'}</p>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <TabPanel value="overview" activeTab={activeTab}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Role</label>
              <Select value={editingUser?.newRoleName || ''} onChange={(e) => setEditingUser((prev) => prev ? { ...prev, newRoleName: e.target.value } : prev)} className="w-full border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm">
                <option value="" disabled>Select role…</option>
                {roles.filter((r) => r.is_active).map((r) => (
                  <option key={r.id} value={r.name}>{r.display_name || r.name}</option>
                ))}
              </Select>
            </div>
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 bg-neutral-50 dark:bg-neutral-800/50">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">{overrideCount} overrides active</p>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">This user has customized permissions beyond their role defaults.</p>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="permissions" activeTab={activeTab}>
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input placeholder="Search permissions…" value={permSearch} onChange={(e) => setPermSearch(e.target.value)} className="pl-9 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm" />
            </div>
            {Object.entries(categorized).map(([category, perms]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="space-y-1.5">
                  {perms.map((perm) => (
                    <GrantRow
                      key={perm.name}
                      label={perm.display_name}
                      granted={perm.granted}
                      onToggleGrant={() => onTogglePermission(perm.name)}
                      actions={perm.definedActions}
                      selectedActions={perm.selectedActions}
                      onToggleAction={(action) => onToggleAction(perm.name, action)}
                      disabled={savingOverrides}
                      subtitle={perm.useDefaults ? 'Using role defaults' : 'Custom override'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel value="courses" activeTab={activeTab}>
          <EntityAccessList
            items={userCourses}
            overrides={courseOverrides}
            actions={COURSE_ACTIONS}
            search={courseSearch}
            setSearch={setCourseSearch}
            loading={loadingCourses}
            onToggle={onToggleCourse}
            onToggleAction={(courseId, action) => onToggleCourse(courseId, true, action)}
            emptyLabel="No courses found"
            labelPrefix="Course"
          />
        </TabPanel>

        <TabPanel value="sops" activeTab={activeTab}>
          <EntityAccessList
            items={userSops}
            overrides={sopOverrides}
            actions={SOP_ACTIONS}
            search={sopSearch}
            setSearch={setSopSearch}
            loading={loadingCourses}
            onToggle={onToggleSop}
            onToggleAction={(sopId, action) => onToggleSop(sopId, true, action)}
            emptyLabel="No SOPs found"
            labelPrefix="SOP"
          />
        </TabPanel>

        <TabPanel value="clients" activeTab={activeTab}>
          <EntityAccessList
            items={userClients}
            overrides={clientOverrides}
            actions={CLIENT_ACTIONS}
            search={clientSearch}
            setSearch={setClientSearch}
            loading={loadingCourses}
            onToggle={onToggleClient}
            onToggleAction={(clientId, action) => onToggleClient(clientId, true, action)}
            emptyLabel="No clients found"
            labelPrefix="Client"
          />
        </TabPanel>

        <TabPanel value="entities" activeTab={activeTab}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select value={selectedEntityType} onChange={(e) => { setSelectedEntityType(e.target.value); setEntitySearch(''); setEntityOptions([]); }} className="w-36 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs">
                {ENTITY_TYPES.map((et) => <option key={et.value} value={et.value}>{et.label}</option>)}
              </Select>
              <div className="flex-1 relative">
                <Input value={entitySearch} onChange={(e) => handleSearchEntities(e.target.value)} placeholder="Search entity…" className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs" list="entity-options-list" />
                {entityOptions.length > 0 && (
                  <datalist id="entity-options-list">
                    {entityOptions.map((e) => <option key={`${e.entity_type}-${e.id}`} value={e.label} />)}
                  </datalist>
                )}
              </div>
              <Button type="button" onClick={handleAddEntity} disabled={!entitySearch || loadingEntities} size="sm" className="shrink-0 text-xs">Add</Button>
            </div>
            {existingEntityOverrides.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-6">No entity-specific overrides set.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {existingEntityOverrides.map((override, index) => {
                  const definedActions = getDefinedActions({ name: override.permission_name, actions: null }) || [];
                  return (
                    <div key={`${override.permission_name}-${override.entity_type}-${override.entity_id}-${index}`} className={`rounded-lg border p-2.5 transition-colors ${override.granted ? 'bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30' : 'bg-neutral-50 dark:bg-neutral-700/30 border-neutral-200 dark:border-neutral-700'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Toggle checked={override.granted} onCheckedChange={() => onRemoveEntityOverride(index)} disabled={savingOverrides} size="sm" />
                          <span className={`text-xs font-medium ${override.granted ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {override.permission_name.replace('manage_', '')} #{override.entity_id}
                          </span>
                        </div>
                        <button type="button" onClick={() => onRemoveEntityOverride(index)} className="text-[10px] font-medium px-2 py-0.5 rounded-md text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20">Remove</button>
                      </div>
                      {override.granted && (
                        <div className="mt-2 pl-[42px]">
                          <ActionChipGroup actions={definedActions} selectedActions={override.actions || []} onToggleAction={(action) => onToggleEntityAction(index, action)} disabled={savingOverrides} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabPanel>
      </div>
    </Drawer>
  );
}

export default UserEditDrawer;
