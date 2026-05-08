const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /api/assignments
 * List all assignments with pagination and filtering
 */
router.get('/', authenticateToken, authorize('admin'), [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('reservist_id').optional().isInt({ min: 1 }),
    query('group_id').optional().isInt({ min: 1 }),
    query('squadron_id').optional().isInt({ min: 1 }),
    query('is_primary').optional().isBoolean()
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
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const reservistId = req.query.reservist_id;
        const groupId = req.query.group_id;
        const squadronId = req.query.squadron_id;
        const isPrimary = req.query.is_primary;

        let query = `
            SELECT ra.id, ra.assigned_date, ra.is_primary, ra.notes, ra.created_at,
                   r.id as reservist_id, r.first_name, r.last_name, r.rank, r.service_number,
                    g.id as group_id, g.name as group_name, g.code as group_code,
                    s.id as squadron_id, s.squadron_name, s.location,
                   a.id as arsen_id, a.name as arsen_name
            FROM reservist_assignments ra
            LEFT JOIN reservists r ON ra.reservist_id = r.id
            LEFT JOIN groups g ON ra.group_id = g.id
             LEFT JOIN squadron s ON ra.squadron_id = s.id
            LEFT JOIN arsens a ON g.arsen_id = a.id
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM reservist_assignments ra WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (reservistId) {
            query += ' AND ra.reservist_id = ?';
            countQuery += ' AND ra.reservist_id = ?';
            queryParams.push(reservistId);
            countParams.push(reservistId);
        }

        if (groupId) {
            query += ' AND ra.group_id = ?';
            countQuery += ' AND ra.group_id = ?';
            queryParams.push(groupId);
            countParams.push(groupId);
        }

        if (squadronId) {
            query += ' AND ra.squadron_id = ?';
            countQuery += ' AND ra.squadron_id = ?';
            queryParams.push(squadronId);
            countParams.push(squadronId);
        }

        if (isPrimary !== undefined) {
            const primaryValue = isPrimary === 'true' ? 1 : 0;
            query += ' AND ra.is_primary = ?';
            countQuery += ' AND ra.is_primary = ?';
            queryParams.push(primaryValue);
            countParams.push(primaryValue);
        }

        query += ' ORDER BY ra.assigned_date DESC LIMIT ? OFFSET ?';
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
                        assignments: results,
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
 * GET /api/assignments/:id
 * Get single assignment details
 */
router.get('/:id', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid assignment ID is required')
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

        const assignmentId = req.params.id;

        const query = `
            SELECT ra.*, 
                   r.first_name, r.last_name, r.rank, r.service_number,
                   g.name as group_name, g.code as group_code,
                    s.squadron_name, s.location,
                   a.name as arsen_name
            FROM reservist_assignments ra
            LEFT JOIN reservists r ON ra.reservist_id = r.id
            LEFT JOIN groups g ON ra.group_id = g.id
             LEFT JOIN squadron s ON ra.squadron_id = s.id
            LEFT JOIN arsens a ON g.arsen_id = a.id
            WHERE ra.id = ?
        `;

        db.query(query, [assignmentId], (err, results) => {
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
                    message: 'Assignment not found',
                    code: 'ASSIGNMENT_NOT_FOUND'
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
 * POST /api/assignments
 * Create new reservist assignment
 */
router.post('/', authenticateToken, authorize('admin'), [
    body('reservist_id').isInt({ min: 1 }).withMessage('Valid reservist ID is required'),
    body('group_id').isInt({ min: 1 }).withMessage('Valid group ID is required'),
    body('squadron_id').isInt({ min: 1 }).withMessage('Valid squadron ID is required'),
    body('assigned_date').isDate().withMessage('Valid assigned date is required'),
    body('is_primary').optional().isBoolean().withMessage('is_primary must be boolean'),
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

        const { reservist_id, group_id, squadron_id, assigned_date, is_primary = false, notes } = req.body;

        db.query('SELECT id FROM reservists WHERE id = ?', [reservist_id], (reservistErr, reservistResults) => {
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

            db.query('SELECT id FROM groups WHERE id = ?', [group_id], (groupErr, groupResults) => {
                if (groupErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR'
                    });
                }
                if (!groupResults || groupResults.length === 0) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Group not found',
                        code: 'GROUP_NOT_FOUND'
                    });
                }

                 db.query('SELECT id FROM squadron WHERE id = ?', [squadron_id], (cityErr, cityResults) => {
                    if (cityErr) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Database error',
                            code: 'DB_ERROR'
                        });
                    }
                    if (!cityResults || cityResults.length === 0) {
                        return res.status(404).json({
                            status: 'error',
                            message: 'Squadron not found',
                            code: 'SQUADRON_NOT_FOUND'
                        });
                    }

                    if (is_primary) {
                        db.query('SELECT id FROM reservist_assignments WHERE reservist_id = ? AND is_primary = TRUE', [reservist_id], (primaryErr, primaryResults) => {
                            if (primaryErr) {
                                return res.status(500).json({
                                    status: 'error',
                                    message: 'Database error',
                                    code: 'DB_ERROR'
                                });
                            }
                            if (primaryResults && primaryResults.length > 0) {
                                return res.status(409).json({
                                    status: 'error',
                                    message: 'Reservist already has a primary assignment',
                                    code: 'PRIMARY_ASSIGNMENT_EXISTS'
                                });
                            }

                            insertAssignment();
                        });
                    } else {
                        insertAssignment();
                    }

                    function insertAssignment() {
                        db.query(
                             `INSERT INTO reservist_assignments 
                              (reservist_id, group_id, squadron_id, assigned_date, is_primary, notes) 
                              VALUES (?, ?, ?, ?, ?, ?)`,
                             [reservist_id, group_id, squadron_id, assigned_date, is_primary ? 1 : 0, notes || null],
                            (insertErr, insertResults) => {
                                if (insertErr) {
                                    return res.status(500).json({
                                        status: 'error',
                                        message: 'Failed to create assignment',
                                        code: 'DB_ERROR'
                                    });
                                }

                                logAudit({
                                    user_id: req.user.userId,
                                    action: 'assignment.created',
                                    entity_type: 'assignment',
                                    entity_id: insertResults.insertId,
                                     new_values: { reservist_id, group_id, squadron_id, assigned_date, is_primary, notes }
                                });

                                res.status(201).json({
                                    status: 'success',
                                    message: 'Assignment created successfully',
                                     data: {
                                         assignmentId: insertResults.insertId,
                                         reservist_id,
                                         group_id,
                                         squadron_id
                                     }
                                });
                            }
                        );
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
 * PUT /api/assignments/:id
 * Update assignment
 */
router.put('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid assignment ID is required'),
    body('reservist_id').optional().isInt({ min: 1 }),
    body('group_id').optional().isInt({ min: 1 }),
    body('squadron_id').optional().isInt({ min: 1 }),
    body('assigned_date').optional().isDate(),
    body('is_primary').optional().isBoolean(),
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

        const assignmentId = req.params.id;
        const { reservist_id, group_id, squadron_id, assigned_date, is_primary, notes } = req.body;

        db.query('SELECT * FROM reservist_assignments WHERE id = ?', [assignmentId], (checkErr, checkResults) => {
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
                    message: 'Assignment not found',
                    code: 'ASSIGNMENT_NOT_FOUND'
                });
            }

            const currentAssignment = checkResults[0];
            const updates = [];
            const params = [];

            if (reservist_id !== undefined) {
                db.query('SELECT id FROM reservists WHERE id = ?', [reservist_id], (reservistErr, reservistResults) => {
                    if (reservistErr || !reservistResults || reservistResults.length === 0) {
                        return res.status(404).json({
                            status: 'error',
                            message: 'Reservist not found',
                            code: 'RESERVIST_NOT_FOUND'
                        });
                    }
                });
                updates.push('reservist_id = ?');
                params.push(reservist_id);
            }

            if (group_id !== undefined) {
                db.query('SELECT id FROM groups WHERE id = ?', [group_id], (groupErr, groupResults) => {
                    if (groupErr || !groupResults || groupResults.length === 0) {
                        return res.status(404).json({
                            status: 'error',
                            message: 'Group not found',
                            code: 'GROUP_NOT_FOUND'
                        });
                    }
                });
                updates.push('group_id = ?');
                params.push(group_id);
            }

            if (squadron_id !== undefined) {
                 db.query('SELECT id FROM squadron WHERE id = ?', [squadron_id], (cityErr, cityResults) => {
                    if (cityErr || !cityResults || cityResults.length === 0) {
                        return res.status(404).json({
                            status: 'error',
                            message: 'Squadron not found',
                            code: 'SQUADRON_NOT_FOUND'
                        });
                    }
                });
                updates.push('squadron_id = ?');
                params.push(squadron_id);
            }

            if (assigned_date !== undefined) {
                updates.push('assigned_date = ?');
                params.push(assigned_date);
            }

            if (is_primary !== undefined) {
                if (is_primary && !currentAssignment.is_primary) {
                    const targetReservistId = reservist_id || currentAssignment.reservist_id;
                    db.query('SELECT id FROM reservist_assignments WHERE reservist_id = ? AND is_primary = TRUE AND id != ?', [targetReservistId, assignmentId], (primaryErr, primaryResults) => {
                        if (primaryResults && primaryResults.length > 0) {
                            return res.status(409).json({
                                status: 'error',
                                message: 'Reservist already has a primary assignment',
                                code: 'PRIMARY_ASSIGNMENT_EXISTS'
                            });
                        }
                    });
                }
                updates.push('is_primary = ?');
                params.push(is_primary ? 1 : 0);
            }

            if (notes !== undefined) {
                updates.push('notes = ?');
                params.push(notes || null);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No fields to update',
                    code: 'NO_UPDATE'
                });
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(assignmentId);

            const query = `UPDATE reservist_assignments SET ${updates.join(', ')} WHERE id = ?`;

            db.query(query, params, (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to update assignment',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'assignment.updated',
                    entity_type: 'assignment',
                    entity_id: assignmentId,
                    old_values: currentAssignment,
                    new_values: req.body
                });

                res.status(200).json({
                    status: 'success',
                    message: 'Assignment updated successfully'
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
 * DELETE /api/assignments/:id
 * Delete assignment (hard delete)
 */
router.delete('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid assignment ID is required')
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

        const assignmentId = req.params.id;

        db.query('SELECT * FROM reservist_assignments WHERE id = ?', [assignmentId], (checkErr, checkResults) => {
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
                    message: 'Assignment not found',
                    code: 'ASSIGNMENT_NOT_FOUND'
                });
            }

            const oldAssignmentData = checkResults[0];

            db.query('DELETE FROM reservist_assignments WHERE id = ?', [assignmentId], (deleteErr) => {
                if (deleteErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to delete assignment',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'assignment.deleted',
                    entity_type: 'assignment',
                    entity_id: assignmentId,
                    old_values: oldAssignmentData
                });

                res.status(200).json({
                    status: 'success',
                    message: 'Assignment deleted successfully'
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
