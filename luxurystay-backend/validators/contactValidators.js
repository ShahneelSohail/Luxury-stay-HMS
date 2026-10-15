const { body } = require('express-validator');

exports.submitContactValidator = [
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

  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required.')
    .isLength({ max: 150 }).withMessage('Subject cannot exceed 150 characters.'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required.')
    .isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters.'),
];
