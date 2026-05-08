const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// Validation middleware
const validateArea = [
  body('name').trim().notEmpty().withMessage('Area name is required').isLength({ max: 200 }),
  body('code').trim().notEmpty().withMessage('Area code is required').isLength({ max: 50 }),
  body('parent_area_id').optional().isInt({ min: 1 }).withMessage('Parent area ID must be a positive integer'),
  body('description').optional().trim().isLength({ max: 5000 }),
  body('geographic_boundary').optional().custom((value) => {
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
      } catch {
        throw new Error('Invalid JSON for geographic_boundary');
      }
    } else if (typeof value === 'object') {
      // Already an object, that's fine
    }
    return true;
  })
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
];

// GET /api/areas - List areas with hierarchical structure, pagination, filtering, search
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('parent_id').optional().isInt({ min: 1 }).toInt(),
  query('is_active').optional().isBoolean().toBoolean(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('sort_by').optional().isIn(['name', 'code', 'created_at', 'updated_at']).trim(),
  query('hierarchical').optional().isBoolean().toBoolean()
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

    const page = req.query.page || 1;
    const limit = req.query.limit || 25;
    const offset = (page - 1) * limit;
    const { parent_id, is_active, search, sort_by, hierarchical } = req.query;
    const sortBy = sort_by || 'name';
    const isHierarchical = hierarchical === true || hierarchical === 'true';

    let whereConditions = [];
    let queryParams = [];

    if (parent_id !== undefined) {
      whereConditions.push('a.parent_area_id = ?');
      queryParams.push(parent_id);
    }

    if (is_active !== undefined) {
      whereConditions.push('a.is_active = ?');
      queryParams.push(is_active);
    }

    if (search) {
      whereConditions.push('(a.code LIKE ? OR a.name LIKE ? OR a.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM areas a ${whereClause}`;
    const [countResult] = await db.execute(countQuery, queryParams);
    const total = countResult[0].total;

    // Get areas with children count
    const dataQuery = `
      SELECT
        a.id,
        a.parent_area_id,
        a.name,
        a.code,
        a.description,
        a.geographic_boundary,
        a.is_active,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT child.id) as children_count,
        parent.name as parent_name,
        parent.code as parent_code
      FROM areas a
      LEFT JOIN areas child ON a.id = child.parent_area_id AND child.is_active = TRUE
      LEFT JOIN areas parent ON a.parent_area_id = parent.id
      ${whereClause}
      GROUP BY a.id
      ORDER BY a.${sortBy} ASC
      LIMIT ? OFFSET ?
    `;

    const [areas] = await db.execute(dataQuery, [...queryParams, limit, offset]);

    // Parse geographic_boundary JSON if present
    const parsedAreas = areas.map(area => ({
      ...area,
      geographic_boundary: area.geographic_boundary ? JSON.parse(area.geographic_boundary) : null
    }));

    // If hierarchical mode requested, restructure data
    let responseData = parsedAreas;
    if (isHierarchical && !parent_id) {
      responseData = buildHierarchy(parsedAreas);
    }

    res.json({
      status: 'success',
      data: responseData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/areas/:id - Get single area details with children count
router.get('/:id', validateId, authenticateToken, async (req, res) => {
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

    const [areas] = await db.execute(`
      SELECT
        a.id,
        a.parent_area_id,
        a.name,
        a.code,
        a.description,
        a.geographic_boundary,
        a.is_active,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT child.id) as children_count,
        parent.name as parent_name,
        parent.code as parent_code
      FROM areas a
      LEFT JOIN areas child ON a.id = child.parent_area_id AND child.is_active = TRUE
      LEFT JOIN areas parent ON a.parent_area_id = parent.id
      WHERE a.id = ?
      GROUP BY a.id
    `, [req.params.id]);

    if (areas.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Area not found',
        code: 'NOT_FOUND'
      });
    }

    const area = areas[0];
    if (area.geographic_boundary) {
      area.geographic_boundary = JSON.parse(area.geographic_boundary);
    }

    res.json({
      status: 'success',
      data: area
    });
  } catch (error) {
    console.error('Error fetching area:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/areas - Create new area (admin only)
router.post('/', validateArea, authenticateToken, requireAdmin, async (req, res) => {
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

    const { name, code, parent_area_id, description, geographic_boundary } = req.body;

    // Verify code is unique
    const [existingArea] = await db.execute(
      'SELECT id FROM areas WHERE code = ?',
      [code]
    );

    if (existingArea.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Area code already exists',
        code: 'DUPLICATE_CODE'
      });
    }

    // Verify parent area exists if provided
    if (parent_area_id) {
      const [parentArea] = await db.execute(
        'SELECT id FROM areas WHERE id = ?',
        [parent_area_id]
      );

      if (parentArea.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Parent area not found',
          code: 'PARENT_AREA_NOT_FOUND'
        });
      }
    }

    // Check for circular reference (prevent parent from being a descendant of this area)
    if (parent_area_id) {
      const [circularCheck] = await db.execute(`
        WITH RECURSIVE area_tree AS (
          SELECT id, parent_area_id FROM areas WHERE id = ?
          UNION ALL
          SELECT a.id, a.parent_area_id FROM areas a
          INNER JOIN area_tree ON a.id = area_tree.parent_area_id
        )
        SELECT COUNT(*) as count FROM area_tree WHERE id = ?
      `, [parent_area_id, parent_area_id]);

      if (circularCheck[0].count > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Circular reference detected: cannot set a parent area that would create a cycle',
          code: 'CIRCULAR_REFERENCE'
        });
      }
    }

    const geoBoundary = geographic_boundary ?
      (typeof geographic_boundary === 'string' ? geographic_boundary : JSON.stringify(geographic_boundary))
      : null;

    const [result] = await db.execute(
      'INSERT INTO areas (parent_area_id, name, code, description, geographic_boundary) VALUES (?, ?, ?, ?, ?)',
      [parent_area_id || null, name, code, description || null, geoBoundary]
    );

    const [newArea] = await db.execute(`
      SELECT
        a.id,
        a.parent_area_id,
        a.name,
        a.code,
        a.description,
        a.geographic_boundary,
        a.is_active,
        a.created_at,
        a.updated_at,
        parent.name as parent_name,
        parent.code as parent_code
      FROM areas a
      LEFT JOIN areas parent ON a.parent_area_id = parent.id
      WHERE a.id = ?
    `, [result.insertId]);

    const areaData = newArea[0];
    if (areaData.geographic_boundary) {
      areaData.geographic_boundary = JSON.parse(areaData.geographic_boundary);
    }

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'area.created',
      entity_type: 'area',
      entity_id: result.insertId,
      new_values: areaData,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      status: 'success',
      data: areaData
    });
  } catch (error) {
    console.error('Error creating area:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/areas/:id - Update area (admin only)
router.put('/:id', [...validateId, ...validateArea], authenticateToken, requireAdmin, async (req, res) => {
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

    const { name, code, parent_area_id, description, geographic_boundary } = req.body;

    // Get current area for audit
    const [currentArea] = await db.execute('SELECT * FROM areas WHERE id = ?', [req.params.id]);

    if (currentArea.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Area not found',
        code: 'NOT_FOUND'
      });
    }

    // Verify code is unique (excluding current record)
    const [duplicateCode] = await db.execute(
      'SELECT id FROM areas WHERE code = ? AND id != ?',
      [code, req.params.id]
    );

    if (duplicateCode.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Area code already exists',
        code: 'DUPLICATE_CODE'
      });
    }

    // Verify parent area exists if provided and different
    if (parent_area_id && parent_area_id !== currentArea[0].parent_area_id) {
      const [parentArea] = await db.execute(
        'SELECT id FROM areas WHERE id = ?',
        [parent_area_id]
      );

      if (parentArea.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Parent area not found',
          code: 'PARENT_AREA_NOT_FOUND'
        });
      }

      // Check for circular reference
      const [circularCheck] = await db.execute(`
        WITH RECURSIVE area_tree AS (
          SELECT id, parent_area_id FROM areas WHERE id = ?
          UNION ALL
          SELECT a.id, a.parent_area_id FROM areas a
          INNER JOIN area_tree ON a.id = area_tree.parent_area_id
        )
        SELECT COUNT(*) as count FROM area_tree WHERE id = ?
      `, [parent_area_id, req.params.id]);

      if (circularCheck[0].count > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Circular reference detected: cannot set a parent area that would create a cycle',
          code: 'CIRCULAR_REFERENCE'
        });
      }
    }

    const geoBoundary = geographic_boundary ?
      (typeof geographic_boundary === 'string' ? geographic_boundary : JSON.stringify(geographic_boundary))
      : (currentArea[0].geographic_boundary);

    const [result] = await db.execute(
      'UPDATE areas SET parent_area_id = ?, name = ?, code = ?, description = ?, geographic_boundary = ? WHERE id = ?',
      [parent_area_id || null, name, code, description || null, geoBoundary, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Area not found',
        code: 'NOT_FOUND'
      });
    }

    const [updatedArea] = await db.execute(`
      SELECT
        a.id,
        a.parent_area_id,
        a.name,
        a.code,
        a.description,
        a.geographic_boundary,
        a.is_active,
        a.created_at,
        a.updated_at,
        parent.name as parent_name,
        parent.code as parent_code
      FROM areas a
      LEFT JOIN areas parent ON a.parent_area_id = parent.id
      WHERE a.id = ?
    `, [req.params.id]);

    const areaData = updatedArea[0];
    if (areaData.geographic_boundary) {
      areaData.geographic_boundary = JSON.parse(areaData.geographic_boundary);
    }

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'area.updated',
      entity_type: 'area',
      entity_id: req.params.id,
      old_values: currentArea[0],
      new_values: areaData,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      status: 'success',
      data: areaData
    });
  } catch (error) {
    console.error('Error updating area:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /api/areas/:id - Soft delete area (admin only) - check for children first
router.delete('/:id', validateId, authenticateToken, requireAdmin, async (req, res) => {
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

    // Get current area for audit
    const [currentArea] = await db.execute(
      'SELECT * FROM areas WHERE id = ? AND is_active = TRUE',
      [req.params.id]
    );

    if (currentArea.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Area not found or already inactive',
        code: 'NOT_FOUND'
      });
    }

    // Check if area has active children
    const [activeChildren] = await db.execute(
      'SELECT COUNT(*) as count FROM areas WHERE parent_area_id = ? AND is_active = TRUE',
      [req.params.id]
    );

    if (activeChildren[0].count > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete area with active child areas. Deactivate child areas first.',
        code: 'HAS_ACTIVE_CHILDREN',
        children_count: activeChildren[0].count
      });
    }

    const [result] = await db.execute(
      'UPDATE areas SET is_active = FALSE WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Area not found',
        code: 'NOT_FOUND'
      });
    }

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'area.deleted',
      entity_type: 'area',
      entity_id: req.params.id,
      old_values: currentArea[0],
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      status: 'success',
      message: 'Area deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting area:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/areas/:id/descendants - Get subtree of descendants
router.get('/:id/descendants', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  query('depth').optional().isInt({ min: 1 }).toInt(),
  query('include_inactive').optional().isBoolean().toBoolean()
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

    const { depth, include_inactive } = req.query;
    const maxDepth = depth || 100; // Default unlimited depth
    const includeInactive = include_inactive === true || include_inactive === 'true';

    // Verify parent area exists
    const [parentArea] = await db.execute(
      'SELECT id, name, code FROM areas WHERE id = ?',
      [req.params.id]
    );

    if (parentArea.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Area not found',
        code: 'NOT_FOUND'
      });
    }

    // Get all descendants using recursive CTE
    const activeCondition = includeInactive ? '' : 'AND a.is_active = TRUE';
    const [descendants] = await db.execute(`
      WITH RECURSIVE area_tree AS (
        SELECT
          a.id,
          a.parent_area_id,
          a.name,
          a.code,
          a.description,
          a.geographic_boundary,
          a.is_active,
          a.created_at,
          a.updated_at,
          0 as depth
        FROM areas a
        WHERE a.parent_area_id = ? ${activeCondition}

        UNION ALL

        SELECT
          a.id,
          a.parent_area_id,
          a.name,
          a.code,
          a.description,
          a.geographic_boundary,
          a.is_active,
          a.created_at,
          a.updated_at,
          at.depth + 1
        FROM areas a
        INNER JOIN area_tree at ON a.parent_area_id = at.id
        WHERE at.depth < ? ${activeCondition}
      )
      SELECT * FROM area_tree
      ORDER BY depth, name
    `, [req.params.id, maxDepth]);

    // Parse geographic_boundary JSON
    const parsedDescendants = descendants.map(area => ({
      ...area,
      geographic_boundary: area.geographic_boundary ? JSON.parse(area.geographic_boundary) : null
    }));

    // Restructure into hierarchy
    const tree = buildTreeFromFlat(parsedDescendants);

    res.json({
      status: 'success',
      data: {
        root: parentArea[0],
        descendants: tree,
        total_count: descendants.length
      }
    });
  } catch (error) {
    console.error('Error fetching descendants:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Build a hierarchical tree from flat area list
 * @param {Array} areas - Flat array of area objects
 * @returns {Array} Hierarchical tree structure
 */
function buildHierarchy(areas) {
  const map = {};
  const roots = [];

  // Create a map of areas by id
  areas.forEach(area => {
    map[area.id] = { ...area, children: [] };
  });

  // Build parent-child relationships
  areas.forEach(area => {
    if (area.parent_area_id && map[area.parent_area_id]) {
      map[area.parent_area_id].children.push(map[area.id]);
    } else if (!area.parent_area_id) {
      roots.push(map[area.id]);
    }
  });

  return roots;
}

/**
 * Build tree structure from flat descendants list
 * @param {Array} descendants - Flat array of descendants
 * @returns {Array} Hierarchical tree structure
 */
function buildTreeFromFlat(descendants) {
  const map = {};
  const roots = [];

  descendants.forEach(area => {
    map[area.id] = { ...area, children: [] };
  });

  descendants.forEach(area => {
    const node = map[area.id];
    // Find parent in the descendants list
    const parentInList = descendants.find(a => a.id === area.parent_area_id);
    if (parentInList && map[area.parent_area_id]) {
      map[area.parent_area_id].children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

module.exports = router;