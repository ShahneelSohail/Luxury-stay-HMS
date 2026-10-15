const { query } = require('express-validator');

const NOTIFICATION_TYPES = ['booking', 'housekeeping', 'maintenance', 'service', 'feedback', 'system'];

exports.listNotificationsValidator = [
  query('unreadOnly')
    .optional()
    .isBoolean().withMessage('unreadOnly must be true or false.'),

  query('type')
    .optional()
    .isIn(NOTIFICATION_TYPES)
    .withMessage(`type must be one of: ${NOTIFICATION_TYPES.join(', ')}.`),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
];

exports.markAllReadValidator = [
  query('type')
    .optional()
    .isIn(NOTIFICATION_TYPES)
    .withMessage(`type must be one of: ${NOTIFICATION_TYPES.join(', ')}.`),
];

exports.clearNotificationsValidator = [
  query('readOnly')
    .optional()
    .isBoolean().withMessage('readOnly must be true or false.'),
];
