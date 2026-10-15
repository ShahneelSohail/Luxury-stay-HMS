const { body } = require('express-validator');

const PASSWORD_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const PASSWORD_MSG =
  'Password must contain at least one uppercase letter, one lowercase letter, and one number.';

const PHONE_REGEX = /^\+?[\d\s\-()\/.]{7,20}$/;
const PHONE_MSG   = 'Please provide a valid phone number.';

exports.registerValidator = [
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

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(PHONE_REGEX).withMessage(PHONE_MSG),
];

exports.loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

exports.updateMeValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(PHONE_REGEX).withMessage(PHONE_MSG),
];

exports.changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required.'),

  body('newPassword')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(PASSWORD_REGEX).withMessage(PASSWORD_MSG),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your new password.')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
];
