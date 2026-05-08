const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { hashPassword, generateResetToken } = require('../app/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// Helper: Get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || null;
};

// Helper: Get pagination params
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// Helper: Build WHERE clause for filters
const buildFilterQuery = (filters) => {
  const conditions = [];
  const params = [];

  if (filters.status !== undefined) {
    conditions.push('r.is_active = ?');
    params.push(filters.status === 'active' ? 1 : 0);
  }

  if (filters.group_id) {
    conditions.push('ra.group_id = ?');
    params.push(filters.group_id);
  }

  if (filters.squadron_id) {
    conditions.push('ra.squadron_id = ?');
    params.push(filters.squadron_id);
  }

  if (filters.rank) {
    conditions.push('r.`rank` = ?');
    params.push(filters.rank);
  }

  if (filters.reserve_status) {
    conditions.push('r.reserve_status = ?');
    params.push(filters.reserve_status);
  }

  if (filters.search) {
    conditions.push('(r.first_name LIKE ? OR r.last_name LIKE ? OR r.service_number LIKE ? OR u.email LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  return {
    whereClause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    params
  };
};

/**
 * GET /api/reservists
 * List all reservists with filters, pagination, and sorting
 */
router.get(
  '/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort_by').optional().isIn(['first_name', 'last_name', 'rank', 'service_number', 'created_at']),
    query('sort_order').optional().isIn(['asc', 'desc']),
    query('status').optional().isIn(['active', 'inactive']),
    query('group_id').optional().isInt(),
    query('squadron_id').optional().isInt(),
    query('rank').optional(),
    query('reserve_status').optional(),
    query('search').optional()
  ],
  async (req, res) => {
    try {
      // Check authorization - reservist can only see own info
      if (req.user.role === 'reservist') {
        return res.status(403).json({
          status: 'error',
          message: 'Reservists can only access their own profile',
          code: 'ACCESS_DENIED'
        });
      }

      // Validate query params
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { page, limit, offset } = getPaginationParams(req.query);
      const sortBy = req.query.sort_by || 'created_at';
      const sortOrder = (req.query.sort_order || 'desc').toUpperCase();

      const filter = buildFilterQuery(req.query);

      // Count total records
      const countQuery = `
        SELECT COUNT(DISTINCT r.id) as total
        FROM reservists r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id
        ${filter.whereClause}
      `;

      const [countResult] = await db.execute(countQuery, filter.params);
      const total = countResult[0].total;

      // Fetch paginated records
      const query = `
        SELECT 
          r.id, r.user_id, r.first_name, r.last_name, r.\`rank\`, 
          r.service_number, r.date_of_birth, r.sex, r.phone_number,
          r.reserve_status, r.is_active, r.created_at, r.updated_at,
          u.email, u.role,
          ra.id as assignment_id, ra.group_id, ra.squadron_id, 
          g.name as group_name, s.squadron_name
        FROM reservists r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
        LEFT JOIN \`groups\` g ON ra.group_id = g.id
        LEFT JOIN squadron s ON ra.squadron_id = s.id
        ${filter.whereClause}
        ORDER BY r.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      const params = [...filter.params, limit, offset];
      const [rows] = await db.execute(query, params);

      res.json({
        status: 'success',
        data: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching reservists:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch reservists',
        code: 'FETCH_ERROR'
      });
    }
  }
);

/**
 * GET /api/reservists/:id
 * Get detailed information for a specific reservist
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization: admin or own record
    if (req.user.role === 'reservist' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    const query = `
      SELECT 
        r.*, u.email, u.role, u.is_active as user_active,
        ra.id as assignment_id, ra.group_id, ra.squadron_id, ra.assigned_date,
        g.name as group_name, g.code as group_code,
        s.squadron_name, s.location
      FROM reservists r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      LEFT JOIN squadron s ON ra.squadron_id = s.id
      WHERE r.id = ?
    `;

    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching reservist:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reservist',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /api/reservists
 * Create a new reservist
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  [
    body('email').isEmail().trim().normalizeEmail(),
    body('first_name').notEmpty().trim().isLength({ min: 2, max: 100 }),
    body('last_name').notEmpty().trim().isLength({ min: 2, max: 100 }),
    body('rank').notEmpty().trim(),
    body('service_number').notEmpty().trim().isLength({ min: 3, max: 100 }),
    body('password').isLength({ min: 6 }),
    body('date_of_birth').optional().isISO8601(),
    body('sex').optional().isIn(['Male', 'Female', 'Other']),
    body('blood_type').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']),
    body('phone_number').optional().trim(),
    body('reserve_status').optional().isIn(['Ready Reserve', 'Standby Reserve', 'Retired']),
    body('group_id').optional().isInt(),
    body('squadron_id').optional().isInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const {
        email, password, first_name, last_name, rank, service_number,
        date_of_birth, sex, blood_type, phone_number, reserve_status,
        group_id, squadron_id,
        place_of_birth, civil_status, citizenship, height, weight,
        address, reserve_center, category, date_enlisted,
        source_of_commission, rank_date_appointment, specialization,
        highest_education, course_degree, school, year_graduated,
        occupation, employer, office_address,
        basic_training_completed, basic_training_date,
        emergency_contact_name, emergency_contact_phone, emergency_contact_address,
        ...otherFields
      } = req.body;

      // Check if email or service number already exists
      const [existing] = await db.execute(
        'SELECT id FROM users WHERE email = ? UNION SELECT r.user_id FROM reservists r WHERE r.service_number = ?',
        [email, service_number]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Email or service number already exists',
          code: 'DUPLICATE_ENTRY'
        });
      }

      // Validate group and squadron if provided
      if (group_id || squadron_id) {
        if (!group_id || !squadron_id) {
          return res.status(400).json({
            status: 'error',
            message: 'Both group_id and squadron_id must be provided for assignment',
            code: 'INVALID_ASSIGNMENT'
          });
        }

        const [groupData] = await db.execute(
          'SELECT id FROM `groups` WHERE id = ? AND is_active = TRUE',
          [group_id]
        );
        const [squadronData] = await db.execute(
          'SELECT id FROM squadron WHERE id = ? AND is_active = TRUE',
          [squadron_id]
        );

        if (groupData.length === 0 || squadronData.length === 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid group or squadron',
            code: 'INVALID_ASSIGNMENT'
          });
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Start transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Create user
        const [userResult] = await connection.execute(
          'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, TRUE)',
          [email, hashedPassword, 'reservist']
        );

        const userId = userResult.insertId;

        // Create reservist with all fields
        const reservistData = {
          user_id: userId,
          first_name,
          last_name,
          rank,
          service_number,
          date_of_birth: date_of_birth || null,
          sex: sex || null,
          blood_type: blood_type || 'Unknown',
          phone_number: phone_number || null,
          reserve_status: reserve_status || 'Ready Reserve',
          is_active: true,
          place_of_birth: place_of_birth || null,
          civil_status: civil_status || null,
          citizenship: citizenship || 'Filipino',
          height: height || null,
          weight: weight || null,
          address: address || null,
          reserve_center: reserve_center || null,
          category: category || null,
          date_enlisted: date_enlisted || null,
          source_of_commission: source_of_commission || null,
          rank_date_appointment: rank_date_appointment || null,
          specialization: specialization || null,
          highest_education: highest_education || null,
          course_degree: course_degree || null,
          school: school || null,
          year_graduated: year_graduated || null,
          occupation: occupation || null,
          employer: employer || null,
          office_address: office_address || null,
          basic_training_completed: basic_training_completed || null,
          basic_training_date: basic_training_date || null,
          emergency_contact_name: emergency_contact_name || null,
          emergency_contact_phone: emergency_contact_phone || null,
          emergency_contact_address: emergency_contact_address || null,
          ...otherFields
        };

        const columns = Object.keys(reservistData);
        const values = Object.values(reservistData);
        const placeholders = columns.map(() => '?').join(',');

        const [reservistResult] = await connection.execute(
          `INSERT INTO reservists (${columns.join(',')}) VALUES (${placeholders})`,
          values
        );

        const reservistId = reservistResult.insertId;

        // Create assignment if provided
        if (group_id && squadron_id) {
          await connection.execute(
            'INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary) VALUES (?, ?, ?, CURDATE(), TRUE)',
            [reservistId, group_id, squadron_id]
          );
        }

        await connection.commit();

        // Log audit
        logAudit({
          user_id: req.user.id,
          action: 'reservist.created',
          entity_type: 'reservist',
          entity_id: reservistId,
          new_values: { email, first_name, last_name, rank, service_number },
          ip_address: getClientIp(req),
          user_agent: req.headers['user-agent']
        });

        // Fetch created reservist
        const [created] = await db.execute(
          'SELECT r.*, u.email FROM reservists r JOIN users u ON r.user_id = u.id WHERE r.id = ?',
          [reservistId]
        );

        res.status(201).json({
          status: 'success',
          message: 'Reservist created successfully',
          data: created[0]
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error creating reservist:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create reservist',
        code: 'CREATE_ERROR'
      });
    }
  }
);

/**
 * PUT /api/reservists/:id
 * Update a reservist's information
 */
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  [
    body('first_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('last_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('rank').optional().trim(),
    body('date_of_birth').optional().isISO8601(),
    body('sex').optional().isIn(['Male', 'Female', 'Other']),
    body('blood_type').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']),
    body('phone_number').optional().trim(),
    body('reserve_status').optional().isIn(['Ready Reserve', 'Standby Reserve', 'Retired'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { id } = req.params;

      // Fetch current reservist
      const [current] = await db.execute(
        'SELECT * FROM reservists WHERE id = ?',
        [id]
      );

      if (current.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Reservist not found',
          code: 'NOT_FOUND'
        });
      }

      // Prepare update fields
      const updateFields = {};
      const allowedFields = [
        'first_name', 'last_name', 'rank', 'date_of_birth', 'sex',
        'blood_type', 'phone_number', 'reserve_status', 'address',
        'place_of_birth', 'civil_status', 'citizenship', 'height', 'weight',
        'reserve_center', 'category', 'date_enlisted', 'source_of_commission',
        'rank_date_appointment', 'specialization',
        'highest_education', 'course_degree', 'school', 'year_graduated',
        'occupation', 'employer', 'office_address',
        'basic_training_completed', 'basic_training_date',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_address'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateFields[field] = req.body[field];
        }
      });

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No fields to update',
          code: 'NO_UPDATES'
        });
      }

      // Update reservist
      const updateColumns = Object.keys(updateFields).map(col => `${col} = ?`).join(',');
      const values = [...Object.values(updateFields), id];

      await db.execute(
        `UPDATE reservists SET ${updateColumns} WHERE id = ?`,
        values
      );

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'reservist.updated',
        entity_type: 'reservist',
        entity_id: id,
        old_values: current[0],
        new_values: updateFields,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      // Fetch updated reservist
      const [updated] = await db.execute(
        'SELECT r.*, u.email FROM reservists r JOIN users u ON r.user_id = u.id WHERE r.id = ?',
        [id]
      );

      res.json({
        status: 'success',
        message: 'Reservist updated successfully',
        data: updated[0]
      });
    } catch (error) {
      console.error('Error updating reservist:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update reservist',
        code: 'UPDATE_ERROR'
      });
    }
  }
);

/**
 * DELETE /api/reservists/:id
 * Soft delete - deactivate a reservist
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [current] = await db.execute(
      'SELECT * FROM reservists WHERE id = ?',
      [id]
    );

    if (current.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist not found',
        code: 'NOT_FOUND'
      });
    }

    // Soft delete by setting is_active to false
    await db.execute(
      'UPDATE reservists SET is_active = FALSE WHERE id = ?',
      [id]
    );

    // Also deactivate associated user
    const [reservist] = current;
    await db.execute(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [reservist.user_id]
    );

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'reservist.deleted',
      entity_type: 'reservist',
      entity_id: id,
      old_values: { is_active: true },
      new_values: { is_active: false },
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    res.json({
      status: 'success',
      message: 'Reservist deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting reservist:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete reservist',
      code: 'DELETE_ERROR'
    });
  }
});

/**
 * GET /api/reservists/:id/assignments
 * Get assignment history for a reservist
 */
router.get('/:id/assignments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization: admin or own record
    if (req.user.role === 'reservist' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if reservist exists
    const [reservist] = await db.execute(
      'SELECT id FROM reservists WHERE id = ?',
      [id]
    );

    if (reservist.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist not found',
        code: 'NOT_FOUND'
      });
    }

    const query = `
      SELECT 
        ra.id, ra.group_id, ra.squadron_id, ra.assigned_date, ra.is_primary,
        g.name as group_name, g.code as group_code,
        s.squadron_name, s.location
      FROM reservist_assignments ra
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      LEFT JOIN squadron s ON ra.squadron_id = s.id
      WHERE ra.reservist_id = ?
      ORDER BY ra.assigned_date DESC
    `;

    const [assignments] = await db.execute(query, [id]);

    res.json({
      status: 'success',
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch assignments',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /api/reservists/:id/assign
 * Assign reservist to a Group and City
 */
router.post(
  '/:id/assign',
  authenticateToken,
  requireAdmin,
  [
    body('group_id').isInt(),
    body('squadron_id').isInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { id } = req.params;
      const { group_id, squadron_id } = req.body;

      // Check if reservist exists
      const [reservist] = await db.execute(
        'SELECT id FROM reservists WHERE id = ?',
        [id]
      );

      if (reservist.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Reservist not found',
          code: 'NOT_FOUND'
        });
      }

      // Validate group and squadron
      const [groupData] = await db.execute(
        'SELECT id FROM `groups` WHERE id = ? AND is_active = TRUE',
        [group_id]
      );
      const [squadronData] = await db.execute(
        'SELECT id FROM squadron WHERE id = ? AND is_active = TRUE',
        [squadron_id]
      );

      if (groupData.length === 0 || squadronData.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid group or squadron',
          code: 'INVALID_ASSIGNMENT'
        });
      }

      // Check if squadron belongs to group
      const [squadronCheck] = await db.execute(
        'SELECT id FROM squadron WHERE id = ? AND group_id = ?',
        [squadron_id, group_id]
      );

      if (squadronCheck.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Squadron does not belong to the specified group',
          code: 'INVALID_ASSIGNMENT'
        });
      }

      // Check if already assigned (primary)
      const [existing] = await db.execute(
        'SELECT id FROM reservist_assignments WHERE reservist_id = ? AND group_id = ? AND squadron_id = ? AND is_primary = TRUE',
        [id, group_id, squadron_id]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Reservist already assigned to this group and squadron',
          code: 'DUPLICATE_ASSIGNMENT'
        });
      }

      // Update primary assignment (set others to non-primary)
      await db.execute(
        'UPDATE reservist_assignments SET is_primary = FALSE WHERE reservist_id = ? AND is_primary = TRUE',
        [id]
      );

      // Create new assignment
      const [result] = await db.execute(
        'INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary) VALUES (?, ?, ?, CURDATE(), TRUE)',
        [id, group_id, squadron_id]
      );

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'reservist.assigned',
        entity_type: 'assignment',
        entity_id: result.insertId,
        new_values: { reservist_id: id, group_id, squadron_id },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        status: 'success',
        message: 'Reservist assigned successfully',
        data: {
          assignment_id: result.insertId,
          reservist_id: id,
          group_id,
          squadron_id
        }
      });
    } catch (error) {
      console.error('Error assigning reservist:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to assign reservist',
        code: 'ASSIGNMENT_ERROR'
      });
    }
  }
);

/**
 * POST /api/reservists/:id/reset-password
 * Admin reset password functionality
 */
router.post(
  '/:id/reset-password',
  authenticateToken,
  requireAdmin,
  [
    body('new_password').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { id } = req.params;
      const { new_password } = req.body;

      // Get reservist and associated user
      const [reservist] = await db.execute(
        'SELECT user_id FROM reservists WHERE id = ?',
        [id]
      );

      if (reservist.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Reservist not found',
          code: 'NOT_FOUND'
        });
      }

      const userId = reservist[0].user_id;

      // Hash new password
      const hashedPassword = await hashPassword(new_password);

      // Update password
      await db.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [hashedPassword, userId]
      );

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'user.password_reset',
        entity_type: 'user',
        entity_id: userId,
        new_values: { password_reset: true },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      res.json({
        status: 'success',
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to reset password',
        code: 'RESET_ERROR'
      });
    }
  }
);

/**
 * GET /api/reservists/export
 * Export reservists data as CSV/JSON
 */
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format = 'csv', group_id, squadron_id } = req.query;

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid export format. Use csv or json',
        code: 'INVALID_FORMAT'
      });
    }

    let query = `
      SELECT 
        r.id, r.first_name, r.last_name, r.rank, r.service_number,
        r.date_of_birth, r.sex, r.phone_number, r.reserve_status,
        r.is_active, r.created_at,
        u.email,
        g.name as group_name, s.squadron_name
      FROM reservists r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      LEFT JOIN squadron s ON ra.squadron_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (group_id) {
      query += ' AND ra.group_id = ?';
      params.push(group_id);
    }

    if (squadron_id) {
      query += ' AND ra.squadron_id = ?';
      params.push(squadron_id);
    }

    query += ' ORDER BY r.last_name, r.first_name';

    const [rows] = await db.execute(query, params);

    if (format === 'json') {
      res.json({
        status: 'success',
        data: rows,
        export_info: {
          total_records: rows.length,
          exported_at: new Date().toISOString()
        }
      });
    } else {
      // CSV format - simplified for now
      const csv = rows.map(row => 
        Object.values(row).join(',')
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reservists-export.csv');
      res.send(csv);

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'reservists.exported',
        entity_type: 'export',
        new_values: { format, count: rows.length },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });
    }
  } catch (error) {
    console.error('Error exporting reservists:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export reservists',
      code: 'EXPORT_ERROR'
    });
  }
});

/**
 * POST /api/reservists/import
 * Bulk import reservists from CSV/JSON
 */
router.post(
  '/import',
  authenticateToken,
  requireAdmin,
  [
    body('data').isArray(),
    body('format').isIn(['csv', 'json'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { data, format } = req.body;

      if (data.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No data provided for import',
          code: 'EMPTY_DATA'
        });
      }

      if (data.length > 1000) {
        return res.status(400).json({
          status: 'error',
          message: 'Import limited to 1000 records per request',
          code: 'LIMIT_EXCEEDED'
        });
      }

      const connection = await db.getConnection();
      let successCount = 0;
      let failureCount = 0;
      const errors_list = [];

      await connection.beginTransaction();

      try {
        for (let i = 0; i < data.length; i++) {
          const record = data[i];

          // Validate required fields
          if (!record.email || !record.first_name || !record.last_name || !record.rank || !record.service_number) {
            failureCount++;
            errors_list.push({
              row: i + 1,
              error: 'Missing required fields: email, first_name, last_name, rank, service_number'
            });
            continue;
          }

          // Check for duplicates
          const [existing] = await connection.execute(
            'SELECT id FROM users WHERE email = ? UNION SELECT r.user_id FROM reservists r WHERE r.service_number = ?',
            [record.email, record.service_number]
          );

          if (existing.length > 0) {
            failureCount++;
            errors_list.push({
              row: i + 1,
              error: `Duplicate: email or service number already exists`
            });
            continue;
          }

          try {
            // Generate temporary password
            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await hashPassword(tempPassword);

            // Create user
            const [userResult] = await connection.execute(
              'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, TRUE)',
              [email, hashedPassword, 'reservist']
            );

            // Create reservist
            const reservistData = {
              user_id: userResult.insertId,
              first_name: record.first_name,
              last_name: record.last_name,
              rank: record.rank,
              service_number: record.service_number,
              date_of_birth: record.date_of_birth || null,
              sex: record.sex || null,
              blood_type: record.blood_type || 'Unknown',
              phone_number: record.phone_number || null,
              reserve_status: record.reserve_status || 'Ready Reserve',
              is_active: true
            };

            const columns = Object.keys(reservistData);
            const values = Object.values(reservistData);
            const placeholders = columns.map(() => '?').join(',');

            const [reservistResult] = await connection.execute(
              `INSERT INTO reservists (${columns.join(',')}) VALUES (${placeholders})`,
              values
            );

            successCount++;
          } catch (error) {
            failureCount++;
            errors_list.push({
              row: i + 1,
              error: `Database error: ${error.message}`
            });
          }
        }

        await connection.commit();

        res.json({
          status: 'success',
          message: `Import completed. ${successCount} successful, ${failureCount} failed.`,
          data: {
            success_count: successCount,
            failure_count: failureCount,
            errors: errors_list
          }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error importing reservists:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to import reservists',
        code: 'IMPORT_ERROR'
      });
    }
  }
);

module.exports = router;