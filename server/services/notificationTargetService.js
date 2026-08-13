const db = require('../config/database');

async function getLeadershipTargetUserIds(businessId, departmentId, excludeUserId) {
  const targets = new Set();

  const [superAdmins] = await db.query(
    'SELECT id FROM users WHERE is_active = 1 AND role = ?',
    ['super_admin']
  );
  superAdmins.forEach((u) => targets.add(u.id));

  if (businessId) {
    const [admins] = await db.query(
      'SELECT id FROM users WHERE is_active = 1 AND role = ? AND business_id = ?',
      ['admin', businessId]
    );
    admins.forEach((u) => targets.add(u.id));
  }

  if (departmentId) {
    const [deptHeads] = await db.query(
      `SELECT u.id FROM users u
       WHERE u.is_active = 1 AND u.role = ?
       AND (u.department_id = ? OR EXISTS (
         SELECT 1 FROM department_scope_grants dsg
         WHERE dsg.user_id = u.id AND dsg.department_id = ?
       ))`,
      ['department_head', departmentId, departmentId]
    );
    deptHeads.forEach((u) => targets.add(u.id));
  }

  targets.delete(excludeUserId);
  return Array.from(targets);
}

async function getAnnouncementTargetUserIds(businessId, targetDepartmentCodes) {
  if (!businessId) return null;

  const conditions = ['u.is_active = 1', "u.role NOT IN ('super_admin')", 'u.business_id = ?'];
  const params = [businessId];

  if (Array.isArray(targetDepartmentCodes) && targetDepartmentCodes.length > 0) {
    const deptPlaceholders = targetDepartmentCodes.map(() => '?').join(',');
    const codeParams = targetDepartmentCodes.map((code) => String(code));

    const deptRows = await db.query(
      `SELECT id FROM departments WHERE business_id = ? AND code IN (${deptPlaceholders})`,
      [businessId, ...codeParams]
    );
    const deptIds = deptRows[0]?.map((d) => d.id) || [];
    if (deptIds.length > 0) {
      const idPlaceholders = deptIds.map(() => '?').join(',');
      conditions.push(`u.department_id IN (${idPlaceholders})`);
      params.push(...deptIds);
    }
  }

  const [rows] = await db.query(
    `SELECT u.id FROM users u WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows.map((u) => u.id);
}

async function getBusinessUserIds(businessId) {
  if (!businessId) return null;
  const [rows] = await db.query(
    'SELECT id FROM users WHERE business_id = ? AND role NOT IN (\'super_admin\') AND is_active = 1',
    [businessId]
  );
  return rows.map((u) => u.id);
}

module.exports = {
  getLeadershipTargetUserIds,
  getAnnouncementTargetUserIds,
  getBusinessUserIds,
};
