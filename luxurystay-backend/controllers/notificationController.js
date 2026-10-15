const Notification   = require('../models/Notification');
const catchAsync     = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { AppError }   = require('../middleware/errorHandler');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Returns the authenticated user's notifications, newest first.
// Query: ?unreadOnly=true  ?type=booking  ?page=1  ?limit=20
exports.getMyNotifications = catchAsync(async (req, res) => {
  const { unreadOnly, type } = req.query;
  const { skip, limit, page } = getPagination(req);

  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;
  if (type)                  filter.type   = type;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  sendSuccess(res, 200, 'Notifications retrieved.', {
    unreadCount,
    notifications,
    pagination: getPaginationMeta(total, page, limit),
  });
});

// ─── GET /api/notifications/unread-count ─────────────────────────────────────
exports.getUnreadCount = catchAsync(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  sendSuccess(res, 200, 'Unread count retrieved.', { unreadCount: count });
});

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
exports.markAsRead = catchAsync(async (req, res) => {
  validateObjectId(req.params.id, 'Notification');

  const notification = await Notification.findOne({
    _id:       req.params.id,
    recipient: req.user._id,
  });
  if (!notification) throw new AppError('Notification not found.', 404);

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  sendSuccess(res, 200, 'Notification marked as read.', { notification });
});

// ─── PATCH /api/notifications/:id/unread ─────────────────────────────────────
exports.markAsUnread = catchAsync(async (req, res) => {
  validateObjectId(req.params.id, 'Notification');

  const notification = await Notification.findOne({
    _id:       req.params.id,
    recipient: req.user._id,
  });
  if (!notification) throw new AppError('Notification not found.', 404);

  if (notification.isRead) {
    notification.isRead = false;
    await notification.save();
  }

  sendSuccess(res, 200, 'Notification marked as unread.', { notification });
});

// ─── PATCH /api/notifications/mark-all-read ──────────────────────────────────
exports.markAllRead = catchAsync(async (req, res) => {
  const { type } = req.query;

  const filter = { recipient: req.user._id, isRead: false };
  if (type) filter.type = type;

  const result = await Notification.updateMany(filter, { $set: { isRead: true } });

  sendSuccess(res, 200, `${result.modifiedCount} notification(s) marked as read.`, {
    modifiedCount: result.modifiedCount,
  });
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────
exports.deleteNotification = catchAsync(async (req, res) => {
  validateObjectId(req.params.id, 'Notification');

  const notification = await Notification.findOneAndDelete({
    _id:       req.params.id,
    recipient: req.user._id,
  });
  if (!notification) throw new AppError('Notification not found.', 404);

  sendSuccess(res, 200, 'Notification deleted.');
});

// ─── DELETE /api/notifications ───────────────────────────────────────────────
// Clears all (or all-read) notifications for the current user.
// Query: ?readOnly=true  (deletes only read notifications; default: all)
exports.clearNotifications = catchAsync(async (req, res) => {
  const filter = { recipient: req.user._id };
  if (req.query.readOnly === 'true') filter.isRead = true;

  const result = await Notification.deleteMany(filter);

  sendSuccess(res, 200, `${result.deletedCount} notification(s) cleared.`, {
    deletedCount: result.deletedCount,
  });
});
