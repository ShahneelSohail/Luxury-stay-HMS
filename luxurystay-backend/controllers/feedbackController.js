const Feedback    = require('../models/Feedback');
const Reservation = require('../models/Reservation');
const Guest       = require('../models/Guest');
const { AppError }    = require('../middleware/errorHandler');
const catchAsync      = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const populateFeedback = (query) =>
  query
    .populate('guest',       'firstName lastName email isVIP')
    .populate('reservation', 'bookingId checkInDate checkOutDate room')
    .populate('respondedBy', 'name role')
    .populate('actionedBy',  'name role');

const buildPayload = (f) => ({
  id:             f._id,
  guest:          f.guest,
  reservation:    f.reservation,
  ratings:        f.ratings,
  averageRating:  f.averageRating,
  comment:        f.comment        || null,
  npsScore:       f.npsScore       ?? null,
  npsCategory:    f.npsCategory,
  staffResponse:  f.staffResponse  || null,
  respondedBy:    f.respondedBy    || null,
  respondedAt:    f.respondedAt    || null,
  actionRequired: f.actionRequired,
  actionNote:     f.actionNote     || null,
  actionedBy:     f.actionedBy     || null,
  actionedAt:     f.actionedAt     || null,
  isPublic:       f.isPublic,
  createdAt:      f.createdAt,
  updatedAt:      f.updatedAt,
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/feedback
 * One feedback per reservation (enforced by unique index on reservation field).
 * Access: admin, manager, receptionist (staff submitting on behalf of guest or via portal)
 */
exports.createFeedback = catchAsync(async (req, res, next) => {
  const {
    guest: guestId, reservation: reservationId,
    ratings, comment, npsScore, isPublic,
  } = req.body;

  validateObjectId(guestId,       'Guest ID');
  validateObjectId(reservationId, 'Reservation ID');

  const [guest, reservation] = await Promise.all([
    Guest.findById(guestId),
    Reservation.findById(reservationId),
  ]);

  if (!guest)       return next(new AppError('Guest not found.', 404));
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  if (reservation.guest.toString() !== guestId) {
    return next(new AppError('This reservation does not belong to the specified guest.', 400));
  }
  if (!['checked-out', 'checked-in'].includes(reservation.status)) {
    return next(new AppError('Feedback can only be submitted for active or completed stays.', 400));
  }

  const existing = await Feedback.findOne({ reservation: reservationId });
  if (existing) {
    return next(new AppError('Feedback has already been submitted for this reservation.', 400));
  }

  const feedback = await Feedback.create({
    guest:      guestId,
    reservation:reservationId,
    ratings,
    comment,
    npsScore:   npsScore ?? null,
    isPublic:   isPublic || false,
  });

  const populated = await populateFeedback(Feedback.findById(feedback._id));

  sendSuccess(res, 201, 'Feedback submitted successfully.', {
    feedback: buildPayload(populated),
  });
});

/**
 * GET /api/feedback
 * Access: admin, manager
 * Supports ?guestId=&minRating=&actionRequired=&page=&limit=&sort=
 */
exports.getAllFeedback = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { guestId, minRating, actionRequired, sort } = req.query;

  const filter = {};
  if (guestId) { validateObjectId(guestId, 'Guest ID'); filter.guest = guestId; }
  if (minRating)       filter['ratings.overall'] = { $gte: Number(minRating) };
  if (actionRequired !== undefined) filter.actionRequired = actionRequired === 'true';

  const sortMap = {
    newest:    { createdAt: -1 },
    oldest:    { createdAt:  1 },
    rating:    { 'ratings.overall': -1 },
    action:    { actionRequired: -1, createdAt: -1 },
  };
  const sortOrder = sortMap[sort] || sortMap.newest;

  const [feedbackList, totalCount] = await Promise.all([
    populateFeedback(Feedback.find(filter).sort(sortOrder).skip(skip).limit(limit)),
    Feedback.countDocuments(filter),
  ]);

  // Aggregate stats for FE header bar
  const [stats] = await Feedback.aggregate([
    {
      $group: {
        _id:           null,
        avgRating:     { $avg: '$ratings.overall' },
        totalReviews:  { $sum: 1 },
        actionItems:   { $sum: { $cond: ['$actionRequired', 1, 0] } },
        promoters:     { $sum: { $cond: [{ $gte: ['$npsScore', 9] }, 1, 0] } },
        detractors:    { $sum: { $cond: [{ $lte: ['$npsScore', 6] }, 1, 0] } },
        npsRespondents:{ $sum: { $cond: [{ $ne: ['$npsScore', null] }, 1, 0] } },
      },
    },
  ]);

  let nps = null;
  if (stats && stats.npsRespondents > 0) {
    const promoterPct  = (stats.promoters  / stats.npsRespondents) * 100;
    const detractorPct = (stats.detractors / stats.npsRespondents) * 100;
    nps = Math.round(promoterPct - detractorPct);
  }

  sendSuccess(
    res,
    200,
    'Feedback retrieved.',
    {
      feedback: feedbackList.map(buildPayload),
      stats: {
        avgRating:    stats ? +stats.avgRating.toFixed(1) : null,
        totalReviews: stats?.totalReviews  || 0,
        actionItems:  stats?.actionItems   || 0,
        nps,
      },
    },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/feedback/:id
 * Access: admin, manager
 */
exports.getFeedbackById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Feedback ID');

  const feedback = await populateFeedback(Feedback.findById(req.params.id));
  if (!feedback) return next(new AppError('Feedback not found.', 404));

  sendSuccess(res, 200, 'Feedback retrieved.', { feedback: buildPayload(feedback) });
});

/**
 * PATCH /api/feedback/:id
 * Allows updating ratings, comment, npsScore, isPublic on unresponded feedback.
 * Access: admin, manager
 */
exports.updateFeedback = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Feedback ID');

  const allowedFields = ['ratings', 'comment', 'npsScore', 'isPublic'];
  const updateFields  = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updateFields[f] = req.body[f]; });

  if (Object.keys(updateFields).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const feedback = await populateFeedback(
    Feedback.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true })
  );
  if (!feedback) return next(new AppError('Feedback not found.', 404));

  sendSuccess(res, 200, 'Feedback updated.', { feedback: buildPayload(feedback) });
});

/**
 * DELETE /api/feedback/:id
 * Access: admin only
 */
exports.deleteFeedback = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Feedback ID');

  const feedback = await Feedback.findByIdAndDelete(req.params.id);
  if (!feedback) return next(new AppError('Feedback not found.', 404));

  sendSuccess(res, 200, 'Feedback deleted.');
});

/**
 * PATCH /api/feedback/:id/respond
 * Staff response — sets staffResponse, respondedBy, respondedAt.
 * Access: admin, manager
 */
exports.respondToFeedback = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Feedback ID');

  const { staffResponse } = req.body;
  if (!staffResponse || !staffResponse.trim()) {
    return next(new AppError('Staff response text is required.', 400));
  }

  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) return next(new AppError('Feedback not found.', 404));

  feedback.staffResponse = staffResponse.trim();
  feedback.respondedBy   = req.user.id;
  feedback.respondedAt   = new Date();
  await feedback.save();

  const populated = await populateFeedback(Feedback.findById(feedback._id));

  sendSuccess(res, 200, 'Response submitted.', { feedback: buildPayload(populated) });
});

/**
 * PATCH /api/feedback/:id/action
 * Flag feedback as requiring action, or mark action complete.
 * Drives the FE "Action items" counter.
 * Access: admin, manager
 */
exports.updateAction = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Feedback ID');

  const { actionRequired, actionNote } = req.body;
  if (actionRequired === undefined) {
    return next(new AppError('actionRequired (boolean) is required.', 400));
  }

  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) return next(new AppError('Feedback not found.', 404));

  feedback.actionRequired = actionRequired;
  feedback.actionNote     = actionNote || feedback.actionNote;

  if (!actionRequired && feedback.actionRequired) {
    feedback.actionedBy  = req.user.id;
    feedback.actionedAt  = new Date();
  }

  await feedback.save();

  const populated = await populateFeedback(Feedback.findById(feedback._id));

  sendSuccess(res, 200, `Feedback action status updated.`, { feedback: buildPayload(populated) });
});
