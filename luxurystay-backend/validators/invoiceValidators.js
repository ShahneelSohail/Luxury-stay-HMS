const { body } = require('express-validator');

const PAYMENT_METHODS = ['card', 'cash', 'bank_transfer', 'online'];
const LINE_CATEGORIES = ['room', 'dining', 'spa', 'bar', 'laundry', 'transport', 'other'];

// ─── Generate Invoice ─────────────────────────────────────────────────────────

exports.generateInvoiceValidator = [
  body('reservationId')
    .notEmpty().withMessage('Reservation ID is required.')
    .isMongoId().withMessage('Reservation ID must be a valid MongoDB ObjectId.'),

  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100.'),

  body('touristTaxPerNight')
    .optional()
    .isFloat({ min: 0 }).withMessage('Tourist tax per night must be a non-negative number.'),

  body('discount.amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount amount must be a non-negative number.'),

  body('discount.reason')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Discount reason cannot exceed 200 characters.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),
];

// ─── Update Payment ───────────────────────────────────────────────────────────

exports.updatePaymentValidator = [
  body('paymentMethod')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(PAYMENT_METHODS).withMessage(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}.`),

  body('amountPaid')
    .optional()
    .isFloat({ min: 0 }).withMessage('Amount paid must be a non-negative number.'),

  body('paymentDate')
    .optional()
    .isISO8601().withMessage('Payment date must be a valid date (YYYY-MM-DD).'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),
];

// ─── Add Line Item ────────────────────────────────────────────────────────────

exports.addLineItemValidator = [
  body('description')
    .trim()
    .notEmpty().withMessage('Line item description is required.')
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters.'),

  body('category')
    .optional()
    .isIn(LINE_CATEGORIES).withMessage(`Category must be one of: ${LINE_CATEGORIES.join(', ')}.`),

  body('quantity')
    .notEmpty().withMessage('Quantity is required.')
    .isFloat({ min: 0 }).withMessage('Quantity must be a non-negative number.'),

  body('unitPrice')
    .notEmpty().withMessage('Unit price is required.')
    .isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number.'),
];
