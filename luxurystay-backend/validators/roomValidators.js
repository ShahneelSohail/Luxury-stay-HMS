const { body, query, param } = require('express-validator');

const ROOM_TYPES   = ['deluxe_twin', 'deluxe_king', 'junior_suite', 'premier_suite', 'penthouse'];
const ROOM_STATUS  = ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'];
const VIEW_TYPES   = ['sea_view', 'garden_view', 'city_view', 'courtyard_view', 'pool_view'];

const rateField = (name) =>
  body(`rates.${name}`)
    .notEmpty().withMessage(`rates.${name} is required.`)
    .isFloat({ min: 0 }).withMessage(`rates.${name} must be a non-negative number.`);

const optionalRateField = (name) =>
  body(`rates.${name}`)
    .optional()
    .isFloat({ min: 0 }).withMessage(`rates.${name} must be a non-negative number.`);

// ─── Create Room ──────────────────────────────────────────────────────────────

exports.createRoomValidator = [
  body('roomNumber')
    .trim()
    .notEmpty().withMessage('Room number is required.')
    .isLength({ max: 10 }).withMessage('Room number cannot exceed 10 characters.'),

  body('floor')
    .notEmpty().withMessage('Floor is required.')
    .isInt({ min: 1, max: 50 }).withMessage('Floor must be an integer between 1 and 50.'),

  body('type')
    .notEmpty().withMessage('Room type is required.')
    .isIn(ROOM_TYPES).withMessage(`Room type must be one of: ${ROOM_TYPES.join(', ')}.`),

  body('maxGuests')
    .notEmpty().withMessage('Max guests is required.')
    .isInt({ min: 1, max: 20 }).withMessage('Max guests must be between 1 and 20.'),

  rateField('low'),
  rateField('standard'),
  rateField('high'),
  rateField('peak'),
  optionalRateField('weekend'),

  body('status')
    .optional()
    .isIn(ROOM_STATUS).withMessage(`Status must be one of: ${ROOM_STATUS.join(', ')}.`),

  body('view')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(VIEW_TYPES).withMessage(`View must be one of: ${VIEW_TYPES.join(', ')}.`),

  body('smokingAllowed')
    .optional()
    .isBoolean().withMessage('smokingAllowed must be true or false.'),

  body('amenities')
    .optional()
    .isArray().withMessage('Amenities must be an array.'),

  body('amenities.*')
    .optional()
    .isString().trim().withMessage('Each amenity must be a string.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array of URLs.'),
];

// ─── Update Room ──────────────────────────────────────────────────────────────

exports.updateRoomValidator = [
  body('roomNumber')
    .optional()
    .trim()
    .notEmpty().withMessage('Room number cannot be empty.')
    .isLength({ max: 10 }).withMessage('Room number cannot exceed 10 characters.'),

  body('floor')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Floor must be an integer between 1 and 50.'),

  body('type')
    .optional()
    .isIn(ROOM_TYPES).withMessage(`Room type must be one of: ${ROOM_TYPES.join(', ')}.`),

  body('maxGuests')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('Max guests must be between 1 and 20.'),

  optionalRateField('low'),
  optionalRateField('standard'),
  optionalRateField('high'),
  optionalRateField('peak'),
  optionalRateField('weekend'),

  body('view')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(VIEW_TYPES).withMessage(`View must be one of: ${VIEW_TYPES.join(', ')}.`),

  body('smokingAllowed')
    .optional()
    .isBoolean().withMessage('smokingAllowed must be true or false.'),

  body('amenities')
    .optional()
    .isArray().withMessage('Amenities must be an array.'),

  body('amenities.*')
    .optional()
    .isString().trim().withMessage('Each amenity must be a string.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array of URLs.'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be true or false.'),
];

// ─── Update Status ────────────────────────────────────────────────────────────

exports.updateStatusValidator = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(ROOM_STATUS).withMessage(`Status must be one of: ${ROOM_STATUS.join(', ')}.`),

  body('statusNote')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Status note cannot exceed 300 characters.'),
];

// ─── Check Availability ───────────────────────────────────────────────────────

exports.checkAvailabilityValidator = [
  query('checkIn')
    .notEmpty().withMessage('checkIn date is required.')
    .isISO8601().withMessage('checkIn must be a valid date (YYYY-MM-DD).'),

  query('checkOut')
    .notEmpty().withMessage('checkOut date is required.')
    .isISO8601().withMessage('checkOut must be a valid date (YYYY-MM-DD).'),

  query('type')
    .optional()
    .isIn(ROOM_TYPES).withMessage(`Room type must be one of: ${ROOM_TYPES.join(', ')}.`),

  query('maxGuests')
    .optional()
    .isInt({ min: 1 }).withMessage('maxGuests must be a positive integer.'),
];
