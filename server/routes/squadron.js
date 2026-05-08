const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const db = require('../config/database');

// Validation middleware
const validateSquadron = [
  body('group_id').isInt({ min: 1 }).withMessage('Group ID must be a positive integer'),
  body('squadron_name').trim().notEmpty().withMessage('Squadron name is required').isLength({ max: 200 }),
  body('location').trim().notEmpty().withMessage('Location is required').isLength({ max: 100 })
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
];

// GET /api/squadron - List squadrons with pagination and filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('group_id').optional().isInt({ min: 1 }).toInt(),
  query('is_active').optional().isBoolean().toBoolean(),
  query('search').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;
    const { group_id, is_active, search } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (group_id) {
      whereConditions.push('s.group_id = ?');
      queryParams.push(group_id);
    }

    if (is_active !== undefined) {
      whereConditions.push('s.is_active = ?');
      queryParams.push(is_active);
    }

    if (search) {
      whereConditions.push('(s.squadron_name LIKE ? OR s.location LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) as total FROM squadron s ${whereClause}`;
    const [countResult] = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    const dataQuery = `
      SELECT s.*, g.name as group_name, a.name as arsen_name
      FROM squadron s
      LEFT JOIN \`groups\` g ON s.group_id = g.id
      LEFT JOIN arsens a ON g.arsen_id = a.id
      ${whereClause}
      ORDER BY s.squadron_name
      LIMIT ? OFFSET ?
    `;
    
    const [squadrons] = await db.query(dataQuery, [...queryParams, limit, offset]);

    res.json({
      data: squadrons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching squadrons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/squadron/:id - Get single squadron
router.get('/:id', validateId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const [squadrons] = await db.query(
      `SELECT s.*, g.name as group_name, a.name as arsen_name
       FROM squadron s
       LEFT JOIN \`groups\` g ON s.group_id = g.id
       LEFT JOIN arsens a ON g.arsen_id = a.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (squadrons.length === 0) {
      return res.status(404).json({ error: 'Squadron not found' });
    }

    res.json(squadrons[0]);
  } catch (error) {
    console.error('Error fetching squadron:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/squadron - Create new squadron
router.post('/', validateSquadron, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { group_id, squadron_name, location } = req.body;

    const [result] = await db.query(
      'INSERT INTO squadron (group_id, squadron_name, location) VALUES (?, ?, ?)',
      [group_id, squadron_name, location]
    );

    const [newSquadron] = await db.query('SELECT * FROM squadron WHERE id = ?', [result.insertId]);
    res.status(201).json(newSquadron[0]);
  } catch (error) {
    console.error('Error creating squadron:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/squadron/:id - Update squadron
router.put('/:id', [...validateId, ...validateSquadron], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { group_id, squadron_name, location } = req.body;

    const [result] = await db.query(
      'UPDATE squadron SET group_id = ?, squadron_name = ?, location = ? WHERE id = ?',
      [group_id, squadron_name, location, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Squadron not found' });
    }

    const [updatedSquadron] = await db.query('SELECT * FROM squadron WHERE id = ?', [req.params.id]);
    res.json(updatedSquadron[0]);
  } catch (error) {
    console.error('Error updating squadron:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/squadron/:id - Soft delete squadron
router.delete('/:id', validateId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const [result] = await db.query(
      'UPDATE squadron SET is_active = FALSE WHERE id = ? AND is_active = TRUE',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Squadron not found or already inactive' });
    }

    res.json({ message: 'Squadron deactivated successfully' });
  } catch (error) {
    console.error('Error deleting squadron:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
