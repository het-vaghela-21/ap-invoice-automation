import express from 'express';
import { check } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Validation schemas using express-validator
 */
const registerValidationRules = [
  check('firstName', 'First name is required').trim().notEmpty(),
  check('lastName', 'Last name is required').trim().notEmpty(),
  check('email', 'Please provide a valid email address').isEmail().normalizeEmail(),
  check('password', 'Password must be at least 8 characters long').isLength({ min: 8 }),
  check('role', 'Valid user role is required').isIn(['Admin', 'Manager', 'AccountsExecutive', 'Employee'])
];

const loginValidationRules = [
  check('email', 'Please include a valid email address').isEmail().normalizeEmail(),
  check('password', 'Password is required').notEmpty()
];

/**
 * @route   POST /api/auth/register
 * @desc    Register user
 * @access  Public
 */
router.post('/register', registerValidationRules, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', loginValidationRules, authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve logged-in user profile details
 * @access  Private (Protected Route)
 */
router.get('/me', authenticateUser, authController.getCurrentUser);

export default router;
