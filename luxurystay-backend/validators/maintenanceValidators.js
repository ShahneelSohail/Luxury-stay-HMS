const { body } = require('express-validator');

const CATEGORIES = ['plumbing', 'electrical', 'ac', 'hvac', 'furniture', 'technology', 'structural', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES   = ['open', 'assigned', 'in-progress', 'resolved'];

// ─── Create Request ───────────────────────────────────────────────────────────

exports.createRequestValidator = [
  body('room')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId().withMessage('Room ID must be a valid MongoDB ObjectId.'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location cannot exceed 100 characters.'),

  body()
    .custom((_, { req }) => {
      if (!req.body.room && !req.body.location) {
        throw new Error('Either a room ID or a location description is required.');
      }
      return true;
    }),

  body('category')
    .notEmpty().withMessage('Category is required.')
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}.`),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required.')
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),

  body('photos')
    .optional()
    .isArray().withMessage('Photos must be an array of URLs.'),

  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}.`),
];

// ─── Update Request ───────────────────────────────────────────────────────────

exports.updateRequestValidator = [
  body('category')
    .optional()
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}.`),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),

  body('photos')
    .optional()
    .isArray().withMessage('Photos must be an array of URLs.'),

  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}.`),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location cannot exceed 100 characters.'),
];

// ─── Assign Request ───────────────────────────────────────────────────────────

exports.assignRequestValidator = [
  body('assignedTo')
    .notEmpty().withMessage('assignedTo (User ID) is required.')
    .isMongoId().withMessage('assignedTo must be a valid MongoDB ObjectId.'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Note cannot exceed 300 characters.'),
];

// ─── Update Status ────────────────────────────────────────────────────────────

exports.updateStatusValidator = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}.`),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Note cannot exceed 300 characters.'),
];

// ─── Resolve Request ──────────────────────────────────────────────────────────

exports.resolveRequestValidator = [
  body('resolutionNote')
    .trim()
    .notEmpty().withMessage('Resolution note is required.')
    .isLength({ max: 500 }).withMessage('Resolution note cannot exceed 500 characters.'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Note cannot exceed 300 characters.'),
];
