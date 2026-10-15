const { body } = require('express-validator');

exports.updatePropertyValidator = [
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Property name cannot exceed 100 characters.'),
  body('code').optional().trim().isLength({ max: 30 }).withMessage('Property code cannot exceed 30 characters.'),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('country').optional().trim(),
  body('timezone').optional().trim(),
  body('currency').optional().trim().isLength({ max: 10 }).withMessage('Currency code cannot exceed 10 characters.'),
  body('currencySymbol').optional().trim().isLength({ max: 5 }).withMessage('Currency symbol cannot exceed 5 characters.'),
  body('phone').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Please provide a valid email address.'),
  body('website').optional().trim().isURL().withMessage('Please provide a valid URL.'),
  body('totalRooms').optional().isInt({ min: 1 }).withMessage('Total rooms must be at least 1.'),

  // Policies
  body('policies.checkInTime')
    .optional()
    .matches(/^([0-1]\d|2[0-3]):[0-5]\d$/).withMessage('Check-in time must be in HH:MM format.'),
  body('policies.checkOutTime')
    .optional()
    .matches(/^([0-1]\d|2[0-3]):[0-5]\d$/).withMessage('Check-out time must be in HH:MM format.'),
  body('policies.cancellationWindowHours')
    .optional()
    .isInt({ min: 0 }).withMessage('Cancellation window must be a non-negative integer (hours).'),
  body('policies.depositPercent')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Deposit percent must be between 0 and 100.'),
  body('policies.childrenPolicy').optional().trim().isLength({ max: 200 }),
  body('policies.petsPolicy').optional().trim().isLength({ max: 200 }),
  body('policies.extraNotes').optional().trim().isLength({ max: 1000 }),

  // Taxes
  body('taxes.vatPercent')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('VAT percent must be between 0 and 100.'),
  body('taxes.touristTaxPerNight')
    .optional()
    .isFloat({ min: 0 }).withMessage('Tourist tax per night must be a non-negative number.'),
  body('taxes.touristTaxLabel').optional().trim().isLength({ max: 100 }),
];
