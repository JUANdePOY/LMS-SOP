const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { comparePassword, generateToken, hashPassword } = require('../app/auth');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * POST /auth/login
 * Authenticate user with ID Number (service_number) and password
 * Returns JWT token on success
 */
router.post('/login', [
    body('id_number')
        .notEmpty()
        .trim()
        .withMessage('ID Number is required'),
    body('password')
        .notEmpty()
        .trim()
        .withMessage('Password is required')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                errors: errors.array()
            });
        }

        const { id_number, password } = req.body;

        // Find user by ID Number (service_number in reservists table)
        const [results] = await db.query(
            `SELECT u.id, u.password_hash, u.role, u.is_active, r.service_number as id_number 
             FROM users u
             JOIN reservists r ON u.id = r.user_id
             WHERE r.service_number = ?`,
            [id_number]
        );

        // Check if user exists
        if (!results || results.length === 0) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid ID Number or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = results[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                status: 'error',
                message: 'User account is deactivated',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        try {
            // Compare password
            const isPasswordValid = await comparePassword(password, user.password_hash);

            if (!isPasswordValid) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid ID Number or password',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Generate JWT token
            const token = generateToken({
                userId: user.id,
                id_number: user.id_number,
                role: user.role
            });

            // Update last login timestamp
            db.query(
                'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            ).catch(err => console.error('Failed to update last_login_at:', err));

            logAudit({
                user_id: user.id,
                action: 'user.login',
                entity_type: 'user',
                entity_id: user.id,
                new_values: { id_number: user.id_number, role: user.role }
            });

            return res.status(200).json({
                status: 'success',
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        id_number: user.id_number,
                        role: user.role
                    }
                }
            });
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                message: 'Authentication failed',
                code: 'AUTH_ERROR'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * POST /auth/logout
 * Client-side logout - token removal is handled by frontend
 * This endpoint mainly for symmetry and future session invalidation
 */
router.post('/logout', authenticateToken, (req, res) => {
    try {
        logAudit({
            user_id: req.user.userId,
            action: 'user.logout',
            entity_type: 'user',
            entity_id: req.user.userId
        });

        res.status(200).json({
            status: 'success',
            message: 'Logout successful. Please delete the token from local storage.',
            code: 'LOGOUT_SUCCESS'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Logout failed',
            code: 'LOGOUT_ERROR'
        });
    }
});

/**
 * POST /auth/register
 * Create a new user account (admin users only)
 * Reservist accounts should be created through admin panel
 */
router.post('/register', authenticateToken, [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    body('role')
        .isIn(['admin', 'reservist'])
        .withMessage('Role must be either admin or reservist')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                errors: errors.array()
            });
        }

        // Only admins can create users
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Only administrators can create user accounts',
                code: 'ADMIN_ONLY'
            });
        }

        const { email, password, role } = req.body;

        // Check if email already exists
        const [results] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (results && results.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Email already registered',
                code: 'EMAIL_EXISTS'
            });
        }

        try {
            // Hash password
            const passwordHash = await hashPassword(password);

            // Create user
            const [insertResults] = await db.query(
                'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                [email, passwordHash, role]
            );

            logAudit({
                user_id: req.user.userId,
                action: 'user.created',
                entity_type: 'user',
                entity_id: insertResults.insertId,
                new_values: { email, role }
            });

            res.status(201).json({
                status: 'success',
                message: 'User created successfully',
                data: {
                    userId: insertResults.insertId,
                    email,
                    role
                }
            });
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                message: 'Password hashing failed',
                code: 'AUTH_ERROR'
            });
        }
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * GET /auth/profile
 * Get current user profile information
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT u.id, u.role, r.service_number as id_number 
             FROM users u
             JOIN reservists r ON u.id = r.user_id
             WHERE u.id = ?`,
            [req.user.userId]
        );

        if (!results || results.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found',
                code: 'NOT_FOUND'
            });
        }

        const user = results[0];
        res.status(200).json({
            status: 'success',
            data: {
                userId: user.id,
                id_number: user.id_number,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database error',
            code: 'DB_ERROR'
        });
    }
});

module.exports = router;
