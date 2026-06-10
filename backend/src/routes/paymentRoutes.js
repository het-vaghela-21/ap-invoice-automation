import express from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';
import { getPayments, getPaymentById, markAsPaid, putOnHold } from '../controllers/paymentController.js';

const router = express.Router();

// Route guards (Employee is excluded)
router.use(authenticateUser);
router.use(authorizeRoles('Admin', 'Manager', 'AccountsExecutive'));

// Routes definition
router.get('/', getPayments);
router.get('/:id', getPaymentById);
router.post('/:invoiceId/mark-paid', markAsPaid);
router.post('/:invoiceId/hold', putOnHold);

export default router;
