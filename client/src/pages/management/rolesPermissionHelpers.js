import { getDefinedActions, parseActions, CATEGORY_LABELS, COURSE_ACTIONS, SOP_ACTIONS, CLIENT_ACTIONS } from './roleUtils';

export { CATEGORY_LABELS };

export const DEPRECATED_PERMISSIONS = new Set();

export function isActivePermission(name) {
  return !DEPRECATED_PERMISSIONS.has(name);
}

export const ENTITY_TYPE_CONFIG = {
  course: { permission: 'manage_courses', label: 'Courses', actions: COURSE_ACTIONS },
  sop: { permission: 'manage_sops', label: 'SOPs', actions: SOP_ACTIONS },
  client: { permission: 'manage_clients', label: 'Clients', actions: CLIENT_ACTIONS },
};

export const ENTITY_TYPES = Object.keys(ENTITY_TYPE_CONFIG);

export function computeRolePermState(allPermissions, rolePermNames) {
  const permNameSet = new Set(rolePermNames);
  return allPermissions.map(perm => {
    const defined = getDefinedActions(perm);
    const isGranted = permNameSet.has(perm.name);
    return {
      name: perm.name,
      display_name: perm.display_name,
      category: perm.category || 'other',
      granted: isGranted,
      definedActions: defined,
      selectedActions: isGranted ? [...defined] : [],
      useDefaults: isGranted,
    };
  });
}

export function computeUserPermState(rolePerms, userOverrides) {
  if (!rolePerms || rolePerms.length === 0) return [];
  const overrideMap = new Map(userOverrides.map(o => [o.permission_name, o]));

  return rolePerms.map(perm => {
    const defined = getDefinedActions(perm);
    const override = overrideMap.get(perm.name);

    if (override) {
      if (!override.granted) {
        return { ...perm, granted: false, definedActions: defined, selectedActions: [], useDefaults: false };
      }
      const userActions = override.actions === null || override.actions === undefined
        ? defined
        : parseActions(override.actions).filter(a => defined.includes(a));
      return { ...perm, granted: true, definedActions: defined, selectedActions: userActions, useDefaults: false };
    }
    return { ...perm, granted: true, definedActions: defined, selectedActions: [...defined], useDefaults: true };
  });
}

export function groupByCategory(permStates) {
  return permStates.reduce((acc, perm) => {
    const cat = perm.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(perm);
    return acc;
  }, {});
}

export function hasRestrictablePermission(permStates, entityType) {
  const config = ENTITY_TYPE_CONFIG[entityType];
  if (!config) return false;
  const perm = permStates.find(p => p.name === config.permission);
  return perm ? perm.granted : false;
}

export function computeUserOverridesToSave(permStates, rolePerms) {
  if (!rolePerms) return [];
  const rolePermNames = new Set(rolePerms.map(p => p.name));
  const overrides = [];

  for (const state of permStates) {
    if (!rolePermNames.has(state.name)) continue;

    const defined = state.definedActions;
    const selected = state.selectedActions;

    if (!state.granted) {
      overrides.push({ permission_name: state.name, granted: false, actions: [] });
    } else {
      const isAllActions = selected.length === defined.length && defined.every(a => selected.includes(a));
      if (!isAllActions) {
        if (selected.length > 0) {
          overrides.push({ permission_name: state.name, granted: true, actions: selected });
        } else {
          overrides.push({ permission_name: state.name, granted: false, actions: [] });
        }
      }
    }
  }

  return overrides;
}

export function computeEntityOverridesToSave(entityStates) {
  const overrides = [];
  for (const [entityType, state] of Object.entries(entityStates)) {
    const config = ENTITY_TYPE_CONFIG[entityType];
    if (!config) continue;

    if (state.scope === 'denied') {
      const allIds = (state.entities || []).map(e => e.id);
      for (const id of allIds) {
        overrides.push({
          permission_name: config.permission,
          entity_type: entityType,
          entity_id: id,
          granted: false,
          actions: [],
        });
      }
      continue;
    }

    if (state.scope !== 'selected') continue;
    state.selectedIds.forEach(id => {
      overrides.push({
        permission_name: config.permission,
        entity_type: entityType,
        entity_id: id,
        granted: true,
        actions: config.actions,
      });
    });
  }
  return overrides;
}

export function initEntityStates(existingOverrides) {
  const states = {};
  for (const entityType of ENTITY_TYPES) {
    const config = ENTITY_TYPE_CONFIG[entityType];
    const grantedOverrides = existingOverrides.filter(
      o => o.permission_name === config.permission && o.entity_type === entityType && o.granted
    );
    const deniedOverrides = existingOverrides.filter(
      o => o.permission_name === config.permission && o.entity_type === entityType && !o.granted
    );
    const isAllDenied = deniedOverrides.length > 0 && grantedOverrides.length === 0;
    states[entityType] = {
      entities: [],
      search: '',
      scope: isAllDenied ? 'denied' : grantedOverrides.length > 0 ? 'selected' : 'all',
      selectedIds: new Set(grantedOverrides.map(o => o.entity_id)),
      loaded: false,
    };
  }
  return states;
}

export function toggleUserAction(userOverrides, permName, action, definedActions, roleHasPermission) {
  if (!roleHasPermission) return userOverrides;

  const existing = userOverrides.find(o => o.permission_name === permName);

  if (existing) {
    if (!existing.granted) {
      return userOverrides.map(o =>
        o.permission_name === permName
          ? { permission_name: permName, granted: true, actions: [action] }
          : o
      );
    }
    const currentActions = parseActions(existing.actions).filter(a => definedActions.includes(a));
    if (currentActions.includes(action)) {
      const next = currentActions.filter(a => a !== action);
      if (next.length === 0) {
        return userOverrides.map(o =>
          o.permission_name === permName
            ? { permission_name: permName, granted: false, actions: [] }
            : o
        );
      }
      return userOverrides.map(o =>
        o.permission_name === permName
          ? { ...o, actions: next }
          : o
      );
    }
    return userOverrides.map(o =>
      o.permission_name === permName
        ? { ...o, actions: [...currentActions, action] }
        : o
    );
  }

  const remaining = definedActions.filter(a => a !== action);
  return [...userOverrides, {
    permission_name: permName,
    granted: true,
    actions: remaining,
  }];
}
