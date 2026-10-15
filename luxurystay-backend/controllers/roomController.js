const mongoose = require('mongoose');
const Room             = require('../models/Room');
const Reservation      = require('../models/Reservation');
const Guest            = require('../models/Guest');
const GuestActivityLog = require('../models/GuestActivityLog');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

// Builds a map of roomId → { currentGuest, checkoutDate } from active reservations
async function buildGuestMap(roomIds) {
  const actives = await Reservation.find({
    room:   { $in: roomIds },
    status: { $in: ['checked-in', 'confirmed', 'pending'] },
  })
    .populate('guest', 'firstName lastName')
    .sort({ checkInDate: 1 })
    .lean();

  const map = {};
  actives.forEach(r => {
    const rid = r.room.toString();
    if (!map[rid]) {
      const g = r.guest;
      map[rid] = {
        currentGuest:     g ? `${g.firstName} ${g.lastName}` : null,
        checkoutDate:     r.checkOutDate
          ? new Date(r.checkOutDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          : null,
        reservationStatus: r.status,
      };
    }
  });
  return map;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildRoomPayload = (room) => ({
  id:               room._id,
  roomNumber:       room.roomNumber,
  floor:            room.floor,
  type:             room.type,
  typeLabel:        room.typeLabel,
  maxGuests:        room.maxGuests,
  rates:            room.rates,
  status:           room.status,
  view:             room.view         || null,
  smokingAllowed:   room.smokingAllowed,
  amenities:        room.amenities,
  description:      room.description  || null,
  images:           room.images,
  isActive:         room.isActive,
  lastStatusChange: room.lastStatusChange,
  statusNote:       room.statusNote   || null,
  createdAt:        room.createdAt,
  updatedAt:        room.updatedAt,
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/rooms
 * Access: admin, manager
 */
exports.createRoom = catchAsync(async (req, res, next) => {
  const {
    roomNumber, floor, type, maxGuests,
    rates, status, view, smokingAllowed,
    amenities, description, images,
  } = req.body;

  const trimmedRoomNumber = roomNumber.trim();
  const existing = await Room.findOne({ roomNumber: trimmedRoomNumber });

  if (existing) {
    if (existing.isActive) {
      return next(new AppError(`Room number "${trimmedRoomNumber}" already exists.`, 400));
    }

    existing.floor = floor;
    existing.type = type;
    existing.maxGuests = maxGuests;
    existing.rates = rates;
    existing.status = status || existing.status;
    existing.view = view;
    existing.smokingAllowed = smokingAllowed;
    existing.amenities = amenities;
    existing.description = description;
    existing.images = images;
    existing.suiteType = req.body.suiteType || existing.suiteType;
    existing.isActive = true;

    await existing.save();

    sendSuccess(res, 200, `Room ${existing.roomNumber} reactivated successfully.`, {
      room: buildRoomPayload(existing),
    });
    return;
  }

  const room = await Room.create({
    roomNumber: trimmedRoomNumber,
    floor,
    type,
    maxGuests,
    rates,
    status,
    view,
    smokingAllowed,
    amenities,
    description,
    images,
    suiteType: req.body.suiteType || null,
  });

  sendSuccess(res, 201, `Room ${room.roomNumber} created successfully.`, {
    room: buildRoomPayload(room),
  });
});

/**
 * GET /api/rooms
 * Access: all authenticated staff
 * Supports ?status=&floor=&type=&isActive=&page=&limit=&sort=
 */
exports.getAllRooms = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, floor, type, isActive, sort } = req.query;

  const filter = {};
  if (status)                filter.status   = status;
  if (floor)                 filter.floor    = Number(floor);
  if (type)                  filter.type     = type;
  if (isActive !== undefined) filter.isActive = isActive !== 'false';
  else                        filter.isActive = true;

  const sortMap = {
    roomNumber: { roomNumber: 1 },
    floor:      { floor: 1, roomNumber: 1 },
    status:     { status: 1, roomNumber: 1 },
    rate:       { 'rates.standard': -1 },
  };
  const sortOrder = sortMap[sort] || sortMap.floor;

  const [rooms, totalCount] = await Promise.all([
    Room.find(filter).sort(sortOrder).skip(skip).limit(limit),
    Room.countDocuments(filter),
  ]);

  // Enrich with current guest info from active reservations
  const roomIds = rooms.map(r => r._id);
  const guestMap = await buildGuestMap(roomIds);

  const enrich = (r) => ({
    ...buildRoomPayload(r),
    ...(guestMap[r._id.toString()] || { currentGuest: null, checkoutDate: null, reservationStatus: null }),
  });

  // Build floor-grouped summary for the FE RoomsPage
  const byFloor = rooms.reduce((acc, r) => {
    const f = r.floor;
    if (!acc[f]) acc[f] = [];
    acc[f].push(enrich(r));
    return acc;
  }, {});

  sendSuccess(
    res,
    200,
    'Rooms retrieved.',
    { rooms: rooms.map(enrich), byFloor },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/rooms/available
 * Returns rooms not blocked by an active reservation in the given date range.
 * Access: admin, manager, receptionist
 * Query: ?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&type=&maxGuests=
 * Note: once Module 5 (Reservations) is built this check is enforced via reservation overlap.
 */
exports.checkAvailability = catchAsync(async (req, res, next) => {
  const { checkIn, checkOut, type, maxGuests } = req.query;

  if (!checkIn || !checkOut) {
    return next(new AppError('checkIn and checkOut dates are required.', 400));
  }

  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate) || isNaN(checkOutDate)) {
    return next(new AppError('Invalid date format. Use YYYY-MM-DD.', 400));
  }
  if (checkInDate >= checkOutDate) {
    return next(new AppError('checkOut must be after checkIn.', 400));
  }

  const filter = { status: { $in: ['available', 'reserved'] }, isActive: true };
  if (type)      filter.type      = type;
  if (maxGuests) filter.maxGuests = { $gte: Number(maxGuests) };

  // Exclude rooms with overlapping reservations if the Reservation model exists
  let blockedRoomIds = [];
  try {
    const Reservation = mongoose.model('Reservation');
    const blocked = await Reservation.find({
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
      checkInDate:  { $lt: checkOutDate },
      checkOutDate: { $gt: checkInDate },
    }).distinct('room');
    blockedRoomIds = blocked;
  } catch (_) {
    // Reservation model not yet registered — skip overlap check
  }

  if (blockedRoomIds.length) {
    filter._id = { $nin: blockedRoomIds };
  }

  const rooms = await Room.find(filter).sort({ floor: 1, roomNumber: 1 });

  sendSuccess(res, 200, `${rooms.length} room(s) available.`, {
    checkIn,
    checkOut,
    nights: Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)),
    rooms: rooms.map(buildRoomPayload),
  });
});

/**
 * GET /api/rooms/status/:status
 * Access: all authenticated staff
 */
exports.getRoomsByStatus = catchAsync(async (req, res, next) => {
  const { status } = req.params;
  const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'];
  if (!validStatuses.includes(status)) {
    return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}.`, 400));
  }

  const rooms = await Room.find({ status, isActive: true }).sort({ floor: 1, roomNumber: 1 });

  sendSuccess(res, 200, `${rooms.length} room(s) with status "${status}".`, {
    status,
    rooms: rooms.map(buildRoomPayload),
  });
});

/**
 * GET /api/rooms/:id
 * Access: all authenticated staff
 */
exports.getRoomById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Room ID');

  const room = await Room.findById(req.params.id);
  if (!room) return next(new AppError('Room not found.', 404));

  const guestMap = await buildGuestMap([room._id]);
  const enriched = { ...buildRoomPayload(room), ...(guestMap[room._id.toString()] || {}) };

  sendSuccess(res, 200, 'Room retrieved.', { room: enriched });
});

/**
 * PATCH /api/rooms/:id
 * Access: admin, manager
 */
exports.updateRoom = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Room ID');

  const allowedFields = [
    'floor', 'type', 'maxGuests', 'rates',
    'view', 'smokingAllowed', 'amenities', 'description', 'images', 'isActive',
  ];

  const updateFields = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updateFields[field] = req.body[field];
  });

  // Room number change — check for conflicts
  if (req.body.roomNumber !== undefined) {
    const conflict = await Room.findOne({
      roomNumber: req.body.roomNumber.trim(),
      _id: { $ne: req.params.id },
    });
    if (conflict) {
      return next(new AppError(`Room number "${req.body.roomNumber}" is already in use.`, 400));
    }
    updateFields.roomNumber = req.body.roomNumber.trim();
  }

  if (Object.keys(updateFields).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const room = await Room.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  );
  if (!room) return next(new AppError('Room not found.', 404));

  sendSuccess(res, 200, `Room ${room.roomNumber} updated successfully.`, {
    room: buildRoomPayload(room),
  });
});

/**
 * PATCH /api/rooms/:id/status
 * Dedicated status update — called by housekeeping, maintenance, checkin/checkout flows.
 * Access: admin, manager, receptionist, housekeeping, maintenance
 */
exports.updateRoomStatus = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Room ID');

  const { status, statusNote, guestId, checkIn, checkOut } = req.body;
  const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'];

  if (!status) {
    return next(new AppError('Status is required.', 400));
  }
  if (!validStatuses.includes(status)) {
    return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}.`, 400));
  }

  const room = await Room.findById(req.params.id);
  if (!room) return next(new AppError('Room not found.', 404));

  const previousStatus = room.status;
  const staffName      = req.user?.name || req.user?.email || 'Staff';

  // Require a guest only when newly marking as occupied (not re-saving an already-occupied room)
  if (status === 'occupied' && previousStatus !== 'occupied' && !guestId) {
    return next(new AppError('A guest must be selected when marking a room as occupied.', 400));
  }

  room.status           = status;
  room.statusNote       = statusNote || null;
  room.lastStatusChange = new Date();
  await room.save({ validateBeforeSave: true });

  // When room stays occupied, update the active reservation with any new guest/date info
  if (status === 'occupied' && previousStatus === 'occupied' && (guestId || checkIn || checkOut)) {
    const activeRes = await Reservation.findOne({ room: room._id, status: 'checked-in' });
    if (activeRes) {
      if (guestId) activeRes.guest = guestId;
      if (checkIn)  activeRes.checkInDate  = new Date(checkIn);
      if (checkOut) {
        activeRes.checkOutDate = new Date(checkOut);
        const ciDate = checkIn ? new Date(checkIn) : activeRes.checkInDate;
        activeRes.nights = Math.max(1, Math.ceil((new Date(checkOut) - ciDate) / (1000 * 60 * 60 * 24)));
      }
      await activeRes.save({ validateBeforeSave: false });
    }
  }

  // When staff marks a room as occupied (new), create a walk-in checked-in reservation
  if (status === 'occupied' && previousStatus !== 'occupied' && guestId) {
    const guest = await Guest.findById(guestId);
    if (!guest) return next(new AppError('Guest not found.', 404));

    const checkInDate  = checkIn  ? new Date(checkIn)  : new Date();
    const checkOutDate = checkOut ? new Date(checkOut) : new Date(Date.now() + 86400000);
    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);
    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));

    const reservation = await Reservation.create({
      guest:        guest._id,
      room:         room._id,
      checkInDate,
      checkOutDate,
      nights,
      adults:       1,
      status:       'checked-in',
      source:       'direct',
      totalAmount:  room.rates?.standard || 0,
      depositPaid:  false,
      createdBy:    req.user?.id,
    });

    await GuestActivityLog.create({
      guest:       guest._id,
      reservation: reservation._id,
      eventType:   'checked_in',
      description: `Walk-in check-in to Room ${room.roomNumber} recorded by ${staffName}.`,
      performedBy: staffName,
    });
  }

  // When staff forces an occupied room back to available, cancel the active reservation
  if (previousStatus === 'occupied' && status === 'available') {
    const activeReservation = await Reservation.findOne({
      room:   room._id,
      status: 'checked-in',
    });
    if (activeReservation) {
      activeReservation.status = 'cancelled';
      await activeReservation.save({ validateBeforeSave: false });

      await GuestActivityLog.create({
        guest:       activeReservation.guest,
        reservation: activeReservation._id,
        eventType:   'staff_forced_available',
        description: `Room ${room.roomNumber} was released by staff (${statusNote || 'no reason given'}). Reservation cancelled.`,
        performedBy: staffName,
      });
    }
  }

  sendSuccess(res, 200, `Room ${room.roomNumber} status changed from "${previousStatus}" to "${status}".`, {
    room: buildRoomPayload(room),
  });
});

/**
 * DELETE /api/rooms/:id
 * Soft-delete by marking isActive = false.
 * Access: admin only
 */
exports.deleteRoom = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Room ID');

  const room = await Room.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!room) return next(new AppError('Room not found.', 404));

  sendSuccess(res, 200, `Room ${room.roomNumber} has been deactivated.`, {
    room: buildRoomPayload(room),
  });
});
