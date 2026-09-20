export function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export function getAvatarColor(name) {
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

export function parseActions(actionsJson) {
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

export function getDefinedActions(permission) {
  const defined = parseActions(permission?.actions);
  if (defined.length > 0 || Array.isArray(permission?.actions)) return defined;
  return FALLBACK_ACTIONS[permission?.name] || [];
}

export function buildEditorPermState({ editingUser, editorOverrides, expandedRoleData }) {
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
}

export const CATEGORY_LABELS = {
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
  businesses: 'Businesses',
  clients: 'Clients',
  tasks: 'Tasks',
  projects: 'Projects',
  banners: 'Banners',
};

export const FALLBACK_ACTIONS = {
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
  manage_businesses: ['view', 'create', 'edit', 'delete'],
  manage_clients: ['view', 'create', 'edit', 'delete'],
  manage_tasks: ['view', 'create', 'edit', 'delete', 'assign'],
  'projects.manage': ['view', 'create', 'edit', 'delete'],
  'banners.manage': ['view', 'create', 'edit', 'delete'],
};

export const COURSE_ACTIONS = ['view', 'create', 'edit', 'delete', 'publish', 'archive', 'enroll', 'grade'];
export const SOP_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'publish', 'assign'];
export const CLIENT_ACTIONS = ['view', 'create', 'edit', 'delete'];
