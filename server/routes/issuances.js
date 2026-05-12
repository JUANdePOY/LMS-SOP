const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /api/issuances
 * List all issuances with filters
 */
router.get('/', authenticateToken, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('reservist_id').optional().isInt({ min: 1 }),
    query('supply_id').optional().isInt({ min: 1 }),
    query('overdue').optional().isBoolean()
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
        const reservistId = req.query.reservist_id;
        const supplyId = req.query.supply_id;
        const overdue = req.query.overdue === 'true';

        let query = `
            SELECT si.*, 
                   r.first_name, r.last_name, r.service_number, r.rank,
                   s.name as supply_name, s.category, s.unit,
                   u.email as issued_by_email,
                   ru.email as received_by_email
            FROM supply_issuances si
            LEFT JOIN reservists r ON si.reservist_id = r.id
            LEFT JOIN supplies s ON si.supply_id = s.id
            LEFT JOIN users u ON si.issued_by = u.id
            LEFT JOIN users ru ON si.received_by = ru.id
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM supply_issuances si WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (reservistId) {
            query += ' AND si.reservist_id = ?';
            countQuery += ' AND si.reservist_id = ?';
            queryParams.push(reservistId);
            countParams.push(reservistId);
        }

        if (supplyId) {
            query += ' AND si.supply_id = ?';
            countQuery += ' AND si.supply_id = ?';
            queryParams.push(supplyId);
            countParams.push(supplyId);
        }

        if (overdue) {
            query += ' AND si.returned_date IS NULL AND si.due_return_date < CURRENT_DATE';
            countQuery += ' AND si.returned_date IS NULL AND si.due_return_date < CURRENT_DATE';
        }

        query += ' ORDER BY si.issued_date DESC LIMIT ? OFFSET ?';
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
                        issuances: results,
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
 * GET /api/issuances/overdue
 * List unreturned items past due date
 */
router.get('/overdue', authenticateToken, (req, res) => {
    try {
        const query = `
            SELECT si.*, 
                   r.first_name, r.last_name, r.service_number, r.phone_number,
                   s.name as supply_name, s.category, s.unit
            FROM supply_issuances si
            LEFT JOIN reservists r ON si.reservist_id = r.id
            LEFT JOIN supplies s ON si.supply_id = s.id
            WHERE si.returned_date IS NULL 
              AND si.due_return_date < CURRENT_DATE
            ORDER BY si.due_return_date ASC
        `;

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
                    issuances: results,
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
 * GET /api/issuances/reservist/:id
 * Get reservist's issued items
 */
router.get('/reservist/:id', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid reservist ID is required')
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

        const reservistId = req.params.id;

        if (req.user.role === 'reservist') {
            db.query('SELECT id FROM reservists WHERE user_id = ?', [req.user.userId], (checkErr, checkResults) => {
                if (checkErr || !checkResults || checkResults.length === 0 || checkResults[0].id != reservistId) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'Access denied. You can only view your own issuances.',
                        code: 'ACCESS_DENIED'
                    });
                }
            });
        }

        const query = `
            SELECT si.*, 
                   s.name as supply_name, s.category, s.unit,
                   u.email as issued_by_email
            FROM supply_issuances si
            LEFT JOIN supplies s ON si.supply_id = s.id
            LEFT JOIN users u ON si.issued_by = u.id
            WHERE si.reservist_id = ?
            ORDER BY si.issued_date DESC
        `;

        db.query(query, [reservistId], (err, results) => {
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
                    reservist_id: reservistId,
                    issuances: results
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
 * GET /api/issuances/:id
 * Get single issuance detail
 */
router.get('/:id', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid issuance ID is required')
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

        const issuanceId = req.params.id;

        const query = `
            SELECT si.*, 
                   r.first_name, r.last_name, r.service_number, r.rank,
                   s.name as supply_name, s.category, s.unit,
                   u.email as issued_by_email,
                   ru.email as received_by_email
            FROM supply_issuances si
            LEFT JOIN reservists r ON si.reservist_id = r.id
            LEFT JOIN supplies s ON si.supply_id = s.id
            LEFT JOIN users u ON si.issued_by = u.id
            LEFT JOIN users ru ON si.received_by = ru.id
            WHERE si.id = ?
        `;

        db.query(query, [issuanceId], (err, results) => {
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
                    message: 'Issuance not found',
                    code: 'ISSUANCE_NOT_FOUND'
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
 * POST /api/issuances
 * Issue supplies to reservist
 */
router.post('/', authenticateToken, authorize('admin'), [
    body('reservist_id').isInt({ min: 1 }).withMessage('Valid reservist ID is required'),
    body('supply_id').isInt({ min: 1 }).withMessage('Valid supply ID is required'),
    body('quantity_issued').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('due_return_date').isDate().withMessage('Valid due date is required'),
    body('condition_on_issue').optional().isIn(['new', 'good', 'fair', 'poor']),
    body('notes').optional().trim()
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
            reservist_id, supply_id, quantity_issued, due_return_date,
            condition_on_issue = 'good', notes
        } = req.body;

        db.query('SELECT id, is_active FROM reservists WHERE id = ?', [reservist_id], (reservistErr, reservistResults) => {
            if (reservistErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!reservistResults || reservistResults.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Reservist not found',
                    code: 'RESERVIST_NOT_FOUND'
                });
            }

            if (!reservistResults[0].is_active) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot issue supplies to inactive reservist',
                    code: 'RESERVIST_INACTIVE'
                });
            }

            db.query('SELECT * FROM supplies WHERE id = ?', [supply_id], (supplyErr, supplyResults) => {
                if (supplyErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR'
                    });
                }

                if (!supplyResults || supplyResults.length === 0) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Supply not found',
                        code: 'SUPPLY_NOT_FOUND'
                    });
                }

                const supply = supplyResults[0];

                if (quantity_issued > supply.quantity_available) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Insufficient stock. Available: ${supply.quantity_available}`,
                        code: 'INSUFFICIENT_STOCK'
                    });
                }

                const newQuantity = supply.quantity_available - quantity_issued;

                db.query(
                    `INSERT INTO supply_issuances 
                     (reservist_id, supply_id, quantity_issued, issued_date, due_return_date, 
                      condition_on_issue, issued_by, notes) 
                     VALUES (?, ?, ?, CURRENT_DATE, ?, ?, ?, ?)`,
                    [reservist_id, supply_id, quantity_issued, due_return_date, condition_on_issue, req.user.userId, notes || null],
                    (issuanceErr, issuanceResults) => {
                        if (issuanceErr) {
                            return res.status(500).json({
                                status: 'error',
                                message: 'Failed to create issuance record',
                                code: 'DB_ERROR'
                            });
                        }

                        db.query('UPDATE supplies SET quantity_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [newQuantity, supply_id],
                            (updateErr) => {
                                if (updateErr) {
                                    console.error('Failed to update supply quantity:', updateErr);
                                }
                            }
                        );

                        logAudit({
                            user_id: req.user.userId,
                            action: 'issuance.created',
                            entity_type: 'issuance',
                            entity_id: issuanceResults.insertId,
                            new_values: req.body
                        });

                        res.status(201).json({
                            status: 'success',
                            message: 'Supplies issued successfully',
                            data: {
                                issuanceId: issuanceResults.insertId,
                                quantity_issued,
                                remaining_stock: newQuantity
                            }
                        });
                    }
                );
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
 * PUT /api/issuances/:id
 * Update return status (return items)
 */
router.put('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid issuance ID is required'),
    body('returned_quantity').optional().isInt({ min: 1 }),
    body('condition_on_return').optional().isIn(['new', 'good', 'fair', 'poor', 'damaged']),
    body('notes').optional().trim()
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

        const issuanceId = req.params.id;
        const { returned_quantity, condition_on_return, notes } = req.body;

        db.query('SELECT * FROM supply_issuances WHERE id = ?', [issuanceId], (checkErr, checkResults) => {
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
                    message: 'Issuance not found',
                    code: 'ISSUANCE_NOT_FOUND'
                });
            }

            const issuance = checkResults[0];

            if (issuance.returned_date) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Items already returned',
                    code: 'ALREADY_RETURNED'
                });
            }

            const returnQty = returned_quantity || issuance.quantity_issued;

            if (returnQty > issuance.quantity_issued) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Returned quantity cannot exceed issued quantity',
                    code: 'INVALID_RETURN_QUANTITY'
                });
            }

            db.query('UPDATE supply_issuances SET returned_date = CURRENT_DATE, returned_quantity = ?, condition_on_return = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [returnQty, condition_on_return || null, notes || null, issuanceId],
                (updateErr) => {
                    if (updateErr) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to update issuance',
                            code: 'DB_ERROR'
                        });
                    }

                    db.query('UPDATE supplies SET quantity_available = quantity_available + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [returnQty, issuance.supply_id],
                        (supplyErr) => {
                            if (supplyErr) {
                                console.error('Failed to update supply quantity:', supplyErr);
                            }
                        }
                    );

                    logAudit({
                        user_id: req.user.userId,
                        action: 'issuance.returned',
                        entity_type: 'issuance',
                        entity_id: issuanceId,
                        old_values: { returned_date: null, returned_quantity: null },
                        new_values: { returned_date: new Date().toISOString().split('T')[0], returned_quantity: returnQty }
                    });

                    res.status(200).json({
                        status: 'success',
                        message: 'Items returned successfully',
                        data: {
                            issuanceId,
                            returned_quantity: returnQty,
                            condition_on_return
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

module.exports = router;
