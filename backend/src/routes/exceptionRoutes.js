import express from 'express';
import {
  getExceptions,
  getExceptionById,
  assignException,
  resolveException,
  closeException
} from '../controllers/exceptionController.js';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All exception routes require authentication
router.use(authenticateUser);

// GET routes for list and details
router.get('/', authorizeRoles('Admin', 'Manager', 'AccountsExecutive'), getExceptions);
router.get('/:id', authorizeRoles('Admin', 'Manager', 'AccountsExecutive'), getExceptionById);

// PATCH routes for assignment, resolution, and closing
router.patch('/:id/assign', authorizeRoles('Admin', 'Manager'), assignException);
router.patch('/:id/resolve', authorizeRoles('Admin', 'Manager', 'AccountsExecutive'), resolveException);
router.patch('/:id/close', authorizeRoles('Admin', 'Manager', 'AccountsExecutive'), closeException);

export default router;
