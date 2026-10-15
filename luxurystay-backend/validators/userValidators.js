const { body } = require('express-validator');

const VALID_ROLES  = ['admin', 'manager', 'receptionist', 'housekeeping', 'service', 'guest'];
const PASSWORD_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const PASSWORD_MSG   = 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
const PHONE_REGEX    = /^\+?[\d\s\-()\/.]{7,20}$/;
const PHONE_MSG      = 'Please provide a valid phone number.';

exports.createUserValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(PASSWORD_REGEX).withMessage(PASSWORD_MSG),

  body('role')
    .notEmpty().withMessage('Role is required.')
    .isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}.`),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(PHONE_REGEX).withMessage(PHONE_MSG),
];

exports.updateUserValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}.`),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(PHONE_REGEX).withMessage(PHONE_MSG),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be true or false.'),
];
