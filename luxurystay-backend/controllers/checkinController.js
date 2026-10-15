const Reservation        = require('../models/Reservation');
const Room               = require('../models/Room');
const Guest              = require('../models/Guest');
const GuestActivityLog   = require('../models/GuestActivityLog');
const HousekeepingTask   = require('../models/HousekeepingTask');
const { AppError } = require('../middleware/errorHandler');
const catchAsync   = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { validateObjectId } = require('../utils/objectId');

// ─── Shared populate helper ───────────────────────────────────────────────────

const populateReservation = (query) =>
  query
    .populate('guest',     'firstName lastName email phone nationality idType idNumber isVIP tier tierLabel totalStays lifetimeSpend')
    .populate('room',      'roomNumber floor type typeLabel view status rates')
    .populate('createdBy', 'name email role');

const buildPayload = (r) => ({
  id:                   r._id,
  bookingId:            r.bookingId,
  guest:                r.guest,
  room:                 r.room,
  checkInDate:          r.checkInDate,
  checkOutDate:         r.checkOutDate,
  nights:               r.nights,
  adults:               r.adults,
  children:             r.children,
  status:               r.status,
  source:               r.source,
  eta:                  r.eta              || null,
  vehicle:              r.vehicle          || null,
  addOns:               r.addOns,
  addOnsTotal:          r.addOnsTotal,
  stayPreferences:      r.stayPreferences,
  specialRequests:      r.specialRequests  || null,
  notes:                r.notes            || null,
  totalAmount:          r.totalAmount,
  depositAmount:        r.depositAmount,
  depositPaid:          r.depositPaid,
  cancellationDeadline: r.cancellationDeadline || null,
  checkInTime:          r.checkInTime      || null,
  checkOutTime:         r.checkOutTime     || null,
  keyIssued:            r.keyIssued,
  idVerified:           r.idVerified,
  departureChecklist:   r.departureChecklist,
  checkoutAdjustment:   r.checkoutAdjustment || null,
  createdBy:            r.createdBy,
  createdAt:            r.createdAt,
  updatedAt:            r.updatedAt,
});

// ─── CHECK-IN ─────────────────────────────────────────────────────────────────

/**
 * PATCH /api/reservations/:id/checkin
 * Handles identity verification, key issuance, and room activation.
 * Access: admin, manager, receptionist
 *
 * Body (all optional — finalise whatever was not captured at booking):
 *   idVerified, keyIssued, vehicle, eta, stayPreferences, notes
 *   guestUpdates: { nationality, idType, idNumber, phone } — patches the Guest record
 */
exports.checkIn = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Reservation ID');

  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  if (reservation.status === 'checked-in') {
    return next(new AppError(`Reservation ${reservation.bookingId} is already checked-in.`, 400));
  }
  if (!['pending', 'confirmed'].includes(reservation.status)) {
    return next(
      new AppError(
        `Cannot check-in a reservation with status "${reservation.status}". Only pending or confirmed reservations can be checked-in.`,
        400
      )
    );
  }

  const {
    idVerified, keyIssued,
    vehicle, eta, stayPreferences, notes,
    guestUpdates,
  } = req.body;

  // Apply check-in fields
  reservation.status      = 'checked-in';
  reservation.checkInTime = new Date();
  if (idVerified        !== undefined) reservation.idVerified   = idVerified;
  if (keyIssued         !== undefined) reservation.keyIssued    = keyIssued;
  if (vehicle           !== undefined) reservation.vehicle      = vehicle;
  if (eta               !== undefined) reservation.eta          = eta;
  if (stayPreferences   !== undefined) reservation.stayPreferences = stayPreferences;
  if (notes             !== undefined) reservation.notes        = notes;

  await reservation.save({ validateBeforeSave: true });

  // Room → occupied
  await Room.findByIdAndUpdate(reservation.room, {
    status:           'occupied',
    lastStatusChange: new Date(),
    statusNote:       null,
  });

  // Patch guest profile with any identity details captured at the desk
  if (guestUpdates && Object.keys(guestUpdates).length) {
    const allowedGuestFields = ['nationality', 'idType', 'idNumber', 'phone'];
    const patch = {};
    allowedGuestFields.forEach((f) => {
      if (guestUpdates[f] !== undefined) patch[f] = guestUpdates[f];
    });
    if (Object.keys(patch).length) {
      await Guest.findByIdAndUpdate(reservation.guest, patch, { runValidators: true });
    }
  }

  const populated = await populateReservation(Reservation.findById(reservation._id));

  const staffName = req.user?.name || req.user?.email || 'Staff';
  await GuestActivityLog.create({
    guest:       reservation.guest,
    reservation: reservation._id,
    eventType:   'checked_in',
    description: `Checked in to room ${populated.room.roomNumber} (${populated.room.typeLabel || populated.room.type}).`,
    performedBy: staffName,
  });

  sendSuccess(res, 200, `Guest checked in to room ${populated.room.roomNumber}. Key issued: ${reservation.keyIssued ? 'Yes' : 'No'}.`, {
    reservation: buildPayload(populated),
  });
});

// ─── CHECK-OUT ────────────────────────────────────────────────────────────────

/**
 * PATCH /api/reservations/:id/checkout
 * Finalises the stay: updates room to cleaning, increments guest stay count,
 * and signals billing that an invoice is ready for settlement.
 * Access: admin, manager, receptionist
 *
 * Body:
 *   departureChecklist: { miniBarVerified, safeEmptied, keysReturned,
 *                         damageAssessment, lostAndFoundCleared, transferDispatched }
 *   notes (optional — any final remarks)
 */
exports.checkOut = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Reservation ID');

  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  if (reservation.status === 'checked-out') {
    return next(new AppError(`Reservation ${reservation.bookingId} is already checked-out.`, 400));
  }
  if (reservation.status !== 'checked-in') {
    return next(
      new AppError(
        `Cannot check-out a reservation with status "${reservation.status}". Only checked-in reservations can be checked-out.`,
        400
      )
    );
  }

  const { departureChecklist, notes, waiveAdjustment } = req.body;

  // ── Compute checkout adjustment ─────────────────────────────────────────────
  const scheduledNights = Math.ceil(
    (new Date(reservation.checkOutDate) - new Date(reservation.checkInDate)) / 86400000
  );
  const nightlyRate = scheduledNights > 0
    ? Math.round(reservation.totalAmount / scheduledNights)
    : 0;

  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const scheduled  = new Date(reservation.checkOutDate); scheduled.setHours(0, 0, 0, 0);
  const diffDays   = Math.round((scheduled - today) / 86400000); // +ve = early, -ve = overdue

  let adjType = 'none', adjNights = 0, adjAmount = 0, adjReason = null;
  if (diffDays > 0) {
    adjType   = 'credit';
    adjNights = diffDays;
    adjAmount = nightlyRate * diffDays;
    adjReason = `Early departure credit — ${diffDays} unused night${diffDays !== 1 ? 's' : ''}`;
  } else if (diffDays < 0) {
    adjType   = 'charge';
    adjNights = Math.abs(diffDays);
    adjAmount = nightlyRate * Math.abs(diffDays);
    adjReason = `Late checkout charge — ${Math.abs(diffDays)} extra day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
  }

  const canWaive = ['admin', 'manager'].includes(req.user?.role);
  const doWaive  = canWaive && waiveAdjustment === true;

  reservation.checkoutAdjustment = {
    type:     doWaive ? 'none' : adjType,
    nights:   adjNights,
    amount:   doWaive ? 0 : adjAmount,
    waived:   doWaive,
    waivedBy: doWaive ? (req.user?.name || req.user?.email) : null,
    reason:   adjReason,
  };
  // ────────────────────────────────────────────────────────────────────────────

  reservation.status       = 'checked-out';
  reservation.checkOutTime = new Date();
  if (notes !== undefined) reservation.notes = notes;

  // Merge provided checklist items — any not provided stay false
  if (departureChecklist && typeof departureChecklist === 'object') {
    const fields = [
      'miniBarVerified', 'safeEmptied', 'keysReturned',
      'damageAssessment', 'lostAndFoundCleared', 'transferDispatched',
    ];
    fields.forEach((f) => {
      if (departureChecklist[f] !== undefined) {
        reservation.departureChecklist[f] = departureChecklist[f];
      }
    });
  }

  await reservation.save({ validateBeforeSave: true });

  // Room → cleaning (housekeeping picks it up from Module 8)
  await Room.findByIdAndUpdate(reservation.room, {
    status:           'cleaning',
    lastStatusChange: new Date(),
    statusNote:       `Departure clean · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
  });

  // Auto-create a departure-clean housekeeping task (skip if one already exists for this room)
  const existingTask = await HousekeepingTask.findOne({
    room:     reservation.room,
    taskType: 'departure_clean',
    status:   { $in: ['queued', 'in-progress'] },
  });
  if (!existingTask) {
    await HousekeepingTask.create({
      room:        reservation.room,
      taskType:    'departure_clean',
      priority:    'high',
      status:      'queued',
      scheduledFor: new Date(),
      notes:       `Auto-generated on checkout · booking ${reservation.bookingId}.`,
      createdBy:   req.user.id,
    });
  }

  // Recalculate guest stats (visits, lifetime spend, tier)
  await Guest.recalcStats(reservation.guest);

  const populated = await populateReservation(Reservation.findById(reservation._id));

  const staffNameCo = req.user?.name || req.user?.email || 'Staff';
  await GuestActivityLog.create({
    guest:       reservation.guest,
    reservation: reservation._id,
    eventType:   'checked_out',
    description: `Checked out from room ${populated.room.roomNumber}. Stay complete.`,
    performedBy: staffNameCo,
  });

  // Determine if any checklist items were skipped (pending follow-up)
  const checklist = reservation.departureChecklist;
  const incomplete = [
    ['Mini-bar',       checklist.miniBarVerified],
    ['Safe',           checklist.safeEmptied],
    ['Keys',           checklist.keysReturned],
    ['Damage check',   checklist.damageAssessment],
    ['Lost & found',   checklist.lostAndFoundCleared],
    ['Transfer',       checklist.transferDispatched],
  ]
    .filter(([, done]) => !done)
    .map(([label]) => label);

  sendSuccess(
    res,
    200,
    `Guest checked out from room ${populated.room.roomNumber}. Room queued for cleaning.`,
    {
      reservation:    buildPayload(populated),
      invoiceReady:   true,     // Module 7 billing flag — FE should redirect to invoice generation
      checklistComplete: incomplete.length === 0,
      checklistPending:  incomplete,
    }
  );
});
