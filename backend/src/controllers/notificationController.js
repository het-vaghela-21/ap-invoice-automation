import Notification from '../models/Notification.js';

/**
 * @desc    Get paginated notifications for current user with search filter
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, q = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { userId: req.user._id };

    if (q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { message: searchRegex }
      ];
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all unread notifications for current user
 * @route   GET /api/notifications/unread
 * @access  Private
 */
export const getUnreadNotifications = async (req, res, next) => {
  try {
    const unread = await Notification.find({ userId: req.user._id, isRead: false })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: unread.length,
      data: unread
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a specific notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all unread notifications for current user as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications successfully marked as read'
    });
  } catch (error) {
    next(error);
  }
};
