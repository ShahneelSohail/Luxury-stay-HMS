const { body } = require('express-validator');

// ─── Create Feedback ──────────────────────────────────────────────────────────

exports.createFeedbackValidator = [
  body('guest')
    .notEmpty().withMessage('Guest ID is required.')
    .isMongoId().withMessage('Guest ID must be a valid MongoDB ObjectId.'),

  body('reservation')
    .notEmpty().withMessage('Reservation ID is required.')
    .isMongoId().withMessage('Reservation ID must be a valid MongoDB ObjectId.'),

  body('ratings.overall')
    .notEmpty().withMessage('Overall rating is required.')
    .isInt({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5.'),

  body('ratings.cleanliness')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Cleanliness rating must be between 1 and 5.'),

  body('ratings.service')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Service rating must be between 1 and 5.'),

  body('ratings.comfort')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Comfort rating must be between 1 and 5.'),

  body('ratings.value')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Value rating must be between 1 and 5.'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Comment cannot exceed 2000 characters.'),

  body('npsScore')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 10 }).withMessage('NPS score must be between 0 and 10.'),

  body('isPublic')
    .optional()
    .isBoolean().withMessage('isPublic must be true or false.'),
];

// ─── Update Feedback ──────────────────────────────────────────────────────────

exports.updateFeedbackValidator = [
  body('ratings.overall')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5.'),

  body('ratings.cleanliness')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Cleanliness rating must be between 1 and 5.'),

  body('ratings.service')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Service rating must be between 1 and 5.'),

  body('ratings.comfort')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Comfort rating must be between 1 and 5.'),

  body('ratings.value')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Value rating must be between 1 and 5.'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Comment cannot exceed 2000 characters.'),

  body('npsScore')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 10 }).withMessage('NPS score must be between 0 and 10.'),

  body('isPublic')
    .optional()
    .isBoolean().withMessage('isPublic must be true or false.'),
];

// ─── Staff Response ───────────────────────────────────────────────────────────

exports.respondValidator = [
  body('staffResponse')
    .trim()
    .notEmpty().withMessage('Staff response text is required.')
    .isLength({ max: 1000 }).withMessage('Response cannot exceed 1000 characters.'),
];

// ─── Action Update ────────────────────────────────────────────────────────────

exports.actionValidator = [
  body('actionRequired')
    .notEmpty().withMessage('actionRequired (boolean) is required.')
    .isBoolean().withMessage('actionRequired must be true or false.'),

  body('actionNote')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Action note cannot exceed 500 characters.'),
];
