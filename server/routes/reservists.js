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
    if (filters.status === 'active') {
      conditions.push('r.is_active = ?');
      params.push(1);
    } else if (filters.status === 'inactive') {
      conditions.push('r.is_active = ?');
      params.push(0);
    } else if (filters.status === 'standby') {
      conditions.push('r.reserve_status = ?');
      params.push('Standby Reserve');
    }
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
    query('status').optional().isIn(['active', 'inactive', 'standby']),
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

const countQuery = `
         SELECT COUNT(DISTINCT r.id) as total
         FROM reservists r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id
         ${filter.whereClause}
       `;

       const [countResult] = await db.query(countQuery, filter.params);
       const total = countResult[0].total;

        // Fetch paginated records
const query = `
           SELECT 
             r.id, r.user_id, r.first_name, r.last_name, r.rank, 
             r.service_number, r.position, r.date_of_birth, r.place_of_birth,
             r.age, r.sex, r.civil_status, r.citizenship, r.height, r.weight,
             r.blood_type, r.phone_number, r.address,
             r.reserve_center, r.category, r.date_enlisted, r.source_of_commission,
             r.rank_date_appointment, r.specialization, r.reserve_status,
             r.highest_education, r.course_degree, r.school, r.year_graduated,
             r.occupation, r.employer, r.office_address,
             r.basic_training_completed, r.basic_training_date,
             r.emergency_contact_name, r.emergency_contact_phone, r.emergency_contact_address,
             r.is_active, r.created_at, r.updated_at,
             u.email,
             ra.id as assignment_id, ra.group_id, ra.squadron_id, 
             g.name as group_name, a.name as arcen_name,
             s.name as squadron_name, s.location as squadron_location
           FROM reservists r
          LEFT JOIN users u ON r.user_id = u.id
          LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
          LEFT JOIN \`groups\` g ON ra.group_id = g.id
          LEFT JOIN arsens a ON g.arsen_id = a.id
          LEFT JOIN squadron s ON ra.squadron_id = s.id
          ${filter.whereClause}
          ORDER BY r.${sortBy} ${sortOrder}
          LIMIT ? OFFSET ?
        `;

      const params = [...filter.params, limit, offset];
      const [rows] = await db.query(query, params);

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
        s.name as squadron_name, s.location
      FROM reservists r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      LEFT JOIN squadron s ON ra.squadron_id = s.id
      WHERE r.id = ?
    `;

    const [rows] = await db.query(query, [id]);

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
     body('squadron_id').optional().isInt(),
     body('position').optional().trim(),
     body('specialization').optional().trim()
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
        source_of_commission, rank_date_appointment, position, specialization,
        highest_education, course_degree, school, year_graduated,
        occupation, employer, office_address,
        basic_training_completed, basic_training_date,
        emergency_contact_name, emergency_contact_phone, emergency_contact_address,
        ...otherFields
      } = req.body;

// Check if email or service number already exists
      const [existing] = await db.query(
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
      let group_id_int = null;
      let squadron_id_int = null;
      
      if (group_id && squadron_id) {
        const hasGroupId = !isNaN(parseInt(group_id));
        const hasSquadronId = !isNaN(parseInt(squadron_id));
        
        if (!hasGroupId || !hasSquadronId) {
          return res.status(400).json({
            status: 'error',
            message: 'Both group_id and squadron_id must be valid integers',
            code: 'INVALID_ASSIGNMENT'
          });
        }
        
        group_id_int = parseInt(group_id);
        squadron_id_int = parseInt(squadron_id);

        const [groupData] = await db.query(
          'SELECT id FROM `groups` WHERE id = ? AND is_active = TRUE',
          [group_id_int]
        );
        const [squadronData] = await db.query(
          'SELECT id FROM squadron WHERE id = ? AND is_active = TRUE',
          [squadron_id_int]
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
           position: position || null,
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

        const columns = Object.keys(reservistData).map(col => `\`${col}\``);
        const values = Object.values(reservistData);
        const placeholders = columns.map(() => '?').join(',');

        const [reservistResult] = await connection.execute(
          `INSERT INTO reservists (${columns.join(',')}) VALUES (${placeholders})`,
          values
        );

        const reservistId = reservistResult.insertId;

        // Create assignment if provided
        if (group_id_int && squadron_id_int) {
          await connection.execute(
            'INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary) VALUES (?, ?, ?, CURDATE(), TRUE)',
            [reservistId, group_id_int, squadron_id_int]
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
        const [created] = await db.query(
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
      const [current] = await db.query(
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
        'rank_date_appointment', 'position', 'specialization',
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
      const updateColumns = Object.keys(updateFields).map(col => `\`${col}\` = ?`).join(',');
      const values = [...Object.values(updateFields), id];

      const updateQuery = `UPDATE reservists SET ${updateColumns} WHERE id = ?`;

      await db.query(updateQuery, values);

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
      const [updated] = await db.query(
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

    const [current] = await db.query(
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
    await db.query(
      'UPDATE reservists SET is_active = FALSE WHERE id = ?',
      [id]
    );

    // Also deactivate associated user
    const [reservist] = current;
    await db.query(
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
    const [reservist] = await db.query(
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
         s.name as squadron_name, s.location
       FROM reservist_assignments ra
       LEFT JOIN \`groups\` g ON ra.group_id = g.id
       LEFT JOIN squadron s ON ra.squadron_id = s.id
       WHERE ra.reservist_id = ?
       ORDER BY ra.assigned_date DESC
     `;

    const [assignments] = await db.query(query, [id]);

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
      const [reservist] = await db.query(
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
      const [groupData] = await db.query(
        'SELECT id FROM `groups` WHERE id = ? AND is_active = TRUE',
        [group_id]
      );
      const [squadronData] = await db.query(
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
      const [squadronCheck] = await db.query(
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
      const [existing] = await db.query(
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
      await db.query(
        'UPDATE reservist_assignments SET is_primary = FALSE WHERE reservist_id = ? AND is_primary = TRUE',
        [id]
      );

      // Create new assignment
      const [result] = await db.query(
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
      const [reservist] = await db.query(
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
      await db.query(
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
         r.position, r.date_of_birth, r.sex, r.phone_number, r.reserve_status,
         r.is_active, r.created_at,
         u.email,
         g.name as group_name, s.name as squadron_name
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

    const [rows] = await db.query(query, params);

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
               position: record.position || null,
               reserve_status: record.reserve_status || 'Ready Reserve',
               is_active: true
             };

            const columns = Object.keys(reservistData).map(col => `\`${col}\``);
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

/**
 * POST /api/reservists/bulk-upload
 * Bulk upload reservists from Excel file
 * First sheet: Group positions
 * Other sheets: Squadron positions
 */
const multer = require('multer');
const XLSX = require('xlsx');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

router.post(
  '/bulk-upload',
  authenticateToken,
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    let connection;
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file provided',
          code: 'NO_FILE'
        });
      }

      // Get and validate ARSEN ID
      const arsen_id = parseInt(req.body.arsen_id);
      if (!arsen_id || isNaN(arsen_id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid ARSEN ID is required',
          code: 'INVALID_ARSEN'
        });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Excel file has no sheets',
          code: 'INVALID_FILE'
        });
      }

      // Get database connection with transaction
      connection = await db.getConnection();
      await connection.beginTransaction();

      let successCount = 0;
      let failureCount = 0;
      const errors = [];
      let firstSheetGroupId = null;

// Process each sheet
       for (let sheetIndex = 0; sheetIndex < sheetNames.length; sheetIndex++) {
         const sheetName = sheetNames[sheetIndex];
         const worksheet = workbook.Sheets[sheetName];
         
          // Find the correct header row by looking for expected column names
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          let headerRowIndex = 0;
          for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (row && row.some(cell => 
              cell && typeof cell === 'string' && 
              (cell === 'DESCRIPTION/POSITION' || cell === 'GRADE' || cell === 'AFSC' || 
               cell === 'REQUIRED' || cell === 'NAME' || cell === 'Position' || cell === 'Name')
            )) {
              headerRowIndex = i;
              break;
            }
          }

          // Extract header names from the detected header row and build data rows manually
          const headers = rawRows[headerRowIndex] || [];
          const dataRows = rawRows.slice(headerRowIndex + 1);
          const rows = dataRows.map(row => {
            const obj = {};
            headers.forEach((key, idx) => {
              if (key != null) obj[key] = row[idx];
            });
            return obj;
          });

          // Skip empty sheets
          if (rows.length === 0) continue;

          let groupId = null;
          let squadronId = null;

// First sheet is the group level
          if (sheetIndex === 0) {
          // Extract group name from sheet name or use first row reference
          // Try to find or create the group
          const groupName = sheetName.trim();
          
          // Check if group exists
          const [existingGroups] = await connection.query(
            'SELECT id FROM `groups` WHERE name = ?',
            [groupName]
          );

          if (existingGroups.length > 0) {
            firstSheetGroupId = existingGroups[0].id;
            groupId = firstSheetGroupId;
          } else {
            // Create new group with the provided ARSEN ID
            const [result] = await connection.query(
              'INSERT INTO `groups` (arsen_id, code, name, is_active) VALUES (?, ?, ?, TRUE)',
              [arsen_id, groupName.substring(0, 50), groupName]
            );

            firstSheetGroupId = result.insertId;
            groupId = firstSheetGroupId;
          }
        } else {
          // Other sheets are squadrons
          const squadronName = sheetName.trim();
          groupId = firstSheetGroupId;

          // Check if squadron exists for this group
          const [existingSquadrons] = await connection.query(
            'SELECT id FROM squadron WHERE group_id = ? AND name = ?',
            [groupId, squadronName]
          );

          if (existingSquadrons.length > 0) {
            squadronId = existingSquadrons[0].id;
          } else {
            // Create new squadron
            const [result] = await connection.query(
              'INSERT INTO squadron (group_id, name, is_active) VALUES (?, ?, TRUE)',
              [groupId, squadronName]
            );
            squadronId = result.insertId;
          }
        }

        // Process each row in the sheet
        for (const row of rows) {
          try {
            const position = row['DESCRIPTION/POSITION'] || row['Position'] || '';
            const grade = row['GRADE'] || row['Grade'] || '';
            const afsc = row['AFSC'] || '';
            const required = row['REQUIRED'] || row['Required'] || '';
            const name = row['NAME'] || row['Name'] || '';

            // Skip rows with no name
            if (!name || name.trim() === '') continue;

            // Parse name - handle various formats:
            // "LTC RAUL A DECHOSA O-153218 PAF (GSC) (RES)"
            // "Sgt Angelyn J Bass MN-T21-024171 PAF(Res)"
            // Extract service number first (MN-XXXXX or O-XXXXX pattern)
            const serviceNumberMatch = name.match(/(MN-\w+|O-\w+)/);
            const serviceNumber = serviceNumberMatch ? serviceNumberMatch[1] : `${Date.now()}-${Math.random()}`;
            
            // Remove service number from name for parsing
            let cleanName = name.replace(/\s*(MN-\w+|O-\w+)\s*/i, '').trim();
            
            // Remove PAF(RES) or PAF (RES) suffix
            cleanName = cleanName.replace(/\s*PAF\s*\(.*?\)\s*$/i, '').trim();
            
            // Extract rank (first word if it's a known rank pattern)
            const rankPattern = /^(LTC|LTCOL|COL|CAPT|CPT|1LT|2LT|MSGT|SSGT|SGT|Sgt|Cpl|CPL|PVT|LTC|LTG|MAJ|MAJGEN|BGEN|GEN|A1C|AB|AIRMAN|ADO|AMN|ENS|LTJG|LT|LCDR|CDR|RADM|VADM|ADM|ADM|ADM)/i;
            const rankMatch = cleanName.match(rankPattern);
            const rank = rankMatch ? rankMatch[1] : grade || 'Unknown';
            
            // Remove rank from name
            let fullName = cleanName.replace(rankPattern, '').trim();
            
            // If no name left after removing rank, use the whole cleaned name
            if (!fullName) {
              fullName = cleanName;
            }

            // Split into first and last names
            const nameParts = fullName.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Unknown';
            const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'Unknown';

            // Check if reservist exists by service number
            const [existingReservists] = await connection.query(
              'SELECT id FROM reservists WHERE service_number = ?',
              [serviceNumber]
            );

            let reservistId;

if (existingReservists.length > 0) {
               // Update existing reservist
               reservistId = existingReservists[0].id;
               await connection.query(
                 'UPDATE reservists SET rank = ?, position = ? WHERE id = ?',
                 [rank, position, reservistId]
               );
             } else {
              // Create new reservist
              // First create a user account
              const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@pafr.mil`;
              const tempPassword = 'TempPassword123!';
              const passwordHash = await hashPassword(tempPassword);

              // Check if user exists
              const [existingUsers] = await connection.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
              );

              let userId;

              if (existingUsers.length > 0) {
                userId = existingUsers[0].id;
              } else {
                const [userResult] = await connection.query(
                  'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, TRUE)',
                  [email, passwordHash, 'reservist']
                );
                userId = userResult.insertId;
              }

// Create reservist
               const [reservistResult] = await connection.query(
                 `INSERT INTO reservists (
                   user_id, first_name, last_name, rank, service_number,
                   position, reserve_status, is_active
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
                 [userId, firstName, lastName, rank, serviceNumber, position, 'Ready Reserve']
               );

              reservistId = reservistResult.insertId;
            }

            // Create or update assignment
            const [existingAssignments] = await connection.query(
              'SELECT id FROM reservist_assignments WHERE reservist_id = ? AND group_id = ? AND squadron_id = ?',
              [reservistId, groupId, squadronId]
            );

            if (existingAssignments.length === 0) {
              // Set other assignments to non-primary
              await connection.query(
                'UPDATE reservist_assignments SET is_primary = FALSE WHERE reservist_id = ? AND is_primary = TRUE',
                [reservistId]
              );

              // Create new assignment
              await connection.query(
                `INSERT INTO reservist_assignments (
                  reservist_id, group_id, squadron_id, assigned_date, is_primary
                ) VALUES (?, ?, ?, CURDATE(), TRUE)`,
                [reservistId, groupId, squadronId]
              );
            }

            successCount++;
          } catch (error) {
            errors.push(`Row "${name}" in sheet "${sheetName}": ${error.message}`);
            failureCount++;
          }
        }
      }

      await connection.commit();

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'reservist.bulk_upload',
        entity_type: 'reservist',
        new_values: { successful: successCount, failed: failureCount },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      res.json({
        status: 'success',
        message: 'Bulk upload completed',
        data: {
          successful: successCount,
          failed: failureCount,
          total: successCount + failureCount,
          errors: errors
        }
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Rollback error:', rollbackError);
        }
      }

      console.error('Error in bulk upload:', error);
      res.status(500).json({
        status: 'error',
        message: 'Bulk upload failed: ' + error.message,
        code: 'BULK_UPLOAD_ERROR'
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

/**
 * POST /api/reservists/bulk-upload-info
 * Bulk upload reservists from Excel file with detailed personal & military info
 * Expected columns: Fullname, Rank, AFPSN (Serial Number), Date of Birth, Place of Birth,
 *   Age, Sex, Civil Status, Citizenship, Height, Weight, Blood Type, Home Address,
 *   Contact Number, Email Address, Branch of Service, Reserve Center, Group Command,
 *   Squadron, Category, Source of Commission/Enlistment, Rank Date of Appointment,
 *   Specialization/MOS, Status, Highest Educational Attainment, Course/Degree, School,
 *   Year Graduated, Occupation, Employer/Company, Office Address,
 *   Basic Training Completed, Date Completed, Other Military Courses/Training,
 *   AWARDS AND DECORATIONS, Emergency contact name, Relationship, Contact Number, Address
 */
router.post(
  '/bulk-upload-info',
  authenticateToken,
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    let connection;
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file provided',
          code: 'NO_FILE'
        });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Excel file has no sheets',
          code: 'INVALID_FILE'
        });
      }

      const bodyArsenId = req.body.arsen_id ? parseInt(req.body.arsen_id) : null;
      const bodyGroupId = req.body.group_id ? parseInt(req.body.group_id) : null;
      const bodySquadronId = req.body.squadron_id ? parseInt(req.body.squadron_id) : null;

      if (!bodyArsenId || isNaN(bodyArsenId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid ARSEN ID is required',
          code: 'INVALID_ARSEN'
        });
      }

      if (!bodyGroupId || isNaN(bodyGroupId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid Group ID is required',
          code: 'INVALID_GROUP'
        });
      }

      if (!bodySquadronId || isNaN(bodySquadronId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid Squadron ID is required',
          code: 'INVALID_SQUADRON'
        });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      for (let sheetIndex = 0; sheetIndex < sheetNames.length; sheetIndex++) {
        const sheetName = sheetNames[sheetIndex];
        const worksheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        let headerRowIndex = 0;
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (row && row.some(cell =>
            cell && typeof cell === 'string' &&
            (cell === 'Fullname' || cell === 'Rank' || cell === 'AFPSN (Serial Number)' ||
             cell === 'Email Address' || cell === 'Contact Number')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = rawRows[headerRowIndex] || [];
        const dataRows = rawRows.slice(headerRowIndex + 1);
        const rows = dataRows.map(row => {
          const obj = {};
          headers.forEach((key, idx) => {
            if (key != null) obj[key] = row[idx];
          });
          return obj;
        });

        if (rows.length === 0) continue;

        for (const row of rows) {
          try {
            const fullname = (row['Fullname'] || '').trim();
            const rank = (row['Rank'] || '').trim();
            const serviceNumber = (row['AFPSN (Serial Number)'] || '').trim();

            if (!fullname || fullname.length < 2) continue;

            const dateOfBirth = row['Date of Birth'] || null;
            const placeOfBirth = row['Place of Birth'] || null;
            const age = row['Age'] ? parseInt(row['Age'], 10) : null;
            const sex = row['Sex'] || null;
            const civilStatus = row['Civil Status'] || null;
            const citizenship = row['Citizenship'] || 'Filipino';
            const height = row['Height'] ? parseFloat(row['Height']) : null;
            const weight = row['Weight'] ? parseFloat(row['Weight']) : null;
            const bloodType = row['Blood Type'] || null;
            const homeAddress = row['Home Address'] || null;
            const contactNumber = row['Contact Number'] || null;
            const email = row['Email Address'] || null;
            const branchOfService = row['Branch of Service'] || null;
            const reserveCenter = row['Reserve Center'] || null;
            const groupCommand = row['Group Command'] || null;
            const squadron = row['Squadron'] || null;
            const category = row['Category (1st / 2nd / 3rd Category)'] || null;
            const sourceOfCommission = row['Source of Commission/Enlistment (ROTC/ BCMT/ MOTC/ Direct Commission)'] || null;
            const rankDateOfAppointment = row['Rank Date of Appointment'] || null;
            const specialization = row['Specialization/MOS'] || null;
            const reserveStatus = row['Status (Ready Reserve/ Standby Reserve/ Retired)'] || 'Ready Reserve';
            const highestEducation = row['Highest Educational Attainment'] || null;
            const courseDegree = row['Course/Degree'] || null;
            const school = row['School'] || null;
            const yearGraduated = row['Year Graduated'] ? parseInt(row['Year Graduated'], 10) : null;
            const occupation = row['Occupation'] || null;
            const employer = row['Employer/Company'] || null;
            const officeAddress = row['Office Address'] || null;
            const basicTraining = row['Basic Training Completed (BCMT/ROTC)'] || null;
            const dateCompleted = row['Date Completed'] || null;
            const otherTraining = row['Other Military Courses/Training'] || null;
            const awards = row['AWARDS AND DECORATIONS'] || null;
            const emergencyContactName = row['Emergency contact name'] || null;
            const emergencyRelationship = row['Relationship'] || null;
            const emergencyContactNumber = row['Contact Number'] || null;
            const emergencyAddress = row['Address'] || null;

            // Parse fullname into first and last name
            const nameParts = fullname.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Unknown';
            const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'Unknown';

            // Check if reservist exists by service number
            let reservistId;

            if (serviceNumber) {
              const [existingReservists] = await connection.query(
                'SELECT id FROM reservists WHERE service_number = ?',
                [serviceNumber]
              );

              if (existingReservists.length > 0) {
                reservistId = existingReservists[0].id;
                await connection.query(
                  `UPDATE reservists SET
                    first_name = ?, last_name = ?, rank = ?, date_of_birth = ?,
                    place_of_birth = ?, age = ?, sex = ?, civil_status = ?,
                    citizenship = ?, height = ?, weight = ?, blood_type = ?,
                    phone_number = ?, address = ?, reserve_center = ?, category = ?,
                    source_of_commission = ?, rank_date_appointment = ?, specialization = ?,
                    reserve_status = ?, highest_education = ?, course_degree = ?, school = ?,
                    year_graduated = ?, occupation = ?, employer = ?, office_address = ?,
                    basic_training_completed = ?, basic_training_date = ?,
                    emergency_contact_name = ?, emergency_contact_phone = ?,
                    emergency_contact_address = ?
                  WHERE id = ?`,
                  [
                    firstName, lastName, rank, dateOfBirth, placeOfBirth, age, sex,
                    civilStatus, citizenship, height, weight, bloodType, contactNumber,
                    homeAddress, reserveCenter, category, sourceOfCommission,
                    rankDateOfAppointment, specialization, reserveStatus, highestEducation,
                    courseDegree, school, yearGraduated, occupation, employer, officeAddress,
                    basicTraining, dateCompleted, emergencyContactName, emergencyContactNumber,
                    emergencyAddress, reservistId
                  ]
                );
              } else {
                // Create new reservist
                const userEmail = email || `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@pafr.mil`;
                const tempPassword = 'TempPassword123!';
                const passwordHash = await hashPassword(tempPassword);

                const [existingUsers] = await connection.query(
                  'SELECT id FROM users WHERE email = ?',
                  [userEmail]
                );

                let userId;
                if (existingUsers.length > 0) {
                  userId = existingUsers[0].id;
                } else {
                  const [userResult] = await connection.query(
                    'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, TRUE)',
                    [userEmail, passwordHash, 'reservist']
                  );
                  userId = userResult.insertId;
                }

                const [reservistResult] = await connection.query(
                  `INSERT INTO reservists (
                    user_id, first_name, last_name, rank, service_number, date_of_birth,
                    place_of_birth, age, sex, civil_status, citizenship, height, weight,
                    blood_type, phone_number, address, reserve_center, category,
                    source_of_commission, rank_date_appointment, specialization,
                    reserve_status, highest_education, course_degree, school, year_graduated,
                    occupation, employer, office_address, basic_training_completed,
                    basic_training_date, emergency_contact_name, emergency_contact_phone,
                    emergency_contact_address, is_active
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
                  [
                    userId, firstName, lastName, rank, serviceNumber || null, dateOfBirth,
                    placeOfBirth, age, sex, civilStatus, citizenship, height, weight,
                    bloodType, contactNumber, homeAddress, reserveCenter, category,
                    sourceOfCommission, rankDateOfAppointment, specialization,
                    reserveStatus, highestEducation, courseDegree, school, yearGraduated,
                    occupation, employer, officeAddress, basicTraining, dateCompleted,
                    emergencyContactName, emergencyContactNumber, emergencyAddress
                  ]
                );

                reservistId = reservistResult.insertId;
              }
            }

            // Create or update assignment
            if (bodyGroupId) {
                // Validate group belongs to the selected arsen
                const [groupCheck] = await connection.query(
                  'SELECT id FROM `groups` WHERE id = ? AND arsen_id = ?',
                  [bodyGroupId, bodyArsenId]
                );
                if (groupCheck.length === 0) {
                  errors.push(`Row "${fullname}": Selected group does not belong to the selected ARSEN`);
                  failureCount++;
                  continue;
                }

                // Validate squadron belongs to the selected group
                const [squadronCheck] = await connection.query(
                  'SELECT id FROM squadron WHERE id = ? AND group_id = ?',
                  [bodySquadronId, bodyGroupId]
                );
                if (squadronCheck.length === 0) {
                  errors.push(`Row "${fullname}": Selected squadron does not belong to the selected group`);
                  failureCount++;
                  continue;
                }

                const [existingAssignments] = await connection.query(
                  'SELECT id FROM reservist_assignments WHERE reservist_id = ? AND group_id = ? AND squadron_id = ?',
                  [reservistId, bodyGroupId, bodySquadronId]
                );

                if (existingAssignments.length === 0) {
                  await connection.query(
                    'UPDATE reservist_assignments SET is_primary = FALSE WHERE reservist_id = ? AND is_primary = TRUE',
                    [reservistId]
                  );

                  await connection.query(
                    `INSERT INTO reservist_assignments (
                      reservist_id, group_id, squadron_id, assigned_date, is_primary
                    ) VALUES (?, ?, ?, CURDATE(), TRUE)`,
                    [reservistId, bodyGroupId, bodySquadronId]
                  );
                }
              }

              successCount++;
          } catch (rowError) {
            errors.push(`Row "${row['Fullname'] || 'unknown'}" in sheet "${sheetName}": ${rowError.message}`);
            failureCount++;
          }
        }
      }

      await connection.commit();

      logAudit({
        user_id: req.user.id,
        action: 'reservist.bulk_upload_info',
        entity_type: 'reservist',
        new_values: { successful: successCount, failed: failureCount },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      res.json({
        status: 'success',
        message: 'Bulk upload completed',
        data: {
          successful: successCount,
          failed: failureCount,
          total: successCount + failureCount,
          errors: errors
        }
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Rollback error:', rollbackError);
        }
      }

      console.error('Error in bulk upload info:', error);
      res.status(500).json({
        status: 'error',
        message: 'Bulk upload failed: ' + error.message,
        code: 'BULK_UPLOAD_ERROR'
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

/**
 * GET /api/reservists/filters/metadata
 * Return distinct filter values from the database for dynamic filter dropdowns
 */
router.get('/filters/metadata', authenticateToken, async (req, res) => {
  try {
    const [rankRows] = await db.query(
      "SELECT DISTINCT `rank` FROM reservists WHERE `rank` IS NOT NULL AND `rank` != '' ORDER BY `rank`"
    );
    const [specRows] = await db.query(
      "SELECT DISTINCT specialization FROM reservists WHERE specialization IS NOT NULL AND specialization != '' ORDER BY specialization"
    );
    const [statusRows] = await db.query(
      "SELECT DISTINCT reserve_status FROM reservists WHERE reserve_status IS NOT NULL AND reserve_status != '' ORDER BY reserve_status"
    );
    const [arsenRows] = await db.query(
      'SELECT id, name FROM arsens WHERE is_active = TRUE ORDER BY name'
    );
    const [groupRows] = await db.query(
      'SELECT g.id, g.name, g.arsen_id, a.name as arsen_name FROM `groups` g JOIN arsens a ON g.arsen_id = a.id WHERE g.is_active = TRUE ORDER BY a.name, g.name'
    );
    const [squadronRows] = await db.query(
      'SELECT s.id, s.name, s.group_id, g.name as group_name, g.arsen_id, a.name as arsen_name FROM squadron s JOIN `groups` g ON s.group_id = g.id JOIN arsens a ON g.arsen_id = a.id WHERE s.is_active = TRUE ORDER BY a.name, g.name, s.name'
    );
    const [categoryRows] = await db.query(
      "SELECT DISTINCT category FROM reservists WHERE category IS NOT NULL AND category != '' ORDER BY category"
    );
    const [sourceRows] = await db.query(
      "SELECT DISTINCT source_of_commission FROM reservists WHERE source_of_commission IS NOT NULL AND source_of_commission != '' ORDER BY source_of_commission"
    );
    const [bloodTypeRows] = await db.query(
      "SELECT DISTINCT blood_type FROM reservists WHERE blood_type IS NOT NULL AND blood_type != 'Unknown' ORDER BY blood_type"
    );
    const [sexRows] = await db.query(
      "SELECT DISTINCT sex FROM reservists WHERE sex IS NOT NULL AND sex != '' ORDER BY sex"
    );
    const [civilStatusRows] = await db.query(
      "SELECT DISTINCT civil_status FROM reservists WHERE civil_status IS NOT NULL AND civil_status != '' ORDER BY civil_status"
    );

    res.json({
      status: 'success',
      data: {
        ranks: rankRows.map(r => r.rank),
        specializations: specRows.map(r => r.specialization),
        reserveStatuses: statusRows.map(r => r.reserve_status),
        categories: categoryRows.map(r => r.category),
        sourcesOfCommission: sourceRows.map(r => r.source_of_commission),
        bloodTypes: bloodTypeRows.map(r => r.blood_type),
        sexes: sexRows.map(r => r.sex),
        civilStatuses: civilStatusRows.map(r => r.civil_status),
        arsens: arsenRows.map(a => ({ id: a.id, name: a.name })),
        groups: groupRows.map(g => ({ id: g.id, name: g.name, arsen_id: g.arsen_id, arsen_name: g.arsen_name })),
        squadrons: squadronRows.map(s => ({ id: s.id, name: s.name, group_id: s.group_id, group_name: s.group_name, arsen_id: s.arsen_id, arsen_name: s.arsen_name })),
      }
    });
  } catch (error) {
    console.error('Error fetching filter metadata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch filter metadata',
      code: 'FETCH_ERROR'
    });
  }
});

module.exports = router;