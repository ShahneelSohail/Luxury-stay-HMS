const { body } = require('express-validator');

const TASK_TYPES = [
  'departure_clean', 'arrival_prep', 'linen_refresh',
  'turn_down', 'deep_clean', 'maintenance_followup', 'inspection', 'other',
];
const STATUSES   = ['queued', 'in-progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// ─── Create Task ──────────────────────────────────────────────────────────────

exports.createTaskValidator = [
  body('room')
    .notEmpty().withMessage('Room ID is required.')
    .isMongoId().withMessage('Room ID must be a valid MongoDB ObjectId.'),

  body('taskType')
    .optional()
    .isIn(TASK_TYPES).withMessage(`Task type must be one of: ${TASK_TYPES.join(', ')}.`),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters.'),

  body('assignedTo')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId().withMessage('assignedTo must be a valid MongoDB ObjectId.'),

  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}.`),

  body('scheduledFor')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('scheduledFor must be a valid date-time.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),
];

// ─── Update Task ──────────────────────────────────────────────────────────────

exports.updateTaskValidator = [
  body('taskType')
    .optional()
    .isIn(TASK_TYPES).withMessage(`Task type must be one of: ${TASK_TYPES.join(', ')}.`),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters.'),

  body('assignedTo')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId().withMessage('assignedTo must be a valid MongoDB ObjectId.'),

  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}.`),

  body('status')
    .optional()
    .isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}.`),

  body('scheduledFor')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('scheduledFor must be a valid date-time.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),
];

// ─── Assign Task ──────────────────────────────────────────────────────────────

exports.assignTaskValidator = [
  body('assignedTo')
    .notEmpty().withMessage('assignedTo (User ID) is required.')
    .isMongoId().withMessage('assignedTo must be a valid MongoDB ObjectId.'),
];

// ─── Mark Complete ────────────────────────────────────────────────────────────

exports.markCompleteValidator = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),

  body('updateRoomStatus')
    .optional()
    .isBoolean().withMessage('updateRoomStatus must be true or false.'),
];

// ─── Report Issue ─────────────────────────────────────────────────────────────

exports.reportIssueValidator = [
  body('reportedIssue')
    .trim()
    .notEmpty().withMessage('Issue description is required.')
    .isLength({ max: 500 }).withMessage('Issue description cannot exceed 500 characters.'),
];
