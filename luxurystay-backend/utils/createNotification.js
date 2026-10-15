const Notification = require('../models/Notification');

/**
 * Fire-and-forget notification helper.
 * Errors are logged but never thrown — callers should not await this.
 *
 * @param {string|ObjectId} recipientId  - User._id to notify
 * @param {string}          type         - booking|housekeeping|maintenance|service|feedback|system
 * @param {string}          title        - Short heading (max 150 chars)
 * @param {string}          message      - Body text (max 500 chars)
 * @param {Object}          [options]
 * @param {ObjectId}        [options.relatedId]    - _id of the triggering document
 * @param {string}          [options.relatedModel] - Mongoose model name
 */
async function createNotification(recipientId, type, title, message, options = {}) {
  try {
    await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      relatedId:    options.relatedId    ?? null,
      relatedModel: options.relatedModel ?? null,
    });
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err.message);
  }
}

module.exports = createNotification;
