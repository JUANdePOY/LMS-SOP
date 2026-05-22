const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/map/squadrons
 * Returns all squadrons with coordinates, reservist counts, and hierarchy info.
 * Optional ?area=Mindanao filter to scope to a specific region.
 */
router.get('/squadrons', [
  query('area').optional().isString(),
  query('active_only').optional().isBoolean().toBoolean()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { area, active_only } = req.query;
    const activeOnly = active_only === true || active_only === 'true';

    let whereClause = 'WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL';
    const params = [];

    if (activeOnly) {
      whereClause += ' AND s.is_active = TRUE';
    }

    if (area) {
      whereClause += ' AND ar.name = ?';
      params.push(area);
    }

    const [squadrons] = await db.query(`
      SELECT
        s.id,
        s.name,
        s.code,
        s.location,
        s.specialization,
        s.latitude,
        s.longitude,
        s.is_active,
        g.id as group_id,
        g.name as group_name,
        g.code as group_code,
        ar.id as arsen_id,
        ar.name as arsen_name,
        ar.location as arsen_location,
        COUNT(DISTINCT ra.reservist_id) as total_reservists
      FROM squadron s
      INNER JOIN \`groups\` g ON s.group_id = g.id
      INNER JOIN arsens ar ON g.arsen_id = ar.id
      LEFT JOIN reservist_assignments ra ON s.id = ra.squadron_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY ar.name ASC, g.name ASC, s.name ASC
    `, params);

    const result = squadrons.map(sq => ({
      id: sq.id,
      name: sq.name,
      code: sq.code,
      location: sq.location,
      specialization: sq.specialization,
      latitude: parseFloat(sq.latitude),
      longitude: parseFloat(sq.longitude),
      is_active: sq.is_active,
      total_reservists: sq.total_reservists || 0,
      group: {
        id: sq.group_id,
        name: sq.group_name,
        code: sq.group_code
      },
      arsen: {
        id: sq.arsen_id,
        name: sq.arsen_name,
        location: sq.arsen_location
      }
    }));

    res.json({
      status: 'success',
      data: result,
      meta: {
        total: result.length,
        area: area || 'all'
      }
    });
  } catch (error) {
    console.error('Error fetching map squadrons:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/map/summary
 * Returns summary stats grouped by arsen for map overview.
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const [arsenSummaries] = await db.query(`
      SELECT
        ar.id,
        ar.name,
        ar.code,
        ar.location,
        COUNT(DISTINCT s.id) as total_squadrons,
        COUNT(DISTINCT ra.reservist_id) as total_reservists,
        AVG(s.latitude) as center_lat,
        AVG(s.longitude) as center_lng
      FROM arsens ar
      INNER JOIN \`groups\` g ON ar.id = g.arsen_id
      INNER JOIN squadron s ON g.id = s.group_id AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
      LEFT JOIN reservist_assignments ra ON s.id = ra.squadron_id
      WHERE ar.is_active = TRUE
      GROUP BY ar.id
      ORDER BY ar.name ASC
    `);

    const result = arsenSummaries.map(a => ({
      id: a.id,
      name: a.name,
      code: a.code,
      location: a.location,
      total_squadrons: a.total_squadrons,
      total_reservists: a.total_reservists || 0,
      center: {
        lat: parseFloat(a.center_lat),
        lng: parseFloat(a.center_lng)
      }
    }));

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error fetching map summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
