const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /api/trainings
 * List all trainings with pagination and filtering
 */
router.get('/', authenticateToken, [
    param('page').optional().isInt({ min: 1 }),
    param('limit').optional().isInt({ min: 1, max: 100 })
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
        const status = req.query.status;

        let query = `
            SELECT t.id, t.title, t.description, 
                   t.start_datetime, t.end_datetime, t.venue, t.capacity,
                   t.status, t.is_mandatory, t.created_at, t.updated_at
            FROM trainings t
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM trainings t WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (status) {
            query += ' AND t.status = ?';
            countQuery += ' AND t.status = ?';
            queryParams.push(status);
            countParams.push(status);
        }

        query += ' ORDER BY t.start_datetime ASC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        db.query(countQuery, countParams, (countErr, countResults) => {
            if (countErr) {
                console.error('Trainings count query error:', countErr);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR',
                    debug: countErr.message
                });
            }

            const total = countResults[0].total;
            const totalPages = Math.ceil(total / limit);

            db.query(query, queryParams, (err, results) => {
                if (err) {
                    console.error('Trainings query error:', err);
                    console.error('Query:', query);
                    console.error('Params:', queryParams);
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR',
                        debug: err.message
                    });
                }

                res.status(200).json({
                    status: 'success',
                    data: {
                        trainings: results,
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

module.exports = router;
