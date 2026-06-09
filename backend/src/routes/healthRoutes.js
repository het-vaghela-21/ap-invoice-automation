import express from 'express';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Get health status of the backend service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'backend'
  });
});

export default router;
