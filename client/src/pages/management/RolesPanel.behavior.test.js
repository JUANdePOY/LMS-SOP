function parseActions(actionsJson, permissionName) {
  if (Array.isArray(actionsJson)) {
    return actionsJson.filter((a) => typeof a === 'string');
  }
  if (actionsJson) {
    try {
      const arr = JSON.parse(actionsJson);
      if (Array.isArray(arr)) return arr.filter((a) => typeof a === 'string');
    } catch {}
  }
  if (permissionName.startsWith('view_')) return ['view'];
  if (permissionName.startsWith('manage_')) return ['view', 'create', 'edit', 'delete', 'approve', 'publish', 'archive', 'assign'];
  const dotIndex = permissionName.lastIndexOf('.');
  if (dotIndex !== -1) {
    const action = permissionName.substring(dotIndex + 1);
    return ['view', action];
  }
  return [];
}

function normalizeOverrideActions(override) {
  let actions = override.actions;
  if (typeof actions === 'string') {
    try {
      const parsed = JSON.parse(actions);
      actions = Array.isArray(parsed) ? parsed : null;
    } catch {
      actions = null;
    }
  } else if (!Array.isArray(actions)) {
    actions = null;
  }
  return { ...override, actions };
}

function toggleEditorAction({ editorOverrides, expandedRoleData, editingUser }, permName, action) {
  const existing = editorOverrides.find((o) => o.permission_name === permName);
  const data = expandedRoleData[editingUser.roleName] || { rolePerms: [] };
  const perm = data.rolePerms.find((p) => p.name === permName);
  const defined = parseActions(perm?.actions, permName);

  if (existing) {
    if (!existing.granted || (existing.actions != null && existing.actions.length === 0)) {
      return editorOverrides.map(o =>
        o.permission_name === permName
          ? { permission_name: permName, granted: true, actions: [...defined] }
          : o
      );
    }
    const currentActions = (existing.actions != null ? existing.actions : defined).filter((a) => defined.includes(a));
    if (currentActions.includes(action)) {
      const next = currentActions.filter((a) => a !== action);
      if (next.length === 0) {
        return editorOverrides.map(o =>
          o.permission_name === permName
            ? { permission_name: permName, granted: false, actions: [] }
            : o
        );
      }
      return editorOverrides.map(o =>
        o.permission_name === permName
          ? { ...o, actions: next }
          : o
      );
    }
    return editorOverrides.map(o =>
      o.permission_name === permName
        ? { ...o, actions: [...currentActions, action] }
        : o
    );
  }

  return [...editorOverrides, { permission_name: permName, granted: true, actions: [...defined] }];
}

function getSelectedActions(editorOverrides, perm) {
  const override = editorOverrides.find((o) => o.permission_name === perm.name);
  return override && override.actions != null ? override.actions : parseActions(perm.actions, perm.name);
}

let failed = 0;
const perm = { name: 'manage_sops', actions: JSON.stringify(['view', 'create', 'edit', 'delete']) };
const defined = parseActions(perm.actions, perm.name);
const editorOverrides = [];
const expandedRoleData = {
  admin: { rolePerms: [perm] }
};
const editingUser = { roleName: 'admin' };

console.log('Defined actions:', defined);

// Test 1: action row should be computable even before any override
{
  const selected = getSelectedActions(editorOverrides, perm);
  const pass = Array.isArray(selected) && selected.length === defined.length;
  console.log(`${pass ? 'PASS' : 'FAIL'}: initial selected actions computable => ${JSON.stringify(selected)}`);
  if (!pass) failed++;
}

// Test 2: clicking one action on a denied/defaultless permission grants all defined actions
{
  let next = toggleEditorAction({ editorOverrides, expandedRoleData, editingUser }, 'manage_sops', 'view');
  const selected = getSelectedActions(next, perm);
  const pass = JSON.stringify(selected) === JSON.stringify(defined);
  console.log(`${pass ? 'PASS' : 'FAIL'}: click one action => ${JSON.stringify(selected)}`);
  if (!pass) failed++;
}

// Test 3: clicking a second action adds only that action
{
  let next = toggleEditorAction({ editorOverrides: [...editorOverrides, { permission_name: 'manage_sops', granted: true, actions: ['view'] }], expandedRoleData, editingUser }, 'manage_sops', 'edit');
  const selected = getSelectedActions(next, perm);
  const pass = JSON.stringify(selected) === '["view","edit"]';
  console.log(`${pass ? 'PASS' : 'FAIL'}: click second action => ${JSON.stringify(selected)}`);
  if (!pass) failed++;
}

// Test 4: unchecking one action removes only that action
{
  let next = toggleEditorAction({ editorOverrides: [...editorOverrides, { permission_name: 'manage_sops', granted: true, actions: ['view', 'edit'] }], expandedRoleData, editingUser }, 'manage_sops', 'view');
  const selected = getSelectedActions(next, perm);
  const pass = JSON.stringify(selected) === '["edit"]';
  console.log(`${pass ? 'PASS' : 'FAIL'}: uncheck one action => ${JSON.stringify(selected)}`);
  if (!pass) failed++;
}

// Test 5: unchecking all actions leaves empty array, not undefined
{
  let next = toggleEditorAction({ editorOverrides: [...editorOverrides, { permission_name: 'manage_sops', granted: true, actions: ['view'] }], expandedRoleData, editingUser }, 'manage_sops', 'view');
  const selected = getSelectedActions(next, perm);
  const pass = Array.isArray(selected) && selected.length === 0;
  console.log(`${pass ? 'PASS' : 'FAIL'}: uncheck all actions => ${JSON.stringify(selected)}`);
  if (!pass) failed++;
}

// Test 6: after empty actions, clicking an action grants all defined actions
{
  let overrides = [{ permission_name: 'manage_sops', granted: true, actions: [] }];
  let next = toggleEditorAction({ editorOverrides: overrides, expandedRoleData, editingUser }, 'manage_sops', 'edit');
  const selected = getSelectedActions(next, perm);
  const pass = JSON.stringify(selected) === JSON.stringify(defined);
  console.log(`${pass ? 'PASS' : 'FAIL'}: after empty, click action => ${JSON.stringify(selected)}`);
  if (!pass) failed++;
}

// Test 7: action row should always be renderable (no .filter crash)
{
  const override = { permission_name: 'manage_sops', granted: true, actions: '["view"]' };
  const normalized = normalizeOverrideActions(override);
  const actions = normalized.actions != null ? normalized.actions.filter((a) => defined.includes(a)) : defined;
  const pass = Array.isArray(actions) && actions.length > 0;
  console.log(`${pass ? 'PASS' : 'FAIL'}: normalized string actions => ${JSON.stringify(actions)}`);
  if (!pass) failed++;
}

if (failed > 0) {
  console.error(`FAILED: ${failed} test(s)`);
  process.exit(1);
}
console.log('All behavior tests passed');
