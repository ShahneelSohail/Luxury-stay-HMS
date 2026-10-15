const { body } = require('express-validator');

const ID_TYPES = ['passport', 'national_id', 'driving_license', 'other'];
const PHONE_REGEX = /^\+?[\d\s\-()\/.]{7,20}$/;

// ─── Check-in ─────────────────────────────────────────────────────────────────

exports.checkInValidator = [
  body('idVerified')
    .optional()
    .isBoolean().withMessage('idVerified must be true or false.'),

  body('keyIssued')
    .optional()
    .isBoolean().withMessage('keyIssued must be true or false.'),

  body('vehicle')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('Vehicle/plate cannot exceed 30 characters.'),

  body('eta')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([0-1]\d|2[0-3]):[0-5]\d$/).withMessage('ETA must be in HH:MM format (e.g. 14:00).'),

  body('stayPreferences')
    .optional()
    .isArray().withMessage('stayPreferences must be an array of strings.'),

  body('stayPreferences.*')
    .optional()
    .isString().trim().withMessage('Each preference must be a string.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),

  // Guest identity captured at the desk — patches Guest profile
  body('guestUpdates.nationality')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 60 }).withMessage('Nationality cannot exceed 60 characters.'),

  body('guestUpdates.idType')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(ID_TYPES).withMessage(`ID type must be one of: ${ID_TYPES.join(', ')}.`),

  body('guestUpdates.idNumber')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('ID number cannot exceed 50 characters.'),

  body('guestUpdates.phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(PHONE_REGEX).withMessage('Please provide a valid phone number.'),
];

// ─── Check-out ────────────────────────────────────────────────────────────────

exports.checkOutValidator = [
  body('departureChecklist').optional().isObject().withMessage('departureChecklist must be an object.'),

  body('departureChecklist.miniBarVerified')
    .optional()
    .isBoolean().withMessage('miniBarVerified must be true or false.'),

  body('departureChecklist.safeEmptied')
    .optional()
    .isBoolean().withMessage('safeEmptied must be true or false.'),

  body('departureChecklist.keysReturned')
    .optional()
    .isBoolean().withMessage('keysReturned must be true or false.'),

  body('departureChecklist.damageAssessment')
    .optional()
    .isBoolean().withMessage('damageAssessment must be true or false.'),

  body('departureChecklist.lostAndFoundCleared')
    .optional()
    .isBoolean().withMessage('lostAndFoundCleared must be true or false.'),

  body('departureChecklist.transferDispatched')
    .optional()
    .isBoolean().withMessage('transferDispatched must be true or false.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),
];
