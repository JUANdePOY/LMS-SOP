const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /api/supplies
 * List all supplies with pagination and filtering
 */
router.get('/', authenticateToken, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().trim(),
    query('low_stock').optional().isBoolean()
], (req, res) => {
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

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const offset = (page - 1) * limit;
        const category = req.query.category;
        const lowStock = req.query.low_stock === 'true';
        const search = req.query.q;

        let query = 'SELECT * FROM supplies WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM supplies WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (category) {
            query += ' AND category = ?';
            countQuery += ' AND category = ?';
            queryParams.push(category);
            countParams.push(category);
        }

        if (lowStock) {
            query += ' AND quantity_available <= reorder_level';
            countQuery += ' AND quantity_available <= reorder_level';
        }

        if (search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            countQuery += ' AND (name LIKE ? OR description LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        db.query(countQuery, countParams, (countErr, countResults) => {
            if (countErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            const total = countResults[0].total;
            const totalPages = Math.ceil(total / limit);

            db.query(query, queryParams, (err, results) => {
                if (err) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR'
                    });
                }

                res.status(200).json({
                    status: 'success',
                    data: {
                        supplies: results,
                        pagination: {
                            currentPage: page,
                            totalPages,
                            totalItems: total,
                            itemsPerPage: limit
                        }
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * GET /api/supplies/low-stock
 * List items below reorder level
 */
router.get('/low-stock', authenticateToken, (req, res) => {
    try {
        const query = 'SELECT * FROM supplies WHERE quantity_available <= reorder_level ORDER BY quantity_available ASC';

        db.query(query, (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            res.status(200).json({
                status: 'success',
                data: {
                    supplies: results,
                    count: results.length
                }
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * GET /api/supplies/categories
 * Get all unique categories
 */
router.get('/categories', authenticateToken, (req, res) => {
    try {
        const query = 'SELECT DISTINCT category FROM supplies ORDER BY category ASC';

        db.query(query, (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            const categories = results.map(r => r.category);
            res.status(200).json({
                status: 'success',
                data: { categories }
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * GET /api/supplies/:id
 * Get single supply detail
 */
router.get('/:id', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid supply ID is required')
], (req, res) => {
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

        const supplyId = req.params.id;

        const query = 'SELECT * FROM supplies WHERE id = ?';

        db.query(query, [supplyId], (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!results || results.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Supply not found',
                    code: 'SUPPLY_NOT_FOUND'
                });
            }

            res.status(200).json({
                status: 'success',
                data: results[0]
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * POST /api/supplies
 * Create new supply item
 */
router.post('/', authenticateToken, authorize('admin'), [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('category').notEmpty().trim().withMessage('Category is required'),
    body('unit').notEmpty().trim().withMessage('Unit is required'),
    body('quantity_available').optional().isInt({ min: 0 }),
    body('reorder_level').optional().isInt({ min: 0 }),
    body('max_stock').optional().isInt({ min: 0 }),
    body('location').optional().trim(),
    body('supplier').optional().trim(),
    body('description').optional().trim()
], (req, res) => {
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

        const {
            name, category, unit, quantity_available = 0, reorder_level = 10,
            max_stock, location, supplier, description
        } = req.body;

        db.query('SELECT id FROM supplies WHERE name = ? AND category = ?', [name, category], (checkErr, checkResults) => {
            if (checkErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (checkResults && checkResults.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Supply with this name and category already exists',
                    code: 'SUPPLY_EXISTS'
                });
            }

            db.query(
                `INSERT INTO supplies 
                 (name, category, description, unit, quantity_available, reorder_level, max_stock, location, supplier) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, category, description || null, unit, quantity_available, reorder_level, max_stock || null, location || null, supplier || null],
                (err, results) => {
                    if (err) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to create supply',
                            code: 'DB_ERROR'
                        });
                    }

                logAudit({
                    user_id: req.user.userId,
                    action: 'supply.created',
                    entity_type: 'supply',
                    entity_id: results.insertId,
                    new_values: req.body
                });

                    res.status(201).json({
                        status: 'success',
                        message: 'Supply created successfully',
                        data: {
                            supplyId: results.insertId
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * PUT /api/supplies/:id
 * Update supply item
 */
router.put('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid supply ID is required'),
    body('name').optional().notEmpty().trim(),
    body('category').optional().notEmpty().trim(),
    body('unit').optional().notEmpty().trim(),
    body('quantity_available').optional().isInt({ min: 0 }),
    body('reorder_level').optional().isInt({ min: 0 }),
    body('max_stock').optional().isInt({ min: 0 }),
    body('location').optional().trim(),
    body('supplier').optional().trim(),
    body('description').optional().trim()
], (req, res) => {
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

        const supplyId = req.params.id;

        db.query('SELECT * FROM supplies WHERE id = ?', [supplyId], (checkErr, checkResults) => {
            if (checkErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!checkResults || checkResults.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Supply not found',
                    code: 'SUPPLY_NOT_FOUND'
                });
            }

            const oldValues = checkResults[0];
            const {
                name, category, unit, quantity_available, reorder_level,
                max_stock, location, supplier, description
            } = req.body;

            const updates = [];
            const params = [];

            if (name !== undefined) { updates.push('name = ?'); params.push(name); }
            if (category !== undefined) { updates.push('category = ?'); params.push(category); }
            if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
            if (quantity_available !== undefined) { updates.push('quantity_available = ?'); params.push(quantity_available); }
            if (reorder_level !== undefined) { updates.push('reorder_level = ?'); params.push(reorder_level); }
            if (max_stock !== undefined) { updates.push('max_stock = ?'); params.push(max_stock); }
            if (location !== undefined) { updates.push('location = ?'); params.push(location || null); }
            if (supplier !== undefined) { updates.push('supplier = ?'); params.push(supplier || null); }
            if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }

            if (updates.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No fields to update',
                    code: 'NO_UPDATE'
                });
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(supplyId);

            const query = `UPDATE supplies SET ${updates.join(', ')} WHERE id = ?`;

            db.query(query, params, (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to update supply',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'supply.updated',
                    entity_type: 'supply',
                    entity_id: supplyId,
                    old_values: oldValues,
                    new_values: req.body
                });

                res.status(200).json({
                    status: 'success',
                    message: 'Supply updated successfully'
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * POST /api/supplies/adjust-stock
 * Manual stock adjustment with reason logging
 */
router.post('/adjust-stock', authenticateToken, authorize('admin'), [
    body('supply_id').isInt({ min: 1 }).withMessage('Valid supply ID is required'),
    body('quantity_change').isInt().withMessage('Quantity change is required (positive or negative)'),
    body('reason').notEmpty().trim().withMessage('Reason for adjustment is required')
], (req, res) => {
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

        const { supply_id, quantity_change, reason } = req.body;

        db.query('SELECT * FROM supplies WHERE id = ?', [supply_id], (checkErr, checkResults) => {
            if (checkErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!checkResults || checkResults.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Supply not found',
                    code: 'SUPPLY_NOT_FOUND'
                });
            }

            const supply = checkResults[0];
            const newQuantity = supply.quantity_available + quantity_change;

            if (newQuantity < 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Adjustment would result in negative stock',
                    code: 'INVALID_STOCK_ADJUSTMENT'
                });
            }

            if (supply.max_stock && newQuantity > supply.max_stock) {
                return res.status(400).json({
                    status: 'error',
                    message: `Adjustment would exceed max stock (${supply.max_stock})`,
                    code: 'MAX_STOCK_EXCEEDED'
                });
            }

            db.query('UPDATE supplies SET quantity_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newQuantity, supply_id],
                (updateErr) => {
                    if (updateErr) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to adjust stock',
                            code: 'DB_ERROR'
                        });
                    }

                    logAudit({
                        user_id: req.user.userId,
                        action: 'supply.stock_adjusted',
                        entity_type: 'supply',
                        entity_id: supply_id,
                        old_values: { quantity_available: supply.quantity_available, reason },
                        new_values: { quantity_available: newQuantity, quantity_change, reason }
                    });

                    res.status(200).json({
                        status: 'success',
                        message: 'Stock adjusted successfully',
                        data: {
                            supply_id,
                            previous_quantity: supply.quantity_available,
                            new_quantity: newQuantity,
                            change: quantity_change
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * DELETE /api/supplies/:id
 * Delete supply item
 */
router.delete('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid supply ID is required')
], (req, res) => {
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

        const supplyId = req.params.id;

        db.query('SELECT * FROM supplies WHERE id = ?', [supplyId], (checkErr, checkResults) => {
            if (checkErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!checkResults || checkResults.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Supply not found',
                    code: 'SUPPLY_NOT_FOUND'
                });
            }

            const oldValues = checkResults[0];

            db.query('SELECT COUNT(*) as count FROM supply_issuances WHERE supply_id = ? AND returned_date IS NULL', [supplyId], (issuanceErr, issuanceResults) => {
                if (issuanceErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR'
                    });
                }

                if (issuanceResults[0].count > 0) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Cannot delete supply with active issuances',
                        code: 'SUPPLY_IN_USE'
                    });
                }

                db.query('DELETE FROM supplies WHERE id = ?', [supplyId], (deleteErr) => {
                    if (deleteErr) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to delete supply',
                            code: 'DB_ERROR'
                        });
                    }

                    logAudit({
                        user_id: req.user.userId,
                        action: 'supply.deleted',
                        entity_type: 'supply',
                        entity_id: supplyId,
                        old_values: oldValues
                    });

                    res.status(200).json({
                        status: 'success',
                        message: 'Supply deleted successfully'
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

module.exports = router;
