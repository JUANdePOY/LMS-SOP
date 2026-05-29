const db = require('../config/database');

const VALID_ROLES = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron', 'reservist'];

const ROLES_BY_HIERARCHY = {
  admin: ['admin', 'admin_arsen', 'admin_group', 'admin_squadron', 'reservist'],
  admin_arsen: ['admin_group', 'admin_squadron', 'reservist', 'admin_arsen'],
  admin_group: ['admin_squadron', 'reservist', 'admin_group'],
  admin_squadron: ['reservist'],
  reservist: []
};

function canAssignRole(requestingUser, targetRole) {
  if (!requestingUser) return { valid: false, error: 'No requesting user' };
  
  if (!VALID_ROLES.includes(targetRole)) {
    return { valid: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` };
  }
  
  const assignableRoles = ROLES_BY_HIERARCHY[requestingUser.role] || [];
  if (!assignableRoles.includes(targetRole)) {
    return { valid: false, error: `Cannot assign role '${targetRole}'. Allowed roles: ${assignableRoles.join(', ')}` };
  }
  
  return { valid: true };
}

async function fetchUserWithHierarchy(userId) {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.role, u.is_active, u.scope_arsen_id, u.scope_group_id, u.scope_squadron_id,
            a.id AS arsen_exists,
            g.id AS group_exists, g.arsen_id AS group_arsen_id,
            s.id AS squadron_exists, s.group_id AS squadron_group_id
     FROM users u
     LEFT JOIN arsens a ON u.scope_arsen_id = a.id
     LEFT JOIN \`groups\` g ON u.scope_group_id = g.id
     LEFT JOIN squadron s ON u.scope_squadron_id = s.id
     WHERE u.id = ?`,
    [userId]
  );
  return rows[0] || null;
}

async function validateScopeAssignment(requestingUser, arsenId, groupId, squadronId) {
  if (!requestingUser) return { valid: false, error: 'No requesting user' };

  if (requestingUser.role === 'admin') return { valid: true };

  if (requestingUser.role === 'admin_arsen') {
    if (arsenId !== undefined && arsenId !== null && arsenId !== requestingUser.scope_arsen_id) {
      return { valid: false, error: 'Cannot assign scope to a different ARSEN' };
    }
    if (groupId !== undefined && groupId !== null) {
      const [groupRows] = await db.query(
        'SELECT g.id FROM `groups` g WHERE g.id = ? AND g.arsen_id = ? AND g.is_active = TRUE',
        [groupId, requestingUser.scope_arsen_id]
      );
      if (groupRows.length === 0) {
        return { valid: false, error: 'Group not found or not under your ARSEN' };
      }
    }
    if (squadronId !== undefined && squadronId !== null) {
      const [squadronRows] = await db.query(
        `SELECT s.id FROM squadron s 
         JOIN \`groups\` g ON s.group_id = g.id 
         WHERE s.id = ? AND g.arsen_id = ? AND s.is_active = TRUE`,
        [squadronId, requestingUser.scope_arsen_id]
      );
      if (squadronRows.length === 0) {
        return { valid: false, error: 'Squadron not found or not under your ARSEN' };
      }
    }
    return { valid: true };
  }

  if (requestingUser.role === 'admin_group') {
    if (arsenId !== undefined && arsenId !== null) {
      return { valid: false, error: 'Admin Group cannot assign ARSEN scope' };
    }
    if (groupId !== undefined && groupId !== null && groupId !== requestingUser.scope_group_id) {
      return { valid: false, error: 'Cannot assign scope to a different Group' };
    }
    if (squadronId !== undefined && squadronId !== null) {
      const [squadronRows] = await db.query(
        'SELECT s.id FROM squadron s WHERE s.id = ? AND s.group_id = ? AND s.is_active = TRUE',
        [squadronId, requestingUser.scope_group_id]
      );
      if (squadronRows.length === 0) {
        return { valid: false, error: 'Squadron not found or not under your Group' };
      }
    }
    return { valid: true };
  }

  if (requestingUser.role === 'admin_squadron') {
    if (arsenId !== undefined && arsenId !== null) {
      return { valid: false, error: 'Admin Squadron cannot assign ARSEN scope' };
    }
    if (groupId !== undefined && groupId !== null) {
      return { valid: false, error: 'Admin Squadron cannot assign Group scope' };
    }
    if (squadronId !== undefined && squadronId !== null && squadronId !== requestingUser.scope_squadron_id) {
      return { valid: false, error: 'Cannot assign scope to a different Squadron' };
    }
    return { valid: true };
  }

  return { valid: false, error: 'No permission to assign scopes' };
}

async function canManageUser(requestingUser, targetUser) {
  if (!requestingUser || !targetUser) return false;
  
  if (requestingUser.role === 'admin') return true;

  if (requestingUser.role === 'admin_arsen') {
    if (targetUser.role === 'admin') return false;
    if (targetUser.role === 'admin_arsen') {
      return targetUser.scope_arsen_id && targetUser.scope_arsen_id === requestingUser.scope_arsen_id;
    }
    if (targetUser.role === 'admin_group') {
      const [rows] = await db.query(
        'SELECT g.id FROM `groups` g WHERE g.id = ? AND g.arsen_id = ? AND g.is_active = TRUE',
        [targetUser.scope_group_id, requestingUser.scope_arsen_id]
      );
      return rows.length > 0;
    }
    if (targetUser.role === 'admin_squadron') {
      const [rows] = await db.query(
        `SELECT s.id FROM squadron s 
         JOIN \`groups\` g ON s.group_id = g.id 
         WHERE s.id = ? AND g.arsen_id = ? AND s.is_active = TRUE`,
        [targetUser.scope_squadron_id, requestingUser.scope_arsen_id]
      );
      return rows.length > 0;
    }
    if (targetUser.role === 'reservist') {
      const [rows] = await db.query(
        `SELECT ra.id FROM reservist_assignments ra
         LEFT JOIN \`groups\` g ON ra.group_id = g.id
         LEFT JOIN squadron s ON ra.squadron_id = s.id
         WHERE ra.reservist_id = (
           SELECT r.id FROM reservists r WHERE r.user_id = ?
         ) AND (g.arsen_id = ? OR s.group_id IN (
           SELECT id FROM \`groups\` WHERE arsen_id = ?
         ))`,
        [targetUser.id, requestingUser.scope_arsen_id, requestingUser.scope_arsen_id]
      );
      return rows.length > 0;
    }
    return false;
  }

  if (requestingUser.role === 'admin_group') {
    if (targetUser.role === 'admin' || targetUser.role === 'admin_arsen') return false;
    if (targetUser.role === 'admin_group') {
      return targetUser.scope_group_id && targetUser.scope_group_id === requestingUser.scope_group_id;
    }
    if (targetUser.role === 'admin_squadron') {
      const [rows] = await db.query(
        'SELECT s.id FROM squadron s WHERE s.id = ? AND s.group_id = ? AND s.is_active = TRUE',
        [targetUser.scope_squadron_id, requestingUser.scope_group_id]
      );
      return rows.length > 0;
    }
    if (targetUser.role === 'reservist') {
      const [rows] = await db.query(
        `SELECT ra.id FROM reservist_assignments ra
         WHERE ra.reservist_id = (
           SELECT r.id FROM reservists r WHERE r.user_id = ?
         ) AND (ra.group_id = ? OR ra.squadron_id IN (
           SELECT id FROM squadron WHERE group_id = ?
         ))`,
        [targetUser.id, requestingUser.scope_group_id, requestingUser.scope_group_id]
      );
      return rows.length > 0;
    }
    return false;
  }

  if (requestingUser.role === 'admin_squadron') {
    if (targetUser.role === 'admin' || targetUser.role === 'admin_arsen' || targetUser.role === 'admin_group') return false;
    if (targetUser.role === 'admin_squadron') {
      return targetUser.scope_squadron_id && targetUser.scope_squadron_id === requestingUser.scope_squadron_id;
    }
    if (targetUser.role === 'reservist') {
      const [rows] = await db.query(
        `SELECT ra.id FROM reservist_assignments ra
         WHERE ra.reservist_id = (
           SELECT r.id FROM reservists r WHERE r.user_id = ?
         ) AND ra.squadron_id = ?`,
        [targetUser.id, requestingUser.scope_squadron_id]
      );
      return rows.length > 0;
    }
    return false;
  }

  return false;
}

async function fetchUsersWithHierarchyForAdmin(requestingUser) {
  if (!requestingUser) return { where: '1 = 0', params: [] };
  
  if (requestingUser.role === 'admin') {
    return { where: '', params: [] };
  }

  if (requestingUser.role === 'admin_arsen') {
    const [rows] = await db.query(
      'SELECT id FROM `groups` g WHERE g.arsen_id = ? AND g.is_active = TRUE',
      [requestingUser.scope_arsen_id]
    );
    const groupIds = rows.map(r => r.id);
    
    const params = [requestingUser.scope_arsen_id];
    let where = '(u.scope_arsen_id = ?';
    
    if (groupIds.length > 0) {
      where += ' OR u.scope_group_id IN (' + groupIds.map(() => '?').join(',') + ')';
      params.push(...groupIds);
    }
    
    const [squadronRows] = await db.query(
      `SELECT s.id FROM squadron s 
       JOIN \`groups\` g ON s.group_id = g.id 
       WHERE g.arsen_id = ? AND s.is_active = TRUE`,
      [requestingUser.scope_arsen_id]
    );
    const squadronIds = squadronRows.map(r => r.id);
    
    if (squadronIds.length > 0) {
      where += ' OR u.scope_squadron_id IN (' + squadronIds.map(() => '?').join(',') + ')';
      params.push(...squadronIds);
    }
    
    where += ` OR EXISTS (
      SELECT 1 FROM reservists r 
      JOIN reservist_assignments ra ON r.id = ra.reservist_id 
      LEFT JOIN squadron s ON ra.squadron_id = s.id 
      LEFT JOIN \`groups\` g ON ra.group_id = g.id 
      WHERE r.user_id = u.id AND (g.arsen_id = ? OR s.group_id IN (
        SELECT id FROM \`groups\` WHERE arsen_id = ?
      ))
    )`;
    params.push(requestingUser.scope_arsen_id, requestingUser.scope_arsen_id);
    
    where += ')';
    return { where, params };
  }

  if (requestingUser.role === 'admin_group') {
    const [rows] = await db.query(
      'SELECT id FROM squadron s WHERE s.group_id = ? AND s.is_active = TRUE',
      [requestingUser.scope_group_id]
    );
    const squadronIds = rows.map(r => r.id);
    
    const params = [requestingUser.scope_group_id];
    let where = '(u.scope_group_id = ?';
    
    if (squadronIds.length > 0) {
      where += ' OR u.scope_squadron_id IN (' + squadronIds.map(() => '?').join(',') + ')';
      params.push(...squadronIds);
    }
    
    where += ` OR EXISTS (
      SELECT 1 FROM reservists r 
      JOIN reservist_assignments ra ON r.id = ra.reservist_id 
      WHERE r.user_id = u.id AND (ra.group_id = ? OR ra.squadron_id IN (
        SELECT id FROM squadron WHERE group_id = ?
      ))
    )`;
    params.push(requestingUser.scope_group_id, requestingUser.scope_group_id);
    
    where += ')';
    return { where, params };
  }

  if (requestingUser.role === 'admin_squadron') {
    return {
      where: `u.scope_squadron_id = ? OR EXISTS (
        SELECT 1 FROM reservists r 
        JOIN reservist_assignments ra ON r.id = ra.reservist_id 
        WHERE r.user_id = u.id AND ra.squadron_id = ?
      )`,
      params: [requestingUser.scope_squadron_id, requestingUser.scope_squadron_id]
    };
  }

  return { where: '1 = 0', params: [] };
}

function requireScopedUserManagement(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized - No user information',
      code: 'UNAUTHORIZED'
    });
  }

  const adminRoles = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required to manage users',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
}

module.exports = {
  canManageUser,
  canAssignRole,
  validateScopeAssignment,
  fetchUsersWithHierarchyForAdmin,
  requireScopedUserManagement,
  fetchUserWithHierarchy,
  VALID_ROLES,
  ROLES_BY_HIERARCHY
};