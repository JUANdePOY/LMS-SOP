const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize, requireAdmin } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

const handleValidation = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: errors.array()
        });
        return false;
    }
    return true;
};

const dbError = (res, message = 'Database error') => {
    res.status(500).json({ status: 'error', message, code: 'DB_ERROR' });
};

/**
 * GET /api/issuances
 * List all issuances with filters
 */
router.get('/', authenticateToken, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('reservist_id').optional().isInt({ min: 1 }),
    query('supply_id').optional().isInt({ min: 1 }),
    query('overdue').optional().isBoolean(),
    query('issuance_type').optional().isIn(['issued', 'personal'])
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const offset = (page - 1) * limit;
        const reservistId = req.query.reservist_id;
        const supplyId = req.query.supply_id;
        const overdue = req.query.overdue === 'true';
        const issuanceType = req.query.issuance_type;

        let sql = `
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
        let countSql = 'SELECT COUNT(*) as total FROM supply_issuances si WHERE 1=1';
        const params = [];
        const countParams = [];

        if (reservistId) {
            sql += ' AND si.reservist_id = ?';
            countSql += ' AND si.reservist_id = ?';
            params.push(reservistId);
            countParams.push(reservistId);
        }

        if (supplyId) {
            sql += ' AND si.supply_id = ?';
            countSql += ' AND si.supply_id = ?';
            params.push(supplyId);
            countParams.push(supplyId);
        }

        if (overdue) {
            sql += ' AND si.returned_date IS NULL AND si.due_return_date < CURRENT_DATE';
            countSql += ' AND si.returned_date IS NULL AND si.due_return_date < CURRENT_DATE';
        }

        if (issuanceType) {
            sql += ' AND si.issuance_type = ?';
            countSql += ' AND si.issuance_type = ?';
            params.push(issuanceType);
            countParams.push(issuanceType);
        }

        sql += ' ORDER BY si.issued_date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [countResults] = await db.query(countSql, countParams);
        const total = countResults[0].total;
        const totalPages = Math.ceil(total / limit);

        const [results] = await db.query(sql, params);

        res.status(200).json({
            status: 'success',
            data: {
                issuances: results,
                pagination: { currentPage: page, totalPages, totalItems: total, itemsPerPage: limit }
            }
        });
    } catch (error) {
        dbError(res);
    }
});

/**
 * GET /api/issuances/overdue
 */
router.get('/overdue', authenticateToken, async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT si.*, 
                   r.first_name, r.last_name, r.service_number, r.phone_number,
                   s.name as supply_name, s.category, s.unit
            FROM supply_issuances si
            LEFT JOIN reservists r ON si.reservist_id = r.id
            LEFT JOIN supplies s ON si.supply_id = s.id
            WHERE si.returned_date IS NULL 
              AND si.due_return_date < CURRENT_DATE
            ORDER BY si.due_return_date ASC
        `);
        res.status(200).json({ status: 'success', data: { issuances: results, count: results.length } });
    } catch (error) {
        dbError(res);
    }
});

/**
 * GET /api/issuances/uniform-tracker
 * Get uniform issuance status by squadron/group with filters
 */
router.get('/uniform-tracker', authenticateToken, [
    query('squadron_id').optional().isInt({ min: 1 }),
    query('group_id').optional().isInt({ min: 1 }),
    query('supply_id').optional().isInt({ min: 1 }),
    query('issuance_type').optional().isIn(['issued', 'personal']),
    query('status').optional().isIn(['received', 'pending', 'all']),
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const { squadron_id, group_id, supply_id, issuance_type, status } = req.query;

        let sql = "SELECT r.id as reservist_id, r.first_name, r.last_name, r.service_number, r.rank, sr.squadron_id, sq.name as squadron_name, g.id as group_id, g.name as group_name, s.id as supply_id, s.name as supply_name, s.category, si.id as issuance_id, si.quantity_issued, si.issued_date, si.due_return_date, si.returned_date, si.issuance_type, si.condition_on_issue FROM reservists r LEFT JOIN reservist_assignments sr ON r.id = sr.reservist_id AND sr.is_primary = 1 LEFT JOIN squadron sq ON sr.squadron_id = sq.id LEFT JOIN `groups` g ON sr.group_id = g.id LEFT JOIN supply_issuances si ON r.id = si.reservist_id LEFT JOIN supplies s ON si.supply_id = s.id WHERE r.is_active = 1";

        const params = [];

        if (squadron_id) {
            sql += ' AND sr.squadron_id = ?';
            params.push(squadron_id);
        }

        if (group_id) {
            sql += ' AND sr.group_id = ?';
            params.push(group_id);
        }

        if (supply_id) {
            sql += ' AND si.supply_id = ?';
            params.push(supply_id);
        }

        if (issuance_type) {
            sql += ' AND si.issuance_type = ?';
            params.push(issuance_type);
        }

        if (status && status !== 'all') {
            if (status === 'received') {
                sql += ' AND si.returned_date IS NOT NULL';
            } else if (status === 'pending') {
                sql += ' AND si.returned_date IS NULL';
            }
        }

        sql += ' ORDER BY sq.name ASC, g.name ASC, r.last_name ASC, r.first_name ASC';

        const [results] = await db.query(sql, params);

        const grouped = {};
        results.forEach(row => {
            const key = `${row.squadron_id || 'unassigned'}-${row.group_id || 'unassigned'}`;
            if (!grouped[key]) {
                grouped[key] = {
                    squadron_id: row.squadron_id,
                    squadron_name: row.squadron_name,
                    group_id: row.group_id,
                    group_name: row.group_name,
                    reservists: {}
                };
            }
            const resid = row.reservist_id;
            if (!grouped[key].reservists[resid]) {
                grouped[key].reservists[resid] = {
                    id: resid,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    service_number: row.service_number,
                    rank: row.rank,
                    uniforms: []
                };
            }
            if (row.issuance_id) {
                grouped[key].reservists[resid].uniforms.push({
                    issuance_id: row.issuance_id,
                    supply_id: row.supply_id,
                    supply_name: row.supply_name,
                    category: row.category,
                    quantity_issued: row.quantity_issued,
                    issued_date: row.issued_date,
                    due_return_date: row.due_return_date,
                    returned_date: row.returned_date,
                    issuance_type: row.issuance_type || 'issued',
                    condition_on_issue: row.condition_on_issue
                });
            }
        });

        const output = Object.values(grouped).map(squadronGroup => ({
            ...squadronGroup,
            reservists: Object.values(squadronGroup.reservists)
        }));

        res.status(200).json({ status: 'success', data: { tracker: output } });
    } catch (error) {
        console.error('Uniform tracker error:', error);
        res.status(500).json({ status: 'error', message: 'Database error', code: 'DB_ERROR', error: error.message });
    }
});

/**
 * GET /api/issuances/reservist/:id
 */
router.get('/reservist/:id', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid reservist ID is required')
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const reservistId = req.params.id;

        if (req.user.role === 'reservist') {
            const [checkResults] = await db.query('SELECT id FROM reservists WHERE user_id = ?', [req.user.id]);
            if (!checkResults || checkResults.length === 0 || checkResults[0].id != reservistId) {
                return res.status(403).json({ status: 'error', message: 'Access denied. You can only view your own issuances.', code: 'ACCESS_DENIED' });
            }
        }

        const [results] = await db.query(`
            SELECT si.*, 
                   s.name as supply_name, s.category, s.unit,
                   u.email as issued_by_email
            FROM supply_issuances si
            LEFT JOIN supplies s ON si.supply_id = s.id
            LEFT JOIN users u ON si.issued_by = u.id
            WHERE si.reservist_id = ?
            ORDER BY si.issued_date DESC
        `, [reservistId]);

        res.status(200).json({ status: 'success', data: { reservist_id: reservistId, issuances: results } });
    } catch (error) {
        dbError(res);
    }
});

/**
 * GET /api/issuances/squadron/:id
 */
router.get('/squadron/:id', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid squadron ID is required')
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const squadronId = req.params.id;

        const [results] = await db.query(`
            SELECT si.*, 
                   r.first_name, r.last_name, r.service_number, r.rank,
                   s.name as supply_name, s.category, s.unit
            FROM supply_issuances si
            LEFT JOIN reservists r ON si.reservist_id = r.id
            LEFT JOIN reservist_assignments sr ON r.id = sr.reservist_id AND sr.is_primary = 1
            LEFT JOIN supplies s ON si.supply_id = s.id
            WHERE sr.squadron_id = ?
            ORDER BY si.issued_date DESC
        `, [squadronId]);

        res.status(200).json({ status: 'success', data: { squadron_id: squadronId, issuances: results } });
    } catch (error) {
        dbError(res);
    }
});

/**
 * POST /api/issuances/bulk
 * Bulk issue uniforms to multiple reservists
 */
router.post('/bulk', authenticateToken, requireAdmin, [
    body('supply_id').isInt({ min: 1 }).withMessage('Valid supply ID is required'),
    body('reservist_ids').isArray({ min: 1 }).withMessage('At least one reservist ID required'),
    body('quantity_per_reservist').isInt({ min: 1 }).withMessage('Quantity per reservist must be at least 1'),
    body('due_return_date').isDate().withMessage('Valid due date is required'),
    body('issuance_type').optional().isIn(['issued', 'personal']).withMessage('Invalid issuance type'),
    body('condition_on_issue').optional().isIn(['new', 'good', 'fair', 'poor']),
    body('notes').optional().trim()
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const { reservist_ids, supply_id, quantity_per_reservist, due_return_date, issuance_type = 'issued', condition_on_issue = 'good', notes } = req.body;

        const [supplyResults] = await db.query('SELECT * FROM supplies WHERE id = ?', [supply_id]);
        if (!supplyResults || supplyResults.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Supply not found', code: 'SUPPLY_NOT_FOUND' });
        }

        const supply = supplyResults[0];
        const totalNeeded = quantity_per_reservist * reservist_ids.length;

        if (issuance_type === 'issued' && quantity_per_reservist > supply.quantity_available) {
            return res.status(400).json({ status: 'error', message: `Insufficient stock. Available: ${supply.quantity_available}, Needed per reservist: ${quantity_per_reservist}`, code: 'INSUFFICIENT_STOCK' });
        }

        const results = [];
        for (const reservist_id of reservist_ids) {
            const [reservistCheck] = await db.query('SELECT id, is_active FROM reservists WHERE id = ?', [reservist_id]);
            if (!reservistCheck || reservistCheck.length === 0) {
                return res.status(404).json({ status: 'error', message: `Reservist ${reservist_id} not found`, code: 'RESERVIST_NOT_FOUND' });
            }
            if (!reservistCheck[0].is_active) {
                return res.status(400).json({ status: 'error', message: `Reservist ${reservist_id} is inactive`, code: 'RESERVIST_INACTIVE' });
            }

            const [issuanceResult] = await db.query(
                `INSERT INTO supply_issuances (reservist_id, supply_id, quantity_issued, issued_date, due_return_date, issuance_type, condition_on_issue, issued_by, notes) VALUES (?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?)`,
                [reservist_id, supply_id, quantity_per_reservist, due_return_date, issuance_type, condition_on_issue, req.user.id, notes || null]
            );
            results.push(issuanceResult.insertId);
        }

        if (issuance_type === 'issued') {
            await db.query('UPDATE supplies SET quantity_available = quantity_available - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [totalNeeded, supply_id]);
        }

        logAudit({ user_id: req.user.id, action: 'issuance.bulk_created', entity_type: 'issuance', entity_id: supply_id, new_values: { count: results.length, quantity_per_reservist, supply_id, issuance_type } });

        res.status(201).json({ status: 'success', message: `${results.length} uniform(s) issued successfully`, data: { issuanceIds: results, totalIssued: totalNeeded } });
    } catch (error) {
        console.error('Bulk issuance error:', error);
        dbError(res, 'Failed to create bulk issuance');
    }
});
router.get('/:id', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid issuance ID is required')
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const [results] = await db.query(`
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
        `, [req.params.id]);

        if (!results || results.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Issuance not found', code: 'ISSUANCE_NOT_FOUND' });
        }

        res.status(200).json({ status: 'success', data: results[0] });
    } catch (error) {
        dbError(res);
    }
});

/**
 * POST /api/issuances
 */
router.post('/', authenticateToken, requireAdmin, [
    body('reservist_id').isInt({ min: 1 }).withMessage('Valid reservist ID is required'),
    body('supply_id').isInt({ min: 1 }).withMessage('Valid supply ID is required'),
    body('quantity_issued').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('due_return_date').isDate().withMessage('Valid due date is required'),
    body('issuance_type').optional().isIn(['issued', 'personal']).withMessage('Invalid issuance type'),
    body('condition_on_issue').optional().isIn(['new', 'good', 'fair', 'poor']),
    body('notes').optional().trim()
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const { reservist_id, supply_id, quantity_issued, due_return_date, issuance_type = 'issued', condition_on_issue = 'good', notes } = req.body;

        const [reservistResults] = await db.query('SELECT id, is_active FROM reservists WHERE id = ?', [reservist_id]);
        if (!reservistResults || reservistResults.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Reservist not found', code: 'RESERVIST_NOT_FOUND' });
        }
        if (!reservistResults[0].is_active) {
            return res.status(400).json({ status: 'error', message: 'Cannot issue supplies to inactive reservist', code: 'RESERVIST_INACTIVE' });
        }

        const [supplyResults] = await db.query('SELECT * FROM supplies WHERE id = ?', [supply_id]);
        if (!supplyResults || supplyResults.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Supply not found', code: 'SUPPLY_NOT_FOUND' });
        }

        const supply = supplyResults[0];
        if (quantity_issued > supply.quantity_available) {
            return res.status(400).json({ status: 'error', message: `Insufficient stock. Available: ${supply.quantity_available}`, code: 'INSUFFICIENT_STOCK' });
        }

        const newQuantity = supply.quantity_available - quantity_issued;

        const [issuanceResult] = await db.query(
            `INSERT INTO supply_issuances (reservist_id, supply_id, quantity_issued, issued_date, due_return_date, issuance_type, condition_on_issue, issued_by, notes) VALUES (?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?)`,
            [reservist_id, supply_id, quantity_issued, due_return_date, issuance_type, condition_on_issue, req.user.id, notes || null]
        );

        await db.query('UPDATE supplies SET quantity_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, supply_id]);

        logAudit({ user_id: req.user.id, action: 'issuance.created', entity_type: 'issuance', entity_id: issuanceResult.insertId, new_values: req.body });

        res.status(201).json({ status: 'success', message: 'Supplies issued successfully', data: { issuanceId: issuanceResult.insertId, quantity_issued, remaining_stock: newQuantity } });
    } catch (error) {
        dbError(res, 'Failed to create issuance record');
    }
});

/**
 * PUT /api/issuances/:id (return items)
 */
router.put('/:id', authenticateToken, requireAdmin, [
    param('id').isInt({ min: 1 }).withMessage('Valid issuance ID is required'),
    body('returned_quantity').optional().isInt({ min: 1 }),
    body('condition_on_return').optional().isIn(['new', 'good', 'fair', 'poor', 'damaged']),
    body('notes').optional().trim()
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const issuanceId = req.params.id;
        const { returned_quantity, condition_on_return, notes } = req.body;

        const [existing] = await db.query('SELECT * FROM supply_issuances WHERE id = ?', [issuanceId]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Issuance not found', code: 'ISSUANCE_NOT_FOUND' });
        }

        const issuance = existing[0];

        if (issuance.returned_date) {
            return res.status(400).json({ status: 'error', message: 'Items already returned', code: 'ALREADY_RETURNED' });
        }

        const returnQty = returned_quantity || issuance.quantity_issued;

        if (returnQty > issuance.quantity_issued) {
            return res.status(400).json({ status: 'error', message: 'Returned quantity cannot exceed issued quantity', code: 'INVALID_RETURN_QUANTITY' });
        }

        await db.query(
            'UPDATE supply_issuances SET returned_date = CURRENT_DATE, returned_quantity = ?, condition_on_return = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [returnQty, condition_on_return || null, notes || null, issuanceId]
        );

        await db.query('UPDATE supplies SET quantity_available = quantity_available + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [returnQty, issuance.supply_id]);

        logAudit({ user_id: req.user.id, action: 'issuance.returned', entity_type: 'issuance', entity_id: issuanceId, old_values: { returned_date: null, returned_quantity: null }, new_values: { returned_date: new Date().toISOString().split('T')[0], returned_quantity: returnQty } });

        res.status(200).json({ status: 'success', message: 'Items returned successfully', data: { issuanceId, returned_quantity: returnQty, condition_on_return } });
    } catch (error) {
        dbError(res, 'Failed to update issuance');
    }
});

module.exports = router;
