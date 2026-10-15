const express = require('express');
const router  = express.Router();

const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const validate    = require('../middleware/validate');
const {
  listNotificationsValidator,
  markAllReadValidator,
  clearNotificationsValidator,
} = require('../validators/notificationValidators');

// All notification routes require authentication; any role can access their own notifications.
router.use(protect);

// ─── Collection ───────────────────────────────────────────────────────────────
router
  .route('/')
  .get(listNotificationsValidator,     validate, notificationController.getMyNotifications)
  .delete(clearNotificationsValidator, validate, notificationController.clearNotifications);

// ─── Unread count (before /:id to avoid param capture) ───────────────────────
router.get('/unread-count', notificationController.getUnreadCount);

// ─── Bulk action (before /:id) ────────────────────────────────────────────────
router.patch('/mark-all-read', markAllReadValidator, validate, notificationController.markAllRead);

// ─── Single resource ──────────────────────────────────────────────────────────
router.delete('/:id', notificationController.deleteNotification);
router.patch('/:id/read',   notificationController.markAsRead);
router.patch('/:id/unread', notificationController.markAsUnread);

module.exports = router;
