const { body, query } = require('express-validator');

const PHONE_REGEX = /^\+?[\d\s\-()\/.]{7,20}$/;
const PHONE_MSG   = 'Please provide a valid phone number.';

const ID_TYPES = ['passport', 'national_id', 'driving_license', 'other'];
const TIERS    = ['none', 'argent', 'or', 'etoile'];

// ─── Create Guest ─────────────────────────────────────────────────────────────

exports.createGuestValidator = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required.')
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters.'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required.')
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(PHONE_REGEX).withMessage(PHONE_MSG),

  body('nationality')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 60 }).withMessage('Nationality cannot exceed 60 characters.'),

  body('idType')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(ID_TYPES).withMessage(`ID type must be one of: ${ID_TYPES.join(', ')}.`),

  body('idNumber')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('ID number cannot exceed 50 characters.'),

  body('tier')
    .optional()
    .isIn(TIERS).withMessage(`Tier must be one of: ${TIERS.join(', ')}.`),

  body('lifetimeSpend')
    .optional()
    .isFloat({ min: 0 }).withMessage('Lifetime spend must be a non-negative number.'),

  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.country').optional().trim(),
  body('address.zipCode').optional().trim(),

  body('preferences.roomType').optional().trim(),
  body('preferences.floorLevel').optional().trim(),
  body('preferences.smoking').optional().isBoolean().withMessage('Smoking preference must be true or false.'),
  body('preferences.extraPillow').optional().isBoolean().withMessage('Extra pillow preference must be true or false.'),
  body('preferences.earlyCheckIn').optional().isBoolean().withMessage('Early check-in preference must be true or false.'),
  body('preferences.lateCheckOut').optional().isBoolean().withMessage('Late check-out preference must be true or false.'),
  body('preferences.notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Preference notes cannot exceed 500 characters.'),
];

// ─── Update Guest ─────────────────────────────────────────────────────────────

exports.updateGuestValidator = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty().withMessage('First name cannot be empty.')
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters.'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty().withMessage('Last name cannot be empty.')
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters.'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(PHONE_REGEX).withMessage(PHONE_MSG),

  body('nationality')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 60 }).withMessage('Nationality cannot exceed 60 characters.'),

  body('idType')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(ID_TYPES).withMessage(`ID type must be one of: ${ID_TYPES.join(', ')}.`),

  body('idNumber')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('ID number cannot exceed 50 characters.'),

  body('tier')
    .optional()
    .isIn(TIERS).withMessage(`Tier must be one of: ${TIERS.join(', ')}.`),

  body('lifetimeSpend')
    .optional()
    .isFloat({ min: 0 }).withMessage('Lifetime spend must be a non-negative number.'),

  body('isVIP')
    .optional()
    .isBoolean().withMessage('isVIP must be true or false.'),

  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.country').optional().trim(),
  body('address.zipCode').optional().trim(),

  body('preferences.roomType').optional().trim(),
  body('preferences.floorLevel').optional().trim(),
  body('preferences.smoking').optional().isBoolean().withMessage('Smoking preference must be true or false.'),
  body('preferences.extraPillow').optional().isBoolean().withMessage('Extra pillow preference must be true or false.'),
  body('preferences.earlyCheckIn').optional().isBoolean().withMessage('Early check-in preference must be true or false.'),
  body('preferences.lateCheckOut').optional().isBoolean().withMessage('Late check-out preference must be true or false.'),
  body('preferences.notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Preference notes cannot exceed 500 characters.'),
];

// ─── Search ───────────────────────────────────────────────────────────────────

exports.searchGuestValidator = [
  query('q')
    .trim()
    .notEmpty().withMessage('Search query "q" is required.')
    .isLength({ min: 2 }).withMessage('Search query must be at least 2 characters.'),
];
