const { body } = require('express-validator');

const SERVICE_TYPES = [
  'room_service', 'wake_up_call', 'laundry', 'spa',
  'transport', 'amenities', 'dining', 'concierge', 'other',
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// ─── Create Service Request ───────────────────────────────────────────────────

exports.createServiceValidator = [
  body('guest')
    .notEmpty().withMessage('Guest ID is required.')
    .isMongoId().withMessage('Guest ID must be a valid MongoDB ObjectId.'),

  body('reservation')
    .notEmpty().withMessage('Reservation ID is required.')
    .isMongoId().withMessage('Reservation ID must be a valid MongoDB ObjectId.'),

  body('room')
    .notEmpty().withMessage('Room ID is required.')
    .isMongoId().withMessage('Room ID must be a valid MongoDB ObjectId.'),

  body('serviceType')
    .notEmpty().withMessage('Service type is required.')
    .isIn(SERVICE_TYPES).withMessage(`Service type must be one of: ${SERVICE_TYPES.join(', ')}.`),

  body('details')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Details cannot exceed 1000 characters.'),

  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}.`),

  body('scheduledFor')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('scheduledFor must be a valid date-time.'),
];

// ─── Update Service Request ───────────────────────────────────────────────────

exports.updateServiceValidator = [
  body('details')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Details cannot exceed 1000 characters.'),

  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}.`),

  body('scheduledFor')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('scheduledFor must be a valid date-time.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters.'),
];

// ─── Assign ───────────────────────────────────────────────────────────────────

exports.assignServiceValidator = [
  body('assignedTo')
    .notEmpty().withMessage('assignedTo (User ID) is required.')
    .isMongoId().withMessage('assignedTo must be a valid MongoDB ObjectId.'),
];

// ─── Fulfill ──────────────────────────────────────────────────────────────────

exports.fulfillServiceValidator = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters.'),
];
