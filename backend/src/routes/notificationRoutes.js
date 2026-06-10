import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateUser);

// Routes
router.get('/', getNotifications);
router.get('/unread', getUnreadNotifications);
router.patch('/read-all', markAllAsRead); // Must be before /:id/read to prevent route ambiguity
router.patch('/:id/read', markAsRead);

export default router;
