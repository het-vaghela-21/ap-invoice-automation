import express from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';
import * as dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

// Apply auth and role protection middlewares (Employee is excluded)
router.use(authenticateUser);
router.use(authorizeRoles('Admin', 'Manager', 'AccountsExecutive'));

// Define dashboard endpoints
router.get('/summary', dashboardController.getDashboardSummary);
router.get('/invoice-status', dashboardController.getInvoiceStatusAnalytics);
router.get('/vendors', dashboardController.getVendorAnalytics);
router.get('/exceptions', dashboardController.getExceptionAnalytics);
router.get('/purchase-orders', dashboardController.getPOAnalytics);
router.get('/recent-activity', dashboardController.getRecentActivity);
router.get('/ready-for-payment', dashboardController.getReadyForPayment);

export default router;
