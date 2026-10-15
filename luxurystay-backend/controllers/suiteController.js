const mongoose     = require('mongoose');
const Suite        = require('../models/Suite');
const { AppError } = require('../middleware/errorHandler');
const catchAsync   = require('../utils/catchAsync');
const { sendSuccess }    = require('../utils/apiResponse');
const { validateObjectId } = require('../utils/objectId');

const buildPayload = (s) => ({
  id:          s._id,
  slug:        s.slug,
  name:        s.name,
  description: s.description  || null,
  sqm:         s.sqm          || null,
  maxGuests:   s.maxGuests    || null,
  baseRate:    s.baseRate     || null,
  gradient:    s.gradient,
  amenities:   s.amenities,
  images:      s.images,
  sortOrder:   s.sortOrder,
  isActive:    s.isActive,
  createdAt:   s.createdAt,
  updatedAt:   s.updatedAt,
});

/**
 * GET /api/suites
 * Public — returns all active suites sorted by sortOrder.
 */
exports.getSuites = catchAsync(async (req, res) => {
  const filter = req.query.all === 'true' ? {} : { isActive: true };
  const suites = await Suite.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
  sendSuccess(res, 200, `${suites.length} suite(s) found.`, {
    suites: suites.map(buildPayload),
  });
});

/**
 * GET /api/suites/:id
 * Public — returns one suite by id or slug.
 */
exports.getSuite = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const suite = mongoose.Types.ObjectId.isValid(id)
    ? await Suite.findById(id).lean()
    : await Suite.findOne({ slug: id }).lean();
  if (!suite) return next(new AppError('Suite not found.', 404));
  sendSuccess(res, 200, 'Suite retrieved.', { suite: buildPayload(suite) });
});

/**
 * POST /api/suites
 * Admin only.
 */
exports.createSuite = catchAsync(async (req, res, next) => {
  const { slug, name, description, sqm, maxGuests, baseRate, gradient, amenities, images, sortOrder } = req.body;
  if (!slug) return next(new AppError('Slug is required.', 400));
  if (!name)  return next(new AppError('Name is required.', 400));

  const existing = await Suite.findOne({ slug: slug.toLowerCase().trim() });
  if (existing) return next(new AppError(`A suite with slug "${slug}" already exists.`, 400));

  const suite = await Suite.create({
    slug, name, description, sqm, maxGuests, baseRate, gradient, amenities, images, sortOrder,
  });

  sendSuccess(res, 201, `Suite "${suite.name}" created.`, { suite: buildPayload(suite) });
});

/**
 * PATCH /api/suites/:id
 * Admin only.
 */
exports.updateSuite = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Suite ID');
  const suite = await Suite.findById(req.params.id);
  if (!suite) return next(new AppError('Suite not found.', 404));

  const allowed = ['name', 'description', 'sqm', 'maxGuests', 'baseRate', 'gradient', 'amenities', 'images', 'sortOrder', 'isActive'];
  allowed.forEach(f => { if (req.body[f] !== undefined) suite[f] = req.body[f]; });

  // Slug update allowed only if no rooms reference this suite yet (optional safety)
  if (req.body.slug && req.body.slug !== suite.slug) {
    const conflict = await Suite.findOne({ slug: req.body.slug.toLowerCase().trim() });
    if (conflict) return next(new AppError(`Slug "${req.body.slug}" is already in use.`, 400));
    suite.slug = req.body.slug.toLowerCase().trim();
  }

  await suite.save({ validateBeforeSave: true });
  sendSuccess(res, 200, `Suite "${suite.name}" updated.`, { suite: buildPayload(suite) });
});

/**
 * DELETE /api/suites/:id
 * Admin only — soft delete.
 */
exports.deleteSuite = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Suite ID');
  const suite = await Suite.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!suite) return next(new AppError('Suite not found.', 404));
  sendSuccess(res, 200, `Suite "${suite.name}" deactivated.`, { suite: buildPayload(suite) });
});

