const Property = require('../models/Property');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');

// ─── GET /api/property ────────────────────────────────────────────────────────
// Returns the singleton property document, creating it with defaults if absent.
exports.getProperty = catchAsync(async (req, res) => {
  let property = await Property.findOne({ singleton: true });

  if (!property) {
    property = await Property.create({ singleton: true });
  }

  sendSuccess(res, 200, 'Property settings retrieved.', { property });
});

// ─── PATCH /api/property ──────────────────────────────────────────────────────
// Upserts the singleton property document.
exports.updateProperty = catchAsync(async (req, res) => {
  const allowed = [
    'name', 'code', 'address', 'city', 'country',
    'timezone', 'currency', 'currencySymbol',
    'phone', 'email', 'website',
    'policies', 'taxes', 'totalRooms',
  ];

  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const property = await Property.findOneAndUpdate(
    { singleton: true },
    { $set: updates },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  sendSuccess(res, 200, 'Property settings updated.', { property });
});
