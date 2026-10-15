const Reservation = require('../models/Reservation');
const Room        = require('../models/Room');
const Guest       = require('../models/Guest');
const { AppError } = require('../middleware/errorHandler');
const catchAsync   = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildPayload = (r) => ({
  id:                   r._id,
  bookingId:            r.bookingId,
  bookingContact:       r.bookingContact || null,
  guest:                r.guest,
  room:                 r.room,
  checkInDate:          r.checkInDate,
  checkOutDate:         r.checkOutDate,
  nights:               r.nights,
  adults:               r.adults,
  children:             r.children,
  status:               r.status,
  source:               r.source,
  eta:                  r.eta          || null,
  vehicle:              r.vehicle      || null,
  addOns:               r.addOns,
  addOnsTotal:          r.addOnsTotal,
  stayPreferences:      r.stayPreferences,
  specialRequests:      r.specialRequests || null,
  notes:                r.notes          || null,
  totalAmount:          r.totalAmount,
  depositAmount:        r.depositAmount,
  depositPaid:          r.depositPaid,
  cancellationDeadline: r.cancellationDeadline || null,
  checkInTime:          r.checkInTime  || null,
  checkOutTime:         r.checkOutTime || null,
  keyIssued:            r.keyIssued,
  idVerified:           r.idVerified,
  createdBy:            r.createdBy,
  createdAt:            r.createdAt,
  updatedAt:            r.updatedAt,
});

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Check for overlapping reservations on a room, optionally excluding a reservation ID
const checkRoomAvailability = async (roomId, checkInDate, checkOutDate, excludeId = null) => {
  const query = {
    room:   roomId,
    status: { $in: ['pending', 'confirmed', 'checked-in'] },
    checkInDate:  { $lt: new Date(checkOutDate) },
    checkOutDate: { $gt: new Date(checkInDate) },
  };
  if (excludeId) query._id = { $ne: excludeId };

  return Reservation.findOne(query).select('bookingId checkInDate checkOutDate').lean();
};

// Compute total: room standard rate × nights + addOns sum
const computeTotal = (room, checkInDate, checkOutDate, addOns = []) => {
  const nights = Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
  );
  const roomTotal  = (room.rates?.standard || 0) * nights;
  const addOnsTotal = addOns.reduce((sum, a) => sum + (a.price || 0), 0);
  return roomTotal + addOnsTotal;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/reservations
 * Access: admin, manager, receptionist
 */
exports.createReservation = catchAsync(async (req, res, next) => {
  const {
    guest: guestId, room: roomId,
    checkInDate, checkOutDate,
    adults, children,
    source, eta, vehicle,
    addOns, stayPreferences, specialRequests, notes,
    depositAmount, depositPaid, cancellationDeadline,
  } = req.body;

  validateObjectId(guestId, 'Guest ID');
  validateObjectId(roomId,  'Room ID');

  const [guest, room] = await Promise.all([
    Guest.findById(guestId),
    Room.findById(roomId),
  ]);

  if (!guest) return next(new AppError('Guest not found.', 404));
  if (!room)  return next(new AppError('Room not found.', 404));
  if (!room.isActive) return next(new AppError('This room is not available for booking.', 400));

  // Double-booking guard
  const conflict = await checkRoomAvailability(roomId, checkInDate, checkOutDate);
  if (conflict) {
    return next(
      new AppError(
        `Room ${room.roomNumber} is already reserved from ${conflict.checkInDate.toDateString()} to ${conflict.checkOutDate.toDateString()} (Booking: ${conflict.bookingId}).`,
        409
      )
    );
  }

  // Validate guest capacity
  const totalGuests = (adults || 0) + (children || 0);
  if (totalGuests > room.maxGuests) {
    return next(
      new AppError(
        `Room ${room.roomNumber} has a maximum capacity of ${room.maxGuests} guest(s). Requested: ${totalGuests}.`,
        400
      )
    );
  }

  const totalAmount = computeTotal(room, checkInDate, checkOutDate, addOns);

  const reservation = await Reservation.create({
    guest:                guestId,
    room:                 roomId,
    checkInDate:          new Date(checkInDate),
    checkOutDate:         new Date(checkOutDate),
    adults,
    children:             children || 0,
    source:               source   || 'direct',
    eta,
    vehicle,
    addOns:               addOns           || [],
    stayPreferences:      stayPreferences  || [],
    specialRequests,
    notes,
    totalAmount,
    depositAmount:        depositAmount    || 0,
    depositPaid:          depositPaid      || false,
    cancellationDeadline: cancellationDeadline ? new Date(cancellationDeadline) : null,
    createdBy:            req.user.id,
  });

  // Mark room as reserved
  await Room.findByIdAndUpdate(roomId, { status: 'reserved', lastStatusChange: new Date() });

  // Increment guest's totalStays when reservation is confirmed/checked-in
  // (done on status change; tracked here for reference)

  const populated = await Reservation.findById(reservation._id)
    .populate('guest', 'firstName lastName email phone isVIP')
    .populate('room',  'roomNumber floor type typeLabel rates status')
    .populate('createdBy', 'name email role');

  sendSuccess(res, 201, `Reservation ${populated.bookingId} created successfully.`, {
    reservation: buildPayload(populated),
  });
});

/**
 * GET /api/reservations
 * Access: admin, manager, receptionist
 * Supports ?status=&guestId=&roomId=&source=&checkInFrom=&checkInTo=&search=&page=&limit=&sort=
 */
exports.getAllReservations = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, guestId, roomId, source, checkInFrom, checkInTo, search, sort } = req.query;

  const filter = {};
  if (status) {
    const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length) filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
  if (source)      filter.source = source;
  if (guestId)     { validateObjectId(guestId, 'Guest ID'); filter.guest = guestId; }
  if (roomId)      { validateObjectId(roomId,  'Room ID');  filter.room  = roomId; }
  if (checkInFrom || checkInTo) {
    filter.checkInDate = {};
    if (checkInFrom) filter.checkInDate.$gte = new Date(checkInFrom);
    if (checkInTo)   filter.checkInDate.$lte = new Date(checkInTo);
  }
  if (search?.trim()) {
    const q = search.trim();
    const re = new RegExp(escapeRegex(q), 'i');

    // Build full-name conditions when query contains a space (e.g. "test test")
    const namePairs = [];
    if (q.includes(' ')) {
      const parts = q.split(/\s+/);
      const r0 = new RegExp(escapeRegex(parts[0]), 'i');
      const r1 = new RegExp(escapeRegex(parts.slice(1).join(' ')), 'i');
      namePairs.push(
        { firstName: r0, lastName: r1 },
        { firstName: r1, lastName: r0 },
      );
    }

    const guests = await Guest.find({
      $or: [
        { firstName: re },
        { lastName: re },
        { email: re },
        { phone: re },
        ...namePairs,
      ],
    }).select('_id').lean();

    filter.$or = [
      { bookingId: re },
      { 'bookingContact.firstName': re },
      { 'bookingContact.lastName': re },
      { 'bookingContact.email': re },
      { 'bookingContact.phone': re },
      ...(namePairs.map(p => ({
        'bookingContact.firstName': p.firstName,
        'bookingContact.lastName':  p.lastName,
      }))),
      ...(guests.length ? [{ guest: { $in: guests.map(g => g._id) } }] : []),
    ];
  }

  const sortMap = {
    newest:   { createdAt:   -1 },
    oldest:   { createdAt:    1 },
    checkIn:  { checkInDate:  1 },
    checkOut: { checkOutDate: 1 },
  };
  const sortOrder = sortMap[sort] || sortMap.newest;

  const [reservations, totalCount] = await Promise.all([
    Reservation.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate('guest',     'firstName lastName email phone isVIP')
      .populate('room',      'roomNumber floor type typeLabel rates status')
      .populate('createdBy', 'name email role'),
    Reservation.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    'Reservations retrieved.',
    { reservations: reservations.map(buildPayload) },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/reservations/today-arrivals
 * Access: admin, manager, receptionist
 */
exports.getTodayArrivals = catchAsync(async (req, res) => {
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0));
  const end   = new Date(today.setHours(23, 59, 59, 999));

  const reservations = await Reservation.find({
    checkInDate: { $gte: start, $lte: end },
    status: { $in: ['pending', 'confirmed', 'checked-in'] },
  })
    .sort({ eta: 1, checkInDate: 1 })
    .populate('guest', 'firstName lastName email phone isVIP totalStays')
    .populate('room',  'roomNumber floor type typeLabel');

  sendSuccess(res, 200, `${reservations.length} arrival(s) today.`, {
    date:         start.toISOString().slice(0, 10),
    arrivals:     reservations.map(buildPayload),
    total:        reservations.length,
    checkedIn:    reservations.filter(r => r.status === 'checked-in').length,
    expected:     reservations.filter(r => r.status !== 'checked-in').length,
    vipArrivals:  reservations.filter(r => r.guest?.isVIP).length,
  });
});

/**
 * GET /api/reservations/today-departures
 * Access: admin, manager, receptionist
 */
exports.getTodayDepartures = catchAsync(async (req, res) => {
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0));
  const end   = new Date(today.setHours(23, 59, 59, 999));

  const reservations = await Reservation.find({
    checkOutDate: { $gte: start, $lte: end },
    status: { $in: ['confirmed', 'checked-in'] },
  })
    .sort({ checkOutDate: 1 })
    .populate('guest', 'firstName lastName email phone isVIP')
    .populate('room',  'roomNumber floor type typeLabel');

  sendSuccess(res, 200, `${reservations.length} departure(s) today.`, {
    date:       start.toISOString().slice(0, 10),
    departures: reservations.map(buildPayload),
    total:      reservations.length,
    checkedOut: reservations.filter(r => r.status === 'checked-out').length,
    stillInRoom:reservations.filter(r => r.status === 'checked-in').length,
  });
});

/**
 * GET /api/reservations/guest/:guestId
 * Access: admin, manager, receptionist
 */
exports.getReservationsByGuest = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.guestId, 'Guest ID');

  const guest = await Guest.findById(req.params.guestId);
  if (!guest) return next(new AppError('Guest not found.', 404));

  const { page, limit, skip } = getPagination(req.query);

  const [reservations, totalCount] = await Promise.all([
    Reservation.find({ guest: req.params.guestId })
      .sort({ checkInDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('room', 'roomNumber floor type typeLabel'),
    Reservation.countDocuments({ guest: req.params.guestId }),
  ]);

  sendSuccess(
    res,
    200,
    `Reservations for ${guest.firstName} ${guest.lastName}.`,
    {
      guest: {
        id:        guest._id,
        fullName:  `${guest.firstName} ${guest.lastName}`,
        email:     guest.email,
        totalStays: guest.totalStays,
        isVIP:     guest.isVIP,
      },
      reservations: reservations.map(buildPayload),
    },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/reservations/:id
 * Access: admin, manager, receptionist
 */
exports.getReservationById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Reservation ID');

  const reservation = await Reservation.findById(req.params.id)
    .populate('guest',     'firstName lastName email phone nationality isVIP totalStays')
    .populate('room',      'roomNumber floor type typeLabel rates status view')
    .populate('createdBy', 'name email role');

  if (!reservation) return next(new AppError('Reservation not found.', 404));

  sendSuccess(res, 200, 'Reservation retrieved.', { reservation: buildPayload(reservation) });
});

/**
 * PATCH /api/reservations/:id
 * Access: admin, manager, receptionist
 * Cannot change status here — use dedicated cancel or checkin/checkout routes.
 */
exports.updateReservation = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Reservation ID');

  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  if (['checked-out', 'cancelled'].includes(reservation.status)) {
    return next(new AppError(`Cannot update a reservation with status "${reservation.status}".`, 400));
  }

  const allowedFields = [
    'checkInDate', 'checkOutDate', 'adults', 'children',
    'source', 'eta', 'vehicle',
    'stayPreferences', 'specialRequests', 'notes',
    'depositAmount', 'depositPaid', 'cancellationDeadline',
  ];

  const updateFields = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updateFields[f] = req.body[f];
  });

  // If dates changed, re-check availability and recompute total
  const newCheckIn  = updateFields.checkInDate  ? new Date(updateFields.checkInDate)  : reservation.checkInDate;
  const newCheckOut = updateFields.checkOutDate ? new Date(updateFields.checkOutDate) : reservation.checkOutDate;

  if (updateFields.checkInDate || updateFields.checkOutDate) {
    if (newCheckIn >= newCheckOut) {
      return next(new AppError('Check-out date must be after check-in date.', 400));
    }
    const conflict = await checkRoomAvailability(reservation.room, newCheckIn, newCheckOut, reservation._id);
    if (conflict) {
      return next(
        new AppError(
          `Room is already reserved for the updated dates (Booking: ${conflict.bookingId}).`,
          409
        )
      );
    }
    // Recompute total with new dates
    const room = await Room.findById(reservation.room);
    updateFields.totalAmount = computeTotal(room, newCheckIn, newCheckOut, reservation.addOns);
  }

  // Handle addOns update separately — merge or replace
  if (req.body.addOns !== undefined) {
    updateFields.addOns = req.body.addOns;
    const room = await Room.findById(reservation.room);
    updateFields.totalAmount = computeTotal(room, newCheckIn, newCheckOut, req.body.addOns);
  }

  if (Object.keys(updateFields).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const updated = await Reservation.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  )
    .populate('guest',     'firstName lastName email phone isVIP')
    .populate('room',      'roomNumber floor type typeLabel rates status')
    .populate('createdBy', 'name email role');

  sendSuccess(res, 200, `Reservation ${updated.bookingId} updated successfully.`, {
    reservation: buildPayload(updated),
  });
});

/**
 * PATCH /api/reservations/:id/cancel
 * Access: admin, manager, receptionist
 */
exports.cancelReservation = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Reservation ID');

  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) return next(new AppError('Reservation not found.', 404));

  if (['checked-out', 'cancelled'].includes(reservation.status)) {
    return next(new AppError(`Reservation is already "${reservation.status}" and cannot be cancelled.`, 400));
  }
  if (reservation.status === 'checked-in') {
    return next(new AppError('Cannot cancel a reservation that is currently checked-in. Process a check-out instead.', 400));
  }

  reservation.status = 'cancelled';
  await reservation.save({ validateBeforeSave: false });

  // Free up the room
  await Room.findByIdAndUpdate(reservation.room, {
    status: 'available',
    lastStatusChange: new Date(),
    statusNote: null,
  });

  const populated = await Reservation.findById(reservation._id)
    .populate('guest', 'firstName lastName email')
    .populate('room',  'roomNumber floor type typeLabel');

  sendSuccess(res, 200, `Reservation ${reservation.bookingId} has been cancelled.`, {
    reservation: buildPayload(populated),
  });
});
