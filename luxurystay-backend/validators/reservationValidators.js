const { body } = require('express-validator');

const STATUSES = ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'];
const SOURCES  = ['direct', 'travel_agent', 'concierge', 'online_agent'];

// ─── Shared ───────────────────────────────────────────────────────────────────

const dateAfterToday = (field, label) =>
  body(field)
    .notEmpty().withMessage(`${label} is required.`)
    .isISO8601().withMessage(`${label} must be a valid date (YYYY-MM-DD).`);

const optionalDate = (field, label) =>
  body(field)
    .optional()
    .isISO8601().withMessage(`${label} must be a valid date (YYYY-MM-DD).`);

// ─── Create Reservation ───────────────────────────────────────────────────────

exports.createReservationValidator = [
  body('guest')
    .notEmpty().withMessage('Guest ID is required.')
    .isMongoId().withMessage('Guest ID must be a valid MongoDB ObjectId.'),

  body('room')
    .notEmpty().withMessage('Room ID is required.')
    .isMongoId().withMessage('Room ID must be a valid MongoDB ObjectId.'),

  dateAfterToday('checkInDate',  'Check-in date'),
  dateAfterToday('checkOutDate', 'Check-out date'),

  body('checkOutDate').custom((checkOut, { req }) => {
    if (new Date(checkOut) <= new Date(req.body.checkInDate)) {
      throw new Error('Check-out date must be after check-in date.');
    }
    return true;
  }),

  body('adults')
    .notEmpty().withMessage('Number of adults is required.')
    .isInt({ min: 1, max: 20 }).withMessage('Adults must be between 1 and 20.'),

  body('children')
    .optional()
    .isInt({ min: 0, max: 20 }).withMessage('Children must be between 0 and 20.'),

  body('status')
    .optional()
    .isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}.`),

  body('source')
    .optional()
    .isIn(SOURCES).withMessage(`Source must be one of: ${SOURCES.join(', ')}.`),

  body('eta')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([0-1]\d|2[0-3]):[0-5]\d$/).withMessage('ETA must be in HH:MM format (e.g. 14:00).'),

  body('vehicle')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('Vehicle/plate cannot exceed 30 characters.'),

  body('addOns')
    .optional()
    .isArray().withMessage('addOns must be an array.'),

  body('addOns.*.name')
    .notEmpty().withMessage('Each add-on must have a name.'),

  body('addOns.*.price')
    .isFloat({ min: 0 }).withMessage('Each add-on price must be a non-negative number.'),

  body('stayPreferences')
    .optional()
    .isArray().withMessage('stayPreferences must be an array of strings.'),

  body('stayPreferences.*')
    .optional()
    .isString().trim().withMessage('Each preference must be a string.'),

  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Special requests cannot exceed 1000 characters.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),

  body('depositAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Deposit amount must be a non-negative number.'),

  body('depositPaid')
    .optional()
    .isBoolean().withMessage('depositPaid must be true or false.'),

  optionalDate('cancellationDeadline', 'Cancellation deadline'),
];

// ─── Update Reservation ───────────────────────────────────────────────────────

exports.updateReservationValidator = [
  optionalDate('checkInDate',  'Check-in date'),
  optionalDate('checkOutDate', 'Check-out date'),

  body('checkOutDate').optional().custom((checkOut, { req }) => {
    const checkIn = req.body.checkInDate;
    if (checkIn && new Date(checkOut) <= new Date(checkIn)) {
      throw new Error('Check-out date must be after check-in date.');
    }
    return true;
  }),

  body('adults')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('Adults must be between 1 and 20.'),

  body('children')
    .optional()
    .isInt({ min: 0, max: 20 }).withMessage('Children must be between 0 and 20.'),

  body('source')
    .optional()
    .isIn(SOURCES).withMessage(`Source must be one of: ${SOURCES.join(', ')}.`),

  body('eta')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([0-1]\d|2[0-3]):[0-5]\d$/).withMessage('ETA must be in HH:MM format.'),

  body('vehicle')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('Vehicle/plate cannot exceed 30 characters.'),

  body('addOns')
    .optional()
    .isArray().withMessage('addOns must be an array.'),

  body('addOns.*.name')
    .notEmpty().withMessage('Each add-on must have a name.'),

  body('addOns.*.price')
    .isFloat({ min: 0 }).withMessage('Each add-on price must be a non-negative number.'),

  body('stayPreferences')
    .optional()
    .isArray().withMessage('stayPreferences must be an array of strings.'),

  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Special requests cannot exceed 1000 characters.'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters.'),

  body('depositAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Deposit amount must be a non-negative number.'),

  body('depositPaid')
    .optional()
    .isBoolean().withMessage('depositPaid must be true or false.'),

  optionalDate('cancellationDeadline', 'Cancellation deadline'),
];
