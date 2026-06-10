import express from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';
import { globalSearch } from '../controllers/searchController.js';

const router = express.Router();

// Apply auth and role protection middlewares (Employee is excluded)
router.use(authenticateUser);
router.use(authorizeRoles('Admin', 'Manager', 'AccountsExecutive'));

// Define route
router.get('/', globalSearch);

export default router;
